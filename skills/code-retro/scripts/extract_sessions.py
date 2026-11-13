#!/usr/bin/env python3
"""Extract the human-signal slice of agent session logs for one git branch.

Read-only on every log. Standard library only. Emits human turns, tool denials,
interrupts, question answers and a little nearby assistant text, each with its source
file and line. Ordinary tool output is left out. Log content is untrusted data: this
script never evaluates or follows it. Claude, Codex and OpenCode logs are read.

Verify mode (--verify <range-file> --line <n>) reads a quote on stdin and prints only
"match" or "no match", so a quote can be checked without reading the log.

See ../references/transcripts.md for the format facts this relies on.
"""
import argparse
import glob
import json
import os
import re
import shutil
import sqlite3
import subprocess
import sys
import tempfile
from collections import Counter
from pathlib import Path
from datetime import datetime, timedelta, timezone

HUMAN_MAX = 1200
ASSISTANT_MAX = 300
ANSWER_MAX = 500
TARGET_MAX = 120
DENIAL_MARKER = re.compile(r"the user said:\s*\n?", re.IGNORECASE)
DENIAL_BOILERPLATE = "The user doesn't want to proceed"
# origin.kind values known to be written by something other than the human
NON_HUMAN_KINDS = {"task-notification", "peer", "coordinator"}


def trunc(text, limit, tail=False):
    text = (text or "").strip()
    if len(text) <= limit:
        return text
    extra = len(text) - limit
    if tail:
        return "[%d more chars]..." % extra + text[-limit:]
    return text[:limit] + "...[%d more chars]" % extra


def list_worktrees(repo):
    """[(path, branch or None)] for the repo's git worktrees, main one first (empty if git
    is unavailable). A detached worktree has no branch."""
    try:
        out = subprocess.run(["git", "-C", repo, "worktree", "list", "--porcelain"],
                             capture_output=True, text=True, timeout=10).stdout
    except (OSError, subprocess.SubprocessError):
        return []
    found = []
    for line in out.splitlines():
        if line.startswith("worktree "):
            found.append([line[len("worktree "):], None])
        elif line.startswith("branch ") and found:
            found[-1][1] = line[len("branch "):].replace("refs/heads/", "", 1)
    return [tuple(w) for w in found]


def under(path, roots):
    return any(path == r or path.startswith(r.rstrip("/") + "/") for r in roots)


def encode_project_dir(path):
    return re.sub(r"[^A-Za-z0-9]", "-", path)


def claude_project_dirs(root, roots):
    """Project dirs for the repo, its in-repo worktrees, and any listed worktree."""
    if not os.path.isdir(root):
        return []
    enc = [encode_project_dir(p) for p in roots]
    found = []
    for name in sorted(os.listdir(root)):
        full = os.path.join(root, name)
        if not os.path.isdir(full):
            continue
        if any(name == e or name.startswith(e + "--") for e in enc):
            found.append(full)
    return found


def _json_obj(raw):
    """The JSON object in `raw`, or None for bad JSON and non-object values."""
    try:
        value = json.loads(raw)
    except (TypeError, ValueError, RecursionError):
        return None
    return value if isinstance(value, dict) else None


def _clean(value):
    return re.sub(r"[^\w.-]", "?", str(value))[:30]


def _printable(text):
    return re.sub(r"[\x00-\x1f\x7f-\x9f\u2028\u2029]", "?", text)


def _warn_count(warnings, found, template):
    """Add a counted warning. `found` is a number (template takes the count) or a Counter
    of names (template takes the count and the sorted names)."""
    if isinstance(found, Counter):
        if found:
            warnings.append(template % (sum(found.values()), ", ".join(sorted(found))))
    elif found:
        warnings.append(template % found)


def read_jsonl(path):
    """Rows by line. Bad JSON and non-object rows keep their slot as None."""
    with open(path, encoding="utf-8", errors="replace") as fh:
        return [_json_obj(line) for line in fh]


def short_target(inp):
    if not isinstance(inp, dict):
        return ""
    for key in ("command", "file_path", "path", "filePath", "pattern", "description"):
        if isinstance(inp.get(key), str):
            return trunc(inp[key], TARGET_MAX)
    return ""


class Collector:
    """Builds records in line order, adding nearby assistant text before each event."""

    def __init__(self, fname):
        self.fname = fname
        self.records = []
        self.pending_assistant = None

    def assistant(self, line, text):
        if text and text.strip():
            self.pending_assistant = (line, text)

    def event(self, kind, line, text, lead_in=False, **extra):
        if self.pending_assistant:
            aline, atext = self.pending_assistant
            self.pending_assistant = None
            self._add("assistant", aline, trunc(atext, ASSISTANT_MAX, tail=True), lead_in)
        self._add(kind, line, text, lead_in, **extra)

    def _add(self, kind, line, text, lead_in, **extra):
        rec = {"kind": kind, "file": self.fname, "line": line, "text": text}
        rec.update({k: v for k, v in extra.items() if v not in (None, "")})
        if lead_in:
            rec["lead_in"] = True
        self.records.append(rec)


# ---------------------------------------------------------------- Claude

def _blocks(row):
    msg = row.get("message")
    content = msg.get("content") if isinstance(msg, dict) else None
    if isinstance(content, str):
        return [{"type": "text", "text": content}]
    return [b for b in content if isinstance(b, dict)] if isinstance(content, list) else []


def _text_of(blocks):
    return "\n".join(b.get("text", "") for b in blocks if b.get("type") == "text"
                     and isinstance(b.get("text"), str))


def _branch(row):
    b = row.get("gitBranch") if row else None
    return b if isinstance(b, str) and b else None


def claude_ranges(rows, branch, base):
    """Return [(start, end, lead_in_start, borders_head)] using the per-line gitBranch."""
    segs = []  # [branch, first_line]
    for i, row in enumerate(rows, 1):
        if not row or row.get("isSidechain"):
            continue
        b = _branch(row)
        if b and (not segs or segs[-1][0] != b):
            segs.append([b, i])
    out = []
    for n, (b, first) in enumerate(segs):
        if b != branch:
            continue
        end = segs[n + 1][1] - 1 if n + 1 < len(segs) else len(rows)
        lead = segs[n - 1][1] if n > 0 and segs[n - 1][0] == base else None
        near = [segs[k][0] for k in (n - 1, n + 1) if 0 <= k < len(segs)]
        out.append((first, end, lead, "HEAD" in near))
    return out


def _claude_attachment(col, row, i, lead):
    """Human prompts queued while the agent was busy arrive as attachment rows."""
    att = row.get("attachment")
    if not isinstance(att, dict) or att.get("type") != "queued_command":
        return
    origin = att.get("origin")
    if not isinstance(origin, dict) or origin.get("kind") != "human":
        return
    prompt = att.get("prompt")
    if isinstance(prompt, str):
        text = prompt
    elif isinstance(prompt, list):
        text = _text_of([b for b in prompt if isinstance(b, dict)])
    else:
        text = ""
    text = text.strip()
    if text and not text.startswith("<task-notification"):
        col.event("human", i, trunc(text, HUMAN_MAX), lead)


def _claude_records(rows, fname, start, end, lead_start, roots, stats):
    names = {}
    for row in rows:
        if row and row.get("type") == "assistant":
            for b in _blocks(row):
                if b.get("type") == "tool_use" and isinstance(b.get("id"), str):
                    names[b["id"]] = (b.get("name"), b.get("input"))
    col = Collector(fname)
    lo = lead_start or start
    for i in range(lo, end + 1):
        row = rows[i - 1]
        if not row or row.get("isSidechain"):
            continue
        cwd = row.get("cwd")
        if isinstance(cwd, str) and cwd and not under(cwd, roots):
            stats["cwd_skipped"] += 1
            continue
        lead = i < start
        rtype = row.get("type")
        if rtype == "assistant":
            col.assistant(i, _text_of(_blocks(row)))
            continue
        if rtype == "attachment":
            _claude_attachment(col, row, i, lead)
            continue
        if rtype != "user":
            continue
        blocks = _blocks(row)
        results = [b for b in blocks if b.get("type") == "tool_result"]
        if results:
            _claude_result(col, row, results[0], names, i, lead)
            continue
        if row.get("isMeta") or row.get("isCompactSummary"):
            continue
        text = _text_of(blocks).strip()
        if not text:
            origin = row.get("origin")
            if not isinstance(origin, dict) or origin.get("kind") == "human":
                stats["no_text"] += 1
            continue
        if text.startswith("[Request interrupted by user"):
            col.event("interrupt", i, text, lead)
            continue
        origin = row.get("origin")
        if isinstance(origin, dict):
            kind = origin.get("kind")
            if kind != "human":
                if kind not in NON_HUMAN_KINDS:
                    stats["unknown_kinds"][_clean(kind)] += 1
                continue
        elif text.startswith("<"):
            continue
        col.event("human", i, trunc(text, HUMAN_MAX), lead)
    return col.records


def _claude_result(col, row, block, names, i, lead):
    tid = block.get("tool_use_id")
    name, inp = names.get(tid, (None, None)) if isinstance(tid, str) else (None, None)
    tur = row.get("toolUseResult")
    content = block.get("content")
    if not isinstance(content, str):
        content = _text_of([b for b in content if isinstance(b, dict)]) if isinstance(content, list) else ""
    denied = row.get("toolDenialKind") == "user-rejected" or tur == "User rejected tool use"
    if denied:
        m = DENIAL_MARKER.search(content)
        if m:
            text = content[m.end():].strip()
        elif content.startswith(DENIAL_BOILERPLATE):
            text = ""
        else:
            text = content
        col.event("denial", i, trunc(text, HUMAN_MAX), lead, tool=name, target=short_target(inp))
    elif name == "AskUserQuestion" and isinstance(tur, dict):
        parts = []
        notes = tur.get("annotations") if isinstance(tur.get("annotations"), dict) else {}
        answers = tur.get("answers") if isinstance(tur.get("answers"), dict) else {}
        for q, a in answers.items():
            piece = "%s => %s" % (trunc(str(q), 120), a)
            note = notes[q].get("notes") if isinstance(notes.get(q), dict) else None
            if note:
                piece += " (note: %s)" % note
            parts.append(piece)
        col.event("answer", i, trunc("; ".join(parts), ANSWER_MAX), lead)


def extract_claude(root, roots, branch, base):
    warnings = []
    dirs = claude_project_dirs(root, roots)
    stats = {"cwd_skipped": 0, "unknown_kinds": Counter(), "no_text": 0}
    ranges, scanned, skipped = [], 0, 0
    head_borders = head_only = no_branch = 0
    for d in dirs:
        skipped += len(glob.glob(os.path.join(d, "*", "subagents", "*.jsonl")))
        for path in sorted(glob.glob(os.path.join(d, "*.jsonl"))):
            scanned += 1
            try:
                rows = read_jsonl(path)
                branches = {_branch(r) for r in rows if r and not r.get("isSidechain")} - {None}
                if any(rows) and not branches:
                    no_branch += 1
                elif branches == {"HEAD"}:
                    head_only += 1
                found = []
                for start, end, lead, head in claude_ranges(rows, branch, base):
                    ts = rows[start - 1].get("timestamp")
                    head_borders += 1 if head else 0
                    found.append({"file": path, "start": start, "end": end, "lead_in_start": lead,
                                  "started": ts if isinstance(ts, str) else "",
                                  "records": _claude_records(rows, os.path.basename(path), start,
                                                             end, lead, roots, stats)})
            except Exception as exc:  # one bad file must not hide the others
                warnings.append("%s could not be read (%s)" % (os.path.basename(path),
                                                               type(exc).__name__))
                continue
            ranges += found
    _warn_count(warnings, head_borders, "%d branch range(s) border rows whose gitBranch is HEAD; "
                "sessions from a detached HEAD may be missing")
    _warn_count(warnings, head_only, "%d log file(s) hold only gitBranch HEAD rows and cannot be "
                "matched to the branch")
    _warn_count(warnings, no_branch, "%d log file(s) have rows but no gitBranch and cannot be "
                "matched to the branch")
    _warn_count(warnings, stats["unknown_kinds"], "%d user row(s) have an unknown origin.kind "
                "(%s) and were not treated as human")
    _warn_count(warnings, stats["no_text"], "%d user row(s) had no readable text")
    _warn_count(warnings, stats["cwd_skipped"], "%d row(s) skipped because their cwd is outside "
                "the repo and its worktrees")
    ranges.sort(key=lambda r: (r["started"], r["file"], r["start"]))
    notes = ["%d subagent log(s) skipped" % skipped] if skipped else []
    return {"ranges": ranges, "project_dirs": len(dirs), "files_scanned": scanned,
            "notes": notes, "warnings": warnings}


# ---------------------------------------------------------------- Codex

def _codex_text(payload):
    content = payload.get("content")
    if not isinstance(content, list):
        return ""
    return "\n".join(b.get("text", "") for b in content
                     if isinstance(b, dict) and isinstance(b.get("text"), str))


def _codex_records(rows, fname):
    names = {}
    for row in rows:
        p = (row or {}).get("payload")
        if isinstance(p, dict) and p.get("type") == "function_call" and isinstance(p.get("call_id"), str):
            names[p["call_id"]] = p.get("name")
    col = Collector(fname)
    for i, row in enumerate(rows, 1):
        p = (row or {}).get("payload")
        if not isinstance(p, dict):
            continue
        t = p.get("type")
        if row.get("type") == "response_item" and t == "message":
            text = _codex_text(p).strip()
            if p.get("role") == "assistant":
                col.assistant(i, text)
            elif p.get("role") == "user" and text and not text.startswith(("<", "# AGENTS.md")):
                col.event("human", i, trunc(text, HUMAN_MAX))
        elif row.get("type") == "event_msg" and t == "turn_aborted":
            col.event("interrupt", i, str(p.get("reason") or "interrupted"))
        elif (t == "function_call_output" and isinstance(p.get("call_id"), str)
              and names.get(p["call_id"]) == "request_user_input"):
            col.event("answer", i, trunc(str(p.get("output")), ANSWER_MAX))
    return col.records


def extract_codex(root, roots, branch):
    warnings = []
    ranges, scanned, bad_header = [], 0, 0
    for path in sorted(glob.glob(os.path.join(root, "**", "*.jsonl"), recursive=True)):
        try:
            with open(path, encoding="utf-8", errors="replace") as fh:
                first = json.loads(fh.readline())
        except OSError as exc:
            warnings.append("%s could not be read (%s)" % (os.path.basename(path), type(exc).__name__))
            continue
        except (ValueError, RecursionError):
            first = None
        meta = first.get("payload") if isinstance(first, dict) and first.get("type") == "session_meta" else None
        if not isinstance(meta, dict):
            bad_header += 1
            continue
        scanned += 1
        git = meta.get("git") if isinstance(meta.get("git"), dict) else {}
        if (git.get("branch") != branch or isinstance(meta.get("source"), dict)
                or meta.get("thread_source") == "automation"
                or not under(str(meta.get("cwd") or ""), roots)):
            continue
        try:
            rows = read_jsonl(path)
            records = _codex_records(rows, os.path.basename(path))
        except Exception as exc:  # one bad file must not hide the others
            warnings.append("%s could not be read (%s)" % (os.path.basename(path), type(exc).__name__))
            continue
        ts = meta.get("timestamp")
        ranges.append({"file": path, "start": 1, "end": len(rows), "lead_in_start": None,
                       "started": ts if isinstance(ts, str) else "", "records": records})
    _warn_count(warnings, bad_header, "%d .jsonl file(s) skipped for an unrecognised header")
    ranges.sort(key=lambda r: (r["started"], r["file"]))
    return {"ranges": ranges, "project_dirs": 0, "files_scanned": scanned,
            "notes": ["the branch match is approximate (the branch is recorded once, not per "
                      "turn).", "Codex tool denials are not extracted"],
            "warnings": warnings}


# ---------------------------------------------------------------- OpenCode

OC_TYPES = {"user", "assistant", "synthetic", "system", "compaction", "idle",
            "agent-switched", "model-switched"}
DISMISSED = "The user dismissed"
RULE_REFUSAL = "The user has specified a rule which prevents"
OC_ERRORS = {"tool.execution", "tool.interrupted", "aborted", "unknown"}
EPOCH = datetime(1970, 1, 1, tzinfo=timezone.utc)
DATE_ONLY = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _parse_time(text, end_of_day):
    """Epoch ms from an ISO date or datetime. A trailing Z is accepted (Python 3.9 rejects it)
    and a missing offset means UTC. A date-only value is the start of that day, or its end."""
    text = text.strip()
    # accept git's %ai form too: a space for the T, a space before the offset, +HHMM
    text = re.sub(r"^(\d{4}-\d{2}-\d{2}) (?=\d)", r"\1T", text)
    text = re.sub(r"\s+([+-]\d{2}:?\d{2})$", r"\1", text)
    text = re.sub(r"([+-]\d{2})(\d{2})$", r"\1:\2", text)
    try:
        dt = datetime.fromisoformat(text[:-1] + "+00:00" if text.endswith(("Z", "z")) else text)
    except ValueError:
        raise argparse.ArgumentTypeError("not an ISO date or datetime: %r" % text[:40])
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    ms = (dt - EPOCH) // timedelta(milliseconds=1)
    if end_of_day and DATE_ONLY.match(text):
        ms += 24 * 3600 * 1000 - 1
    return ms


def parse_since(text):
    return _parse_time(text, False)


def parse_until(text):
    return _parse_time(text, True)


def iso_ms(ms):
    try:
        return datetime.fromtimestamp(ms / 1000, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    except (OverflowError, OSError, ValueError):
        return ""


def _is_int(v):
    return isinstance(v, int) and not isinstance(v, bool)


def _oc_answers(answers):
    parts = []
    for a in answers:
        parts.append(", ".join(str(x) for x in a) if isinstance(a, list) else str(a))
    return "; ".join(parts)


def _oc_assistant(col, seq, data, stats):
    content = data.get("content")
    interrupted = False
    for item in content if isinstance(content, list) else []:
        if not isinstance(item, dict):
            continue
        if item.get("type") == "text" and isinstance(item.get("text"), str):
            col.assistant(seq, item["text"])
        elif item.get("type") == "tool" and isinstance(item.get("state"), dict):
            state = item["state"]
            name = item.get("name") if isinstance(item.get("name"), str) else None
            meta = state.get("metadata")
            answers = meta.get("answers") if isinstance(meta, dict) else None
            if name == "question" and isinstance(answers, list):
                col.event("answer", seq, trunc(_oc_answers(answers), ANSWER_MAX))
            err = state.get("error")
            if not isinstance(err, dict):
                continue
            etype, msg = err.get("type"), err.get("message")
            msg = msg if isinstance(msg, str) else ""
            if etype == "tool.execution":
                if name == "question" and msg.startswith(DISMISSED):
                    col.event("answer", seq, "(dismissed)")
                elif msg.startswith(RULE_REFUSAL):
                    # a configured permission rule refused the call, not a live human choice
                    col.event("denial", seq, trunc(msg, HUMAN_MAX), tool=name, rule=True,
                              target=short_target(state.get("input")))
                # All 185 matches seen in real logs were permission or question rejections
                # (for example PermissionRejectedError, QuestionRejectedError).
                elif "reject" in msg.lower():
                    col.event("denial", seq, trunc(msg, HUMAN_MAX), tool=name,
                              target=short_target(state.get("input")))
            elif etype in ("tool.interrupted", "aborted"):
                if not interrupted:
                    col.event("interrupt", seq, etype)
                    interrupted = True
            elif etype not in OC_ERRORS:
                stats["unknown_errors"][_clean(etype)] += 1
    err = data.get("error")
    if isinstance(err, dict):
        if err.get("type") == "aborted":
            if not interrupted:
                col.event("interrupt", seq, "aborted")
        elif err.get("type") not in OC_ERRORS and err.get("type") is not None:
            stats["unknown_errors"][_clean(err.get("type"))] += 1


def _opencode_records(rows, fname, stats):
    col = Collector(fname)
    for seq, mtype, raw in rows:
        if not _is_int(seq):
            continue
        if mtype not in OC_TYPES:
            stats["unknown_types"][_clean(mtype)] += 1
            continue
        data = _json_obj(raw)
        if mtype == "user":
            text = data.get("text") if data else None
            if isinstance(text, str) and text.strip():
                col.event("human", seq, trunc(text, HUMAN_MAX))
            else:
                stats["no_text"] += 1
            continue
        if data is not None and mtype == "assistant":
            _oc_assistant(col, seq, data, stats)
    return col.records


# review-decision: OpenCode sessions are matched by window overlap and every message in them is read — sessions are short-lived in practice, so out-of-window messages are rare. Reconsider if resumed long-running sessions become common or a retro reports Corrections from outside the branch's window.
def _in_window(created, updated, since, until):
    if not _is_int(created):
        return True  # cannot be placed in the window; run() warns about the missing start
    updated = updated if _is_int(updated) else created
    return (until is None or created <= until) and (since is None or updated >= since)


def _opencode_uri(path):
    """Read-only URI. With no side files, immutable=1 stops SQLite creating -wal/-shm files
    when it opens a WAL-mode database."""
    uri = Path(os.path.abspath(path)).as_uri() + "?mode=ro"
    if not (os.path.exists(path + "-wal") or os.path.exists(path + "-shm")):
        uri += "&immutable=1"
    return uri


def _opencode_session(conn, path, sid, directory, created):
    rows = conn.execute("SELECT seq, type, data FROM session_message "
                        "WHERE session_id = ? ORDER BY seq", (sid,)).fetchall()
    seqs = [r[0] for r in rows if _is_int(r[0])]
    stats = {"unknown_types": Counter(), "unknown_errors": Counter(), "no_text": 0}
    records = _opencode_records(rows, "%s#%s" % (os.path.basename(path), sid), stats)
    return {"file": "%s#%s" % (path, sid), "start": min(seqs, default=0),
            "end": max(seqs, default=0), "lead_in_start": None, "dir": directory,
            "started": iso_ms(created) if _is_int(created) else "", "records": records}, stats


def _opencode_db(path, roots, skip, since, until, stats):
    """(ranges, subagents skipped), or None when the database has no session_v2 table.
    A session that cannot be read is counted in stats["failed"], not fatal."""
    conn = sqlite3.connect(_opencode_uri(path), uri=True)
    try:
        conn.text_factory = lambda b: b.decode("utf-8", "replace")
        found = conn.execute("SELECT name FROM sqlite_master WHERE type = ? AND name = ?",
                             ("table", "session_v2")).fetchone()
        if not found:
            return None
        sessions = conn.execute("SELECT id, parent_id, directory, time_created, time_updated "
                                "FROM session_v2").fetchall()
        ranges, subagents = [], 0
        for sid, parent, directory, created, updated in sessions:
            if (not isinstance(sid, str) or not isinstance(directory, str)
                    or not under(directory, roots) or under(directory, skip)
                    or not _in_window(created, updated, since, until)):
                continue
            if parent:
                subagents += 1
                continue
            try:
                rng, got = _opencode_session(conn, path, sid, directory, created)
            except Exception as exc:  # one bad session must not hide the others
                stats["failed"][type(exc).__name__] += 1
                continue
            for key, counter in got.items():
                stats[key] += counter
            ranges.append(rng)
        return ranges, subagents
    finally:
        conn.close()


def extract_opencode(root, roots, skip, since=None, until=None):
    """`skip` holds the directories of linked worktrees checked out on another branch."""
    warnings = []
    stats = {"unknown_types": Counter(), "unknown_errors": Counter(), "no_text": 0,
             "failed": Counter()}
    ranges, scanned, subagents = [], 0, 0
    for path in sorted(glob.glob(os.path.join(root, "*.db"))):
        name = os.path.basename(path)
        if os.path.exists(path + "-wal") and not os.path.exists(path + "-shm"):
            warnings.append("%s has a WAL file but no -shm file and was skipped" % name)
            continue
        try:
            got = _opencode_db(path, roots, skip, since, until, stats)
        except Exception as exc:  # one bad database must not hide the others
            warnings.append("%s could not be read (%s)" % (name, type(exc).__name__))
            continue
        if got is None:
            warnings.append("%s has no session_v2 table and was skipped" % name)
            continue
        scanned += 1
        ranges += got[0]
        subagents += got[1]
    if since is None and until is None:
        warnings.append("no --since/--until given, so every top-level session in the repo "
                        "directories matched")
    _warn_count(warnings, stats["unknown_types"],
                "%d message(s) have an unknown type (%s) and were skipped")
    _warn_count(warnings, stats["unknown_errors"],
                "%d error(s) have an unknown type (%s) and were not read")
    _warn_count(warnings, stats["no_text"], "%d user row(s) had no readable text")
    _warn_count(warnings, stats["failed"], "%d session(s) could not be read (%s)")
    ranges.sort(key=lambda r: (r["started"], r["file"]))
    notes = ["the branch match is approximate (OpenCode records no branch; sessions are matched "
             "by directory and time window)."]
    if subagents:
        notes.append("%d subagent session(s) skipped" % subagents)
    return {"ranges": ranges, "project_dirs": 0, "files_scanned": scanned,
            "notes": notes, "warnings": warnings}


# ---------------------------------------------------------------- CLI

DEFAULT_ROOTS = {"claude": "~/.claude/projects", "codex": "~/.codex/sessions",
                 "opencode": "~/.local/share/opencode"}


def describe(r):
    where = "%s:%d-%d" % (r["file"], r["start"], r["end"])
    if r["lead_in_start"]:
        where += " (lead-in from line %d)" % r["lead_in_start"]
    if r.get("dir"):
        where += " (dir: %s)" % r["dir"][:200]
    return _printable(where)


def _norm(s):
    return " ".join(s.split())


def verify(range_file, line, quote):
    """True if the quote is a substring of the text of the human-signal record at source
    line `line`. Assistant records are context and never match. Raises OSError if the range
    file cannot be read."""
    q = _norm(quote)
    if not q:
        return False
    with open(range_file, encoding="utf-8", errors="replace") as fh:
        for raw in fh:
            rec = _json_obj(raw)
            if (rec and rec.get("line") == line and rec.get("kind") != "assistant"
                    and isinstance(rec.get("text"), str) and q in _norm(rec["text"])):
                return True
    return False


def _write_ranges(out, useful):
    files, total = [], 0
    for n, r in enumerate(useful, 1):
        path = os.path.join(out, "range-%03d.jsonl" % n)
        body = "".join(json.dumps(rec, ensure_ascii=False, separators=(",", ":")) + "\n"
                       for rec in r["records"])
        data = body.encode("utf-8", "backslashreplace")
        with open(path, "wb") as fh:
            fh.write(data)
        total += len(data)
        files.append(path)
    return files, total


def run(args):
    repo = os.path.abspath(os.path.expanduser(args.repo))
    root = os.path.expanduser(args.projects_dir or DEFAULT_ROOTS[args.harness])
    worktrees = list_worktrees(repo)
    roots = [repo] + [path for path, _ in worktrees]
    if args.harness == "claude":
        res = extract_claude(root, roots, args.branch, args.base)
    elif args.harness == "opencode":
        # linked worktrees (not the first, main one) on a different branch are not this branch's
        other = [path for n, (path, br) in enumerate(worktrees) if n and br and br != args.branch]
        res = extract_opencode(root, roots, other, args.since, args.until)
    else:
        res = extract_codex(root, roots, args.branch)
    warnings = [] if os.path.isdir(root) else ["log root %s does not exist" % root]
    warnings += res["warnings"]
    starts = sorted(r["started"] for r in res["ranges"] if r["started"])
    _warn_count(warnings, sum(1 for r in res["ranges"] if not r["started"]),
                "%d range(s) have no timestamp, so range start is unknown")

    useful = [r for r in res["ranges"] if r["records"]]
    lines = []
    if not res["ranges"]:
        lines.append("RESULT: no sessions found")
        lines.append("harness: %s | repo: %s | branch: %s | log root: %s" % (
            args.harness, repo, args.branch, root))
        lines.append("scanned %d log files in %d project dirs; none matched the branch."
                     % (res["files_scanned"], res["project_dirs"]))
        lines.append("range start: none")
        lines += ["note: " + n for n in res["notes"]]
        lines += ["warning: " + w for w in warnings]
        lines.append("Fall back to git, PR and review evidence only.")
        print("\n".join(lines))
        return 0

    out = os.path.abspath(tempfile.mkdtemp(prefix="code-retro-"))
    try:  # on any failure the caller gets no output: line, so remove what was written
        files, total = _write_ranges(out, useful)
        lines.append("RESULT: sessions found")
        lines.append("harness: %s | repo: %s | branch: %s" % (args.harness, repo, args.branch))
        lines.append("output: %s (%d bytes in %d range files)" % (out, total, len(useful)))
        for path, r in zip(files, useful):
            lines.append("  %s  %s  records=%d" % (path, describe(r), len(r["records"])))
        for r in res["ranges"]:
            if not r["records"]:
                lines.append("  (no human-signal records) %s" % describe(r))
        lines.append("range start: earliest %s | latest %s" % (
            (starts[0], starts[-1]) if starts else ("unknown", "unknown")))
        cov = "coverage: %d log files scanned" % res["files_scanned"]
        if res["project_dirs"]:
            cov += " in %d project dirs" % res["project_dirs"]
        lines.append(cov + "; %d matched ranges" % len(res["ranges"]))
        lines += ["note: " + n for n in res["notes"]]
        lines += ["warning: " + w for w in warnings]
        print("\n".join(lines))
    except BaseException:
        shutil.rmtree(out, ignore_errors=True)
        raise
    return 0


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--repo", help="path to the repository")
    ap.add_argument("--branch")
    ap.add_argument("--base", default="main", help="base branch whose contiguous lead-in is included (Claude)")
    ap.add_argument("--harness", choices=sorted(DEFAULT_ROOTS), default="claude")
    ap.add_argument("--projects-dir", help="override the log root (for fixtures)")
    ap.add_argument("--since", type=parse_since, metavar="WHEN",
                    help="OpenCode: only sessions active at or after this ISO date or datetime")
    ap.add_argument("--until", type=parse_until, metavar="WHEN",
                    help="OpenCode: only sessions started at or before this; a date means "
                         "the end of that day")
    ap.add_argument("--verify", metavar="RANGE_FILE",
                    help="verify mode: read a quote on stdin, print match or no match")
    ap.add_argument("--line", type=int, help="with --verify: the cited source line")
    args = ap.parse_args(argv)

    if args.verify:
        if args.line is None:
            ap.error("--verify needs --line")
        try:
            found = verify(args.verify, args.line, sys.stdin.read())
        except OSError:
            print("error: cannot read range file")
            return 1
        print("match" if found else "no match")
        return 0
    if not (args.repo and args.branch):
        ap.error("--repo and --branch are required")
    try:
        return run(args)
    except Exception as exc:  # always give the caller a RESULT line
        print("RESULT: extractor error")
        print("error: %s" % type(exc).__name__)
        print("Do not open the logs. Fall back to git, PR and review evidence only.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
