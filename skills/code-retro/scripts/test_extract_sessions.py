"""Tests for extract_sessions.py. All data is synthetic and built inline."""
import contextlib
import io
import json
import os
import shutil
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from datetime import datetime, timezone
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import extract_sessions as ex  # noqa: E402

REPO = "/work/proj"
ENC = "-work-proj"


def write_jsonl(path, rows):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as fh:
        for r in rows:
            fh.write(json.dumps(r) + "\n")


def run_main(argv, stdin=""):
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf), mock.patch.object(sys, "stdin", io.StringIO(stdin)), \
            mock.patch.object(ex, "list_worktrees", return_value=[]):
        code = ex.main(argv)
    return code, buf.getvalue()


def output_dir(text):
    line = [l for l in text.splitlines() if l.startswith("output: ")][0]
    return line[len("output: "):].split(" (")[0]


def cl_user(text, branch, **kw):
    d = {"type": "user", "isSidechain": False, "gitBranch": branch,
         "origin": {"kind": "human"}, "message": {"role": "user", "content": text}}
    d.update(kw)
    return d


def cl_assistant_text(text, branch):
    return {"type": "assistant", "isSidechain": False, "gitBranch": branch,
            "message": {"role": "assistant", "content": [{"type": "text", "text": text}]}}


def cl_tool_use(tid, name, inp, branch):
    return {"type": "assistant", "isSidechain": False, "gitBranch": branch,
            "message": {"role": "assistant",
                        "content": [{"type": "tool_use", "id": tid, "name": name, "input": inp}]}}


def cl_tool_result(tid, content, branch, **kw):
    d = {"type": "user", "isSidechain": False, "gitBranch": branch,
         "message": {"role": "user",
                     "content": [{"type": "tool_result", "tool_use_id": tid, "content": content}]}}
    d.update(kw)
    return d


class ClaudeTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = self.tmp.name
        self.pdir = os.path.join(self.root, ENC)

    def tearDown(self):
        self.tmp.cleanup()

    def run_claude(self, branch="feat/x", base="main", worktrees=()):
        return ex.extract_claude(self.root, [REPO] + list(worktrees), branch, base)

    def kinds(self, result):
        return [(r["kind"], r["line"]) for rg in result["ranges"] for r in rg["records"]]

    def test_project_dirs_cover_repo_and_worktrees_only(self):
        for name in (ENC, ENC + "--worktrees-foo", ENC + "-other", "-elsewhere"):
            os.makedirs(os.path.join(self.root, name))
        found = sorted(os.path.basename(p) for p in ex.claude_project_dirs(self.root, [REPO]))
        self.assertEqual(found, sorted([ENC, ENC + "--worktrees-foo"]))

    def test_ranges_follow_git_branch_with_lead_in(self):
        rows = [
            cl_user("on main before", "main"),            # 1 lead-in
            cl_user("still main", "main"),                # 2 lead-in
            cl_user("on branch", "feat/x"),               # 3
            cl_user("elsewhere", "feat/other"),           # 4 excluded
            cl_user("back on branch", "feat/x"),          # 5 second range
        ]
        write_jsonl(os.path.join(self.pdir, "s1.jsonl"), rows)
        res = self.run_claude()
        rngs = res["ranges"]
        self.assertEqual([(r["start"], r["end"]) for r in rngs], [(3, 3), (5, 5)])
        self.assertEqual(rngs[0]["lead_in_start"], 1)
        self.assertIsNone(rngs[1]["lead_in_start"])
        texts = [r["text"] for rg in rngs for r in rg["records"] if r["kind"] == "human"]
        self.assertEqual(texts, ["on main before", "still main", "on branch", "back on branch"])
        self.assertTrue(all(r["file"].endswith("s1.jsonl") for rg in rngs for r in rg["records"]))

    def test_no_match_means_no_ranges(self):
        write_jsonl(os.path.join(self.pdir, "s1.jsonl"), [cl_user("hi", "main")])
        self.assertEqual(self.run_claude()["ranges"], [])

    def test_human_filtering(self):
        rows = [
            cl_user("real prompt", "feat/x"),
            cl_user("meta", "feat/x", isMeta=True),
            cl_user("<command-name>/clear</command-name>", "feat/x", origin=None),
            cl_user("coordinator note", "feat/x", origin={"kind": "coordinator"}),
            cl_user("legacy prompt without origin", "feat/x", origin=None),
            cl_user("sidechain prompt", "feat/x", isSidechain=True, userType="external"),
            cl_user("[Request interrupted by user]", "feat/x", origin=None),
        ]
        write_jsonl(os.path.join(self.pdir, "s1.jsonl"), rows)
        recs = self.run_claude()["ranges"][0]["records"]
        got = [(r["kind"], r["text"]) for r in recs]
        self.assertEqual(got, [("human", "real prompt"),
                               ("human", "legacy prompt without origin"),
                               ("interrupt", "[Request interrupted by user]")])

    def test_subagent_logs_are_skipped_and_counted(self):
        write_jsonl(os.path.join(self.pdir, "s1.jsonl"), [cl_user("keep", "feat/x")])
        write_jsonl(os.path.join(self.pdir, "s1", "subagents", "agent-a.jsonl"),
                    [cl_user("parent prompt to subagent", "feat/x", isSidechain=True)])
        res = self.run_claude()
        self.assertEqual(res["notes"], ["1 subagent log(s) skipped"])
        flat = json.dumps(res["ranges"])
        self.assertNotIn("parent prompt to subagent", flat)

    def test_question_answers_found_by_tool_name_not_wording(self):
        rows = [
            cl_tool_use("t1", "AskUserQuestion", {"questions": []}, "feat/x"),
            cl_tool_result("t1", "totally different wording", "feat/x",
                           toolUseResult={"answers": {"Which one?": "Option B"},
                                          "annotations": {"Which one?": {"notes": "because reasons"}}}),
            cl_tool_use("t2", "Bash", {"command": "ls"}, "feat/x"),
            cl_tool_result("t2", 'Your questions have been answered: "a"="b"', "feat/x",
                           toolUseResult={"stdout": "x"}),
        ]
        write_jsonl(os.path.join(self.pdir, "s1.jsonl"), rows)
        recs = self.run_claude()["ranges"][0]["records"]
        answers = [r for r in recs if r["kind"] == "answer"]
        self.assertEqual(len(answers), 1)
        self.assertEqual(answers[0]["line"], 2)
        self.assertIn("Option B", answers[0]["text"])
        self.assertIn("because reasons", answers[0]["text"])

    def test_denial_marked_by_kind_and_reason_from_later_text(self):
        boiler = ("The user doesn't want to proceed with this tool use. STOP.")
        with_words = boiler + " To tell you how to proceed, the user said:\nuse the other file"
        rows = [
            cl_assistant_text("I will edit the file now", "feat/x"),
            cl_tool_use("t1", "Edit", {"file_path": "/a/b.py"}, "feat/x"),
            cl_tool_result("t1", boiler, "feat/x", toolDenialKind="user-rejected",
                           toolUseResult="User rejected tool use"),
            cl_user("no, do the thing differently", "feat/x"),
            cl_tool_use("t2", "Bash", {"command": "rm x"}, "feat/x"),
            cl_tool_result("t2", with_words, "feat/x", toolDenialKind="user-rejected"),
            cl_tool_use("t3", "Bash", {"command": "false"}, "feat/x"),
            cl_tool_result("t3", "exit 1", "feat/x", toolUseResult="x"),  # ordinary failure
        ]
        write_jsonl(os.path.join(self.pdir, "s1.jsonl"), rows)
        recs = self.run_claude()["ranges"][0]["records"]
        den = [r for r in recs if r["kind"] == "denial"]
        self.assertEqual([d["tool"] for d in den], ["Edit", "Bash"])
        self.assertNotIn("next_human_line", den[0])
        self.assertNotIn("doesn't want", den[0]["text"])
        self.assertEqual(den[1]["text"], "use the other file")
        # nearby assistant text precedes the first event, truncated, with its own line
        asst = [r for r in recs if r["kind"] == "assistant"]
        self.assertEqual(asst[0]["line"], 1)
        # ordinary tool output never appears
        self.assertNotIn("exit 1", json.dumps(recs))

    def test_long_text_is_truncated(self):
        write_jsonl(os.path.join(self.pdir, "s1.jsonl"), [
            cl_assistant_text("a" * 5000, "feat/x"),
            cl_user("b" * 5000, "feat/x"),
        ])
        recs = self.run_claude()["ranges"][0]["records"]
        for r in recs:
            self.assertLess(len(r["text"]), 1500)
            self.assertIn("more chars", r["text"])
        asst = [r for r in recs if r["kind"] == "assistant"][0]
        self.assertLess(len(asst["text"]), 450)

    def test_bad_json_lines_are_skipped(self):
        os.makedirs(self.pdir)
        with open(os.path.join(self.pdir, "s1.jsonl"), "w") as fh:
            fh.write("{not json\n")
            fh.write(json.dumps(cl_user("ok", "feat/x")) + "\n")
        res = self.run_claude()
        self.assertEqual(res["ranges"][0]["records"][0]["line"], 2)

    def test_non_dict_json_keeps_its_line_slot(self):
        os.makedirs(self.pdir)
        with open(os.path.join(self.pdir, "s1.jsonl"), "w") as fh:
            fh.write('[1, 2]\n42\n"str"\n')
            fh.write(json.dumps(cl_user("ok", "feat/x")) + "\n")
        res = self.run_claude()
        self.assertEqual(res["ranges"][0]["records"][0]["line"], 4)

    def test_odd_shapes_do_not_abort(self):
        rows = [
            cl_tool_use("t1", "AskUserQuestion", {}, "feat/x"),
            cl_tool_result("t1", "x", "feat/x", toolUseResult={"answers": ["not", "a", "dict"]}),
            cl_tool_result(["unhashable"], "x", "feat/x"),
            cl_user("fine", "feat/x"),
        ]
        write_jsonl(os.path.join(self.pdir, "s1.jsonl"), rows)
        recs = self.run_claude()["ranges"][0]["records"]
        self.assertEqual([r["text"] for r in recs if r["kind"] == "human"], ["fine"])

    def test_list_form_tool_result_content_is_read_for_denials(self):
        rows = [
            cl_tool_use("t1", "Bash", {"command": "ls"}, "feat/x"),
            cl_tool_result("t1", [{"type": "text", "text": "The user doesn't want to proceed. "
                                   "the user said:\nuse make"}, "junk"], "feat/x",
                           toolDenialKind="user-rejected"),
        ]
        write_jsonl(os.path.join(self.pdir, "s1.jsonl"), rows)
        recs = self.run_claude()["ranges"][0]["records"]
        self.assertEqual([(r["kind"], r["text"]) for r in recs if r["kind"] == "denial"],
                         [("denial", "use make")])

    def test_queued_command_attachment_is_human(self):
        def att(prompt, kind="human"):
            return {"type": "attachment", "isSidechain": False, "gitBranch": "feat/x",
                    "attachment": {"type": "queued_command", "prompt": prompt, "humanTurn": True,
                                   "origin": {"kind": kind}}}
        rows = [att("queued words"),
                att([{"type": "text", "text": "block words"}]),
                att("<task-notification>done</task-notification>"),
                att("agent chatter", kind="task-notification")]
        write_jsonl(os.path.join(self.pdir, "s1.jsonl"), rows)
        recs = self.run_claude()["ranges"][0]["records"]
        self.assertEqual([(r["kind"], r["line"], r["text"]) for r in recs],
                         [("human", 1, "queued words"), ("human", 2, "block words")])

    def test_compact_summary_skipped_and_pasted_content_kept(self):
        rows = [cl_user("summary of the session", "feat/x", isCompactSummary=True),
                cl_user("<pasted_content id=1>stack trace</pasted_content> fix this", "feat/x")]
        write_jsonl(os.path.join(self.pdir, "s1.jsonl"), rows)
        recs = self.run_claude()["ranges"][0]["records"]
        self.assertEqual([r["line"] for r in recs], [2])
        self.assertTrue(recs[0]["text"].startswith("<pasted_content"))

    def test_unknown_origin_kind_warns_known_kinds_do_not(self):
        rows = [cl_user("a", "feat/x", origin={"kind": "weird"}),
                cl_user("b", "feat/x", origin={"kind": "peer"}),
                cl_user("c", "feat/x", origin={"kind": "task-notification"}),
                cl_user("d", "feat/x")]
        write_jsonl(os.path.join(self.pdir, "s1.jsonl"), rows)
        warn = [w for w in self.run_claude()["warnings"] if "origin.kind" in w]
        self.assertEqual(len(warn), 1)
        self.assertIn("1 user row", warn[0])
        self.assertIn("weird", warn[0])

    def test_user_rows_without_text_warn(self):
        rows = [cl_user("fine", "feat/x"),
                cl_user("", "feat/x", message={"role": "user", "content": [{"type": "image"}]}),
                cl_user("", "feat/x", origin={"kind": "peer"},
                        message={"role": "user", "content": []})]
        write_jsonl(os.path.join(self.pdir, "s1.jsonl"), rows)
        self.assertIn("1 user row(s) had no readable text", self.run_claude()["warnings"])

    def test_no_gitbranch_warns(self):
        write_jsonl(os.path.join(self.pdir, "s1.jsonl"), [{"type": "user", "message": {}}])
        self.assertTrue(any("no gitBranch" in w for w in self.run_claude()["warnings"]))

    def test_head_rows_warn(self):
        write_jsonl(os.path.join(self.pdir, "s1.jsonl"),
                    [cl_user("x", "HEAD"), cl_user("y", "feat/x")])
        write_jsonl(os.path.join(self.pdir, "s2.jsonl"), [cl_user("z", "HEAD")])
        warns = self.run_claude()["warnings"]
        self.assertTrue(any("border rows whose gitBranch is HEAD" in w for w in warns))
        self.assertTrue(any("only gitBranch HEAD" in w for w in warns))

    def test_cwd_outside_roots_is_skipped_with_warning(self):
        rows = [cl_user("inside", "feat/x", cwd=REPO + "/sub"),
                cl_user("outside", "feat/x", cwd="/elsewhere"),
                cl_user("worktree", "feat/x", cwd="/work/proj-wt")]
        write_jsonl(os.path.join(self.pdir, "s1.jsonl"), rows)
        res = self.run_claude(worktrees=["/work/proj-wt"])
        self.assertEqual([r["text"] for r in res["ranges"][0]["records"]], ["inside", "worktree"])
        self.assertTrue(any("cwd is outside" in w for w in res["warnings"]))

    def test_non_empty_worktree_list_adds_project_dirs(self):
        write_jsonl(os.path.join(self.root, "-work-proj-wt", "s1.jsonl"), [cl_user("wt", "feat/x")])
        self.assertEqual(self.run_claude()["ranges"], [])
        self.assertEqual(len(self.run_claude(worktrees=["/work/proj-wt"])["ranges"]), 1)



class CodexTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = self.tmp.name

    def tearDown(self):
        self.tmp.cleanup()

    def session(self, name, branch, cwd=REPO, source="cli", extra=()):
        meta = {"type": "session_meta", "payload": {
            "cwd": cwd, "source": source, "git": {"branch": branch, "repository_url": "x"}}}
        rows = [meta,
                {"type": "response_item", "payload": {"type": "message", "role": "user",
                    "content": [{"type": "input_text", "text": "# AGENTS.md instructions for x"}]}},
                {"type": "response_item", "payload": {"type": "message", "role": "assistant",
                    "content": [{"type": "output_text", "text": "working on it"}]}},
                {"type": "response_item", "payload": {"type": "message", "role": "user",
                    "content": [{"type": "input_text", "text": "please change approach"}]}},
                {"type": "event_msg", "payload": {"type": "turn_aborted", "reason": "interrupted"}},
                {"type": "response_item", "payload": {"type": "function_call",
                    "name": "request_user_input", "call_id": "c1", "arguments": "{}"}},
                {"type": "response_item", "payload": {"type": "function_call_output",
                    "call_id": "c1", "output": json.dumps({"answers": {"q": {"answers": ["yes"]}}})}},
                {"type": "response_item", "payload": {"type": "function_call_output",
                    "call_id": "other", "output": "ordinary output"}}] + list(extra)
        write_jsonl(os.path.join(self.root, "2026", "01", "01", name + ".jsonl"), rows)

    def test_matches_branch_and_repo_and_extracts(self):
        self.session("a", "feat/x")
        self.session("b", "main")
        self.session("c", "feat/x", cwd="/elsewhere")
        self.session("d", "feat/x", source={"subagent": {"thread_spawn": {}}})
        res = ex.extract_codex(self.root, [REPO], "feat/x")
        self.assertEqual(len(res["ranges"]), 1)
        recs = res["ranges"][0]["records"]
        self.assertEqual([r["kind"] for r in recs],
                         ["assistant", "human", "interrupt", "answer"])
        self.assertEqual(recs[1]["text"], "please change approach")
        self.assertEqual(recs[1]["line"], 4)
        self.assertIn("yes", recs[3]["text"])
        self.assertNotIn("ordinary output", json.dumps(recs))
        self.assertTrue(any("approximate" in n for n in res["notes"]))

    def test_unrecognised_header_warns(self):
        self.session("a", "feat/x")
        write_jsonl(os.path.join(self.root, "junk.jsonl"), [["not", "a", "dict"]])
        with open(os.path.join(self.root, "empty.jsonl"), "w"):
            pass
        res = ex.extract_codex(self.root, [REPO], "feat/x")
        self.assertTrue(any("2 .jsonl file(s) skipped" in w for w in res["warnings"]))

    def test_worktree_cwd_matches_with_non_empty_list(self):
        self.session("a", "feat/x", cwd="/work/proj-wt")
        self.assertEqual(ex.extract_codex(self.root, [REPO], "feat/x")["ranges"], [])
        self.assertEqual(len(ex.extract_codex(self.root, [REPO, "/work/proj-wt"], "feat/x")["ranges"]), 1)


class CliTests(unittest.TestCase):
    def found(self, rows, root, **kw):
        write_jsonl(os.path.join(root, ENC, "s1.jsonl"), rows)
        return self.extract(root, **kw)

    def extract(self, root, extra=()):
        code, text = run_main(["--repo", REPO, "--branch", "feat/x", "--projects-dir", root]
                              + list(extra))
        for line in text.splitlines():
            if line.startswith("output: "):
                self.addCleanup(shutil.rmtree, output_dir(text), True)
        return code, text

    def test_no_sessions_found_is_explicit_and_clean(self):
        with tempfile.TemporaryDirectory() as root:
            code, text = self.extract(root)
            self.assertEqual(code, 0)
            self.assertTrue(text.startswith("RESULT: no sessions found"))
            self.assertNotIn("output:", text)

    def test_missing_log_root_still_prints_result_and_warning(self):
        code, text = run_main(["--repo", REPO, "--branch", "feat/x",
                               "--projects-dir", "/nonexistent-root-xyz"])
        self.assertTrue(text.startswith("RESULT: no sessions found"))
        self.assertIn("warning: log root /nonexistent-root-xyz does not exist", text)

    def test_found_writes_range_files_and_summary(self):
        with tempfile.TemporaryDirectory() as root:
            ts = "2026-01-02T03:04:05Z"
            code, text = self.found([cl_user("hello", "feat/x", timestamp=ts)], root)
            out = output_dir(text)
            rf = os.path.join(out, "range-001.jsonl")
            self.assertEqual(code, 0)
            self.assertTrue(text.startswith("RESULT: sessions found"))
            self.assertTrue(os.path.isabs(out))
            self.assertIn("  %s  %s:1-1" % (rf, os.path.join(root, ENC, "s1.jsonl")), text)
            self.assertIn("range start: earliest %s | latest %s" % (ts, ts), text)
            self.assertNotIn("warning:", text)
            self.assertEqual(sorted(os.listdir(out)), ["range-001.jsonl"])
            with open(rf) as fh:
                rec = json.loads(fh.readline())
            self.assertEqual((rec["kind"], rec["line"], rec["text"]), ("human", 1, "hello"))

    def test_unknown_range_start_warns(self):
        with tempfile.TemporaryDirectory() as root:
            _, text = self.found([cl_user("hello", "feat/x")], root)
            self.assertIn("range start: earliest unknown | latest unknown", text)
            self.assertIn("warning: 1 range(s) have no timestamp", text)

    def test_codex_dispatch_through_main(self):
        with tempfile.TemporaryDirectory() as root:
            write_jsonl(os.path.join(root, "2026", "r.jsonl"), [
                {"type": "session_meta", "payload": {"cwd": REPO, "source": "cli",
                                                      "timestamp": "2026-01-01T00:00:00Z",
                                                      "git": {"branch": "feat/x"}}},
                {"type": "response_item", "payload": {"type": "message", "role": "user",
                    "content": [{"type": "input_text", "text": "codex words"}]}}])
            code, text = run_main(["--repo", REPO, "--branch", "feat/x", "--harness", "codex",
                                   "--projects-dir", root])
            self.addCleanup(shutil.rmtree, output_dir(text), True)
            self.assertEqual(code, 0)
            self.assertIn("harness: codex", text)
            self.assertIn("approximate", text)
            self.assertIn("Codex tool denials are not extracted", text)
            self.assertIn("range start: earliest 2026-01-01T00:00:00Z", text)

    def test_lone_surrogate_does_not_crash_output(self):
        with tempfile.TemporaryDirectory() as root:
            code, text = self.found([cl_user("bad \ud800 text", "feat/x")], root)
            self.assertEqual(code, 0)
            with open(os.path.join(output_dir(text), "range-001.jsonl"), "rb") as fh:
                data = fh.read()
            self.assertIn(b"\\ud800", data)
            self.assertIn("%d bytes" % len(data), text)

    def test_extractor_error_still_prints_result(self):
        with mock.patch.object(ex, "extract_claude", side_effect=RuntimeError("boom with secret")):
            code, text = run_main(["--repo", REPO, "--branch", "feat/x"])
        self.assertEqual(code, 1)
        self.assertTrue(text.startswith("RESULT: extractor error"))
        self.assertNotIn("secret", text)

    def test_failure_after_mkdtemp_removes_the_directory(self):
        made = []
        real = tempfile.mkdtemp

        def spy(*a, **kw):
            made.append(real(*a, **kw))
            return made[-1]
        with tempfile.TemporaryDirectory() as root:
            write_jsonl(os.path.join(root, ENC, "s1.jsonl"), [cl_user("hello", "feat/x")])
            with mock.patch.object(ex.tempfile, "mkdtemp", spy), \
                    mock.patch.object(ex.json, "dumps", side_effect=OSError("disk full")):
                code, text = run_main(["--repo", REPO, "--branch", "feat/x",
                                       "--projects-dir", root])
        self.assertEqual(code, 1)
        self.assertTrue(text.startswith("RESULT: extractor error"))
        self.assertEqual(len(made), 1)
        self.assertFalse(os.path.exists(made[0]))

    def test_unreadable_file_becomes_warning(self):
        with tempfile.TemporaryDirectory() as root:
            write_jsonl(os.path.join(root, ENC, "s1.jsonl"), [cl_user("hello", "feat/x")])
            write_jsonl(os.path.join(root, ENC, "s2.jsonl"), [cl_user("again", "feat/x")])
            real = ex.read_jsonl

            def flaky(path):
                if path.endswith("s2.jsonl"):
                    raise OSError("denied")
                return real(path)
            with mock.patch.object(ex, "read_jsonl", flaky):
                _, text = self.extract(root)
            self.assertTrue(text.startswith("RESULT: sessions found"))
            self.assertIn("warning: s2.jsonl could not be read (OSError)", text)

    def test_list_worktrees_reads_path_and_branch(self):
        porcelain = ("worktree /work/proj\nHEAD abc\nbranch refs/heads/main\n\n"
                     "worktree /work/proj/.worktrees/a\nHEAD def\nbranch refs/heads/feat/a\n\n"
                     "worktree /work/detached\nHEAD 123\ndetached\n")
        done = subprocess.CompletedProcess([], 0, stdout=porcelain)
        with mock.patch.object(ex.subprocess, "run", return_value=done):
            self.assertEqual(ex.list_worktrees(REPO), [
                ("/work/proj", "main"), ("/work/proj/.worktrees/a", "feat/a"),
                ("/work/detached", None)])


# ---------------------------------------------------------------- OpenCode

def ms(text):
    dt = datetime.fromisoformat(text).replace(tzinfo=timezone.utc)
    return int(dt.timestamp() * 1000)


def make_db(path, with_v2=True):
    conn = sqlite3.connect(path)
    if with_v2:
        conn.execute("CREATE TABLE session_v2 (id TEXT PRIMARY KEY, parent_id TEXT, directory TEXT, "
                     "title TEXT, time_created INTEGER, time_updated INTEGER)")
        conn.execute("CREATE TABLE session_message (id TEXT PRIMARY KEY, session_id TEXT, type TEXT, "
                     "seq INTEGER, time_created INTEGER, time_updated INTEGER, data TEXT, "
                     "UNIQUE (session_id, seq))")
    else:
        conn.execute("CREATE TABLE session (id TEXT)")
    conn.commit()
    return conn


def add_session(conn, sid, directory=REPO, parent=None, created="2026-03-04T10:00:00",
                updated="2026-03-04T11:00:00", messages=()):
    conn.execute("INSERT INTO session_v2 VALUES (?, ?, ?, ?, ?, ?)",
                 (sid, parent, directory, "title", ms(created), ms(updated)))
    for seq, (mtype, data) in enumerate(messages, 1):
        raw = data if isinstance(data, str) else json.dumps(data)
        conn.execute("INSERT INTO session_message VALUES (?, ?, ?, ?, 0, 0, ?)",
                     ("%s-%d" % (sid, seq), sid, mtype, seq, raw))
    conn.commit()


def oc_text(text):
    return {"type": "text", "text": text}


def oc_tool(name, status="completed", inp=None, error=None, metadata=None):
    state = {"status": status, "input": inp or {}, "metadata": metadata or {}}
    if error:
        state["error"] = error
    return {"type": "tool", "id": "x", "name": name, "state": state}


SIGNALS = [
    ("user", {"text": "please start", "time": 1}),                        # 1 human
    ("assistant", {"content": [{"type": "reasoning", "text": "hidden"}, oc_text("on it")]}),  # 2
    ("assistant", {"content": [oc_tool("question", metadata={"answers": [["A", "B"], "C"]})]}),  # 3 answer
    ("synthetic", {"text": "injected context"}),                          # 4 not human
    ("assistant", {"content": [oc_text("editing now"),
                               oc_tool("edit", "error", {"filePath": "/a/b.py"},
                                       {"type": "tool.execution",
                                        "message": "The user rejected this call: use make"})]}),  # 5 denial
    ("assistant", {"content": [oc_tool("bash", "error", {"command": "false"},
                                       {"type": "tool.execution", "message": "exit 1 ordinary"})]}),  # 6 ordinary
    ("assistant", {"content": [oc_tool("bash", "error", {}, {"type": "tool.interrupted",
                                                              "message": "x"})]}),  # 7 interrupt
    ("assistant", {"content": [], "error": {"type": "aborted"}}),         # 8 interrupt
    ("system", {"text": "system note"}),                                  # 9
    ("compaction", {"text": "summary"}),                                  # 10
]


class OpenCodeTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = self.tmp.name
        self.db = os.path.join(self.root, "opencode.db")
        self.conn = make_db(self.db)

    def tearDown(self):
        self.conn.close()
        self.tmp.cleanup()

    def run_oc(self, worktrees=(), since=None, until=None, skip=()):
        return ex.extract_opencode(self.root, [REPO] + list(worktrees), list(skip), since, until)

    def test_every_signal_is_extracted_and_nothing_else(self):
        add_session(self.conn, "ses_a", messages=SIGNALS)
        res = self.run_oc()
        self.assertEqual(len(res["ranges"]), 1)
        rg = res["ranges"][0]
        self.assertEqual((rg["start"], rg["end"]), (1, 10))
        recs = rg["records"]
        self.assertEqual([(r["kind"], r["line"]) for r in recs],
                         [("human", 1), ("assistant", 2), ("answer", 3), ("assistant", 5),
                          ("denial", 5), ("interrupt", 7), ("interrupt", 8)])
        by = {(r["kind"], r["line"]): r for r in recs}
        self.assertEqual(by[("human", 1)]["text"], "please start")
        self.assertEqual(by[("answer", 3)]["text"], "A, B; C")
        self.assertEqual(by[("assistant", 5)]["text"], "editing now")
        den = by[("denial", 5)]
        self.assertEqual((den["tool"], den["target"]), ("edit", "/a/b.py"))
        self.assertIn("use make", den["text"])
        self.assertIn(("interrupt", 7), by)
        self.assertIn(("interrupt", 8), by)
        flat = json.dumps(recs)
        for hidden in ("hidden", "injected context", "ordinary", "system note", "summary"):
            self.assertNotIn(hidden, flat)
        self.assertTrue(all(r["file"] == "opencode.db#ses_a" for r in recs))
        self.assertEqual(rg["file"], self.db + "#ses_a")
        self.assertEqual(res["warnings"], ["no --since/--until given, so every top-level "
                                           "session in the repo directories matched"])
        self.assertTrue(any("approximate" in n for n in res["notes"]))

    def test_directory_matching_and_worktrees(self):
        add_session(self.conn, "in", REPO + "/sub", messages=[("user", {"text": "a"})])
        add_session(self.conn, "wt", "/work/proj-wt", messages=[("user", {"text": "b"})])
        add_session(self.conn, "out", "/elsewhere", messages=[("user", {"text": "c"})])
        add_session(self.conn, "near", "/work/proj2", messages=[("user", {"text": "d"})])
        ids = lambda res: [r["file"].split("#")[1] for r in res["ranges"]]
        self.assertEqual(ids(self.run_oc()), ["in"])
        self.assertEqual(sorted(ids(self.run_oc(["/work/proj-wt"]))), ["in", "wt"])

    def test_subagent_sessions_are_skipped_and_counted(self):
        add_session(self.conn, "top", messages=[("user", {"text": "keep"})])
        add_session(self.conn, "kid", parent="top", messages=[("user", {"text": "parent prompt"})])
        res = self.run_oc()
        self.assertIn("1 subagent session(s) skipped", res["notes"])
        self.assertEqual(len(res["ranges"]), 1)
        self.assertNotIn("parent prompt", json.dumps(res["ranges"]))

    def test_time_window_includes_and_excludes(self):
        add_session(self.conn, "early", created="2026-03-01T09:00:00", updated="2026-03-01T10:00:00",
                    messages=[("user", {"text": "a"})])
        add_session(self.conn, "mid", created="2026-03-04T09:00:00", updated="2026-03-04T10:00:00",
                    messages=[("user", {"text": "b"})])
        add_session(self.conn, "late", created="2026-03-09T09:00:00", updated="2026-03-09T10:00:00",
                    messages=[("user", {"text": "c"})])
        ids = lambda res: [r["file"].split("#")[1] for r in res["ranges"]]
        got = self.run_oc(since=ms("2026-03-02T00:00:00"), until=ms("2026-03-05T00:00:00"))
        self.assertEqual(ids(got), ["mid"])
        self.assertEqual(got["warnings"], [])
        self.assertEqual(ids(self.run_oc(since=ms("2026-03-04T09:30:00"))), ["mid", "late"])
        self.assertEqual(ids(self.run_oc(until=ms("2026-03-04T09:30:00"))), ["early", "mid"])

    def test_time_parsing(self):
        z = ex.parse_since("2026-03-04T10:00:00Z")
        self.assertEqual(z, ms("2026-03-04T10:00:00"))
        self.assertEqual(ex.parse_since("2026-03-04T10:00:00+01:00"), ms("2026-03-04T09:00:00"))
        self.assertEqual(ex.parse_since("2026-03-04T10:00:00"), z)
        self.assertEqual(ex.parse_since("2026-03-04"), ms("2026-03-04T00:00:00"))
        self.assertEqual(ex.parse_until("2026-03-04"), ms("2026-03-05T00:00:00") - 1)
        self.assertEqual(ex.parse_until("2026-03-04T10:00:00Z"), z)
        with self.assertRaises(Exception) as cm:
            ex.parse_until("yesterday")
        self.assertEqual(type(cm.exception).__name__, "ArgumentTypeError")

    def test_database_without_session_v2_is_skipped_with_warning(self):
        add_session(self.conn, "ses_a", messages=[("user", {"text": "hi"})])
        other = make_db(os.path.join(self.root, "opencode-local.db"), with_v2=False)
        other.close()
        res = self.run_oc(since=0)
        self.assertEqual(len(res["ranges"]), 1)
        self.assertEqual(res["files_scanned"], 1)
        self.assertEqual(res["warnings"], ["opencode-local.db has no session_v2 table and was skipped"])

    def test_unreadable_database_and_wal_without_shm_warn(self):
        add_session(self.conn, "ses_a", messages=[("user", {"text": "hi"})])
        with open(os.path.join(self.root, "bad.db"), "wb") as fh:
            fh.write(b"this is not a database" * 50)
        wal = os.path.join(self.root, "walonly.db")
        make_db(wal).close()
        with open(wal + "-wal", "wb"):
            pass
        res = self.run_oc(since=0)
        self.assertEqual(len(res["ranges"]), 1)
        self.assertIn("bad.db could not be read (DatabaseError)", res["warnings"])
        self.assertIn("walonly.db has a WAL file but no -shm file and was skipped", res["warnings"])
        self.assertNotIn("this is not", json.dumps(res["warnings"]))

    def test_unknown_types_and_odd_shapes_do_not_abort(self):
        add_session(self.conn, "ses_a", messages=[
            ("mystery", {"text": "x"}),
            ("user", "{not json"),
            ("user", {"text": 5}),
            ("assistant", {"content": "nope"}),
            ("assistant", {"content": [3, {"type": "tool", "state": "bad"},
                                       oc_tool("question", metadata={"answers": "bad"}),
                                       oc_tool("bash", "error", {}, {"type": "weird.kind", "message": 9}),
                                       oc_tool("edit", "error", {}, "not a dict")],
                           "error": {"type": "other.kind"}}),
            ("user", {"text": "fine"}),
        ])
        res = self.run_oc(since=0)
        recs = res["ranges"][0]["records"]
        self.assertEqual([(r["kind"], r["text"]) for r in recs], [("human", "fine")])
        self.assertIn("1 message(s) have an unknown type (mystery) and were skipped", res["warnings"])
        self.assertIn("2 user row(s) had no readable text", res["warnings"])
        self.assertIn("2 error(s) have an unknown type (other.kind, weird.kind) and were not read",
                      res["warnings"])

    def test_database_is_opened_with_a_read_only_uri_and_leaves_no_files(self):
        add_session(self.conn, "ses_a", messages=[("user", {"text": "hi"})])
        calls = []
        real = sqlite3.connect

        def spy(*a, **kw):
            calls.append((a, kw))
            return real(*a, **kw)
        before = sorted(os.listdir(self.root))
        with mock.patch.object(ex.sqlite3, "connect", spy):
            self.run_oc(since=0)
        self.assertEqual(len(calls), 1)
        self.assertTrue(calls[0][0][0].startswith("file:") and "mode=ro" in calls[0][0][0])
        self.assertTrue(calls[0][1].get("uri"))
        self.assertEqual(sorted(os.listdir(self.root)), before)

    def test_wal_mode_database_is_read_without_creating_side_files(self):
        d = os.path.join(self.root, "wal")
        os.makedirs(d)
        conn = make_db(os.path.join(d, "opencode.db"))
        conn.execute("PRAGMA journal_mode=WAL")
        add_session(conn, "ses_w", messages=[("user", {"text": "x"})])
        conn.close()
        before = sorted(os.listdir(d))
        res = ex.extract_opencode(d, [REPO], [], 0, None)
        self.assertEqual(len(res["ranges"]), 1)
        self.assertEqual(sorted(os.listdir(d)), before)

    def test_one_unreadable_session_does_not_hide_the_others(self):
        add_session(self.conn, "ses_ok", messages=[("user", {"text": "keep"})])
        add_session(self.conn, "ses_boom", messages=[("user", {"text": "x"})])
        real = ex._opencode_records

        def flaky(rows, fname, stats):
            if "ses_boom" in fname:
                raise ValueError("boom with secret")
            return real(rows, fname, stats)
        with mock.patch.object(ex, "_opencode_records", flaky):
            res = self.run_oc(since=0)
        self.assertEqual([r["file"].split("#")[1] for r in res["ranges"]], ["ses_ok"])
        self.assertIn("1 session(s) could not be read (ValueError)", res["warnings"])
        self.assertNotIn("secret", json.dumps(res["warnings"]))

    def test_sessions_under_a_worktree_on_another_branch_are_skipped(self):
        add_session(self.conn, "mine", REPO + "/.worktrees/mine", messages=[("user", {"text": "a"})])
        add_session(self.conn, "other", REPO + "/.worktrees/other/sub",
                    messages=[("user", {"text": "b"})])
        add_session(self.conn, "main", REPO, messages=[("user", {"text": "c"})])
        res = self.run_oc(skip=[REPO + "/.worktrees/other"], since=0)
        self.assertEqual(sorted(r["file"].split("#")[1] for r in res["ranges"]), ["main", "mine"])
        self.assertEqual({r["dir"] for r in res["ranges"]}, {REPO, REPO + "/.worktrees/mine"})

    def refusals(self, error, name="question"):
        add_session(self.conn, "ses_r", messages=[
            ("assistant", {"content": [oc_tool(name, "error", {"filePath": "/a"}, error)]})])
        return [(r["kind"], r["text"], r.get("rule")) for rg in self.run_oc(since=0)["ranges"]
                for r in rg["records"]]

    def test_rejection_wordings_are_denials(self):
        for msg in ("The user rejected permission to use this specific tool call",
                    "Error: The user rejected permission to use this specific tool call",
                    "PermissionRejectedError", "QuestionRejectedError"):
            with self.subTest(msg=msg):
                self.conn.execute("DELETE FROM session_v2")
                self.conn.execute("DELETE FROM session_message")
                got = self.refusals({"type": "tool.execution", "message": msg}, "edit")
                self.assertEqual(got, [("denial", msg, None)])

    def test_question_dismissed_is_an_answer(self):
        got = self.refusals({"type": "tool.execution",
                             "message": "The user dismissed this question"})
        self.assertEqual(got, [("answer", "(dismissed)", None)])

    def test_configured_rule_refusal_is_a_denial_marked_as_a_rule(self):
        msg = "The user has specified a rule which prevents you from using this tool"
        got = self.refusals({"type": "tool.execution", "message": msg}, "bash")
        self.assertEqual(got, [("denial", msg, True)])

    def test_ordinary_tool_error_mentioning_nothing_is_not_a_denial(self):
        got = self.refusals({"type": "tool.execution", "message": "exit 1"}, "bash")
        self.assertEqual(got, [])


class OpenCodeCliTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = os.path.join(self.tmp.name, "oc")
        os.makedirs(self.root)
        self.db = os.path.join(self.root, "opencode.db")
        conn = make_db(self.db)
        add_session(conn, "ses_a", messages=[("user", {"text": "first words"}),
                                             ("user", {"text": "so use SECRETWORD here"})])
        add_session(conn, "ses_b", created="2026-04-01T00:00:00", updated="2026-04-01T01:00:00",
                    messages=[("user", {"text": "other session"})])
        add_session(conn, "kid", parent="ses_a", messages=[("user", {"text": "x"})])
        conn.close()

    def tearDown(self):
        self.tmp.cleanup()

    def extract(self, *extra):
        code, text = run_main(["--repo", REPO, "--branch", "feat/x", "--harness", "opencode",
                               "--projects-dir", self.root] + list(extra))
        if "output: " in text:
            self.out = output_dir(text)
            self.addCleanup(shutil.rmtree, self.out, True)
        return code, text

    def test_cli_window_summary_and_no_record_text(self):
        code, text = self.extract("--since", "2026-03-01T00:00:00Z", "--until", "2026-03-04")
        self.assertEqual(code, 0)
        self.assertTrue(text.startswith("RESULT: sessions found"))
        self.assertIn("harness: opencode", text)
        self.assertIn(self.db + "#ses_a:1-2 (dir: %s)" % REPO, text)
        self.assertNotIn("ses_b", text)
        self.assertIn("1 subagent session(s) skipped", text)
        self.assertIn("OpenCode records no branch", text)
        self.assertIn("range start: earliest 2026-03-04T10:00:00Z", text)
        self.assertNotIn("warning:", text)
        self.assertNotIn("first words", text)
        self.assertNotIn("SECRETWORD", text)

    def test_cli_until_date_covers_the_whole_day(self):
        _, text = self.extract("--until", "2026-03-04")
        self.assertIn("#ses_a:", text)
        _, text = self.extract("--until", "2026-03-03")
        self.assertTrue(text.startswith("RESULT: no sessions found"))

    def test_cli_bad_time_is_a_usage_error(self):
        with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
            self.extract("--since", "not a date")

    def test_cli_accepts_gits_author_date_format(self):
        # git log --format=%ai: a space for the T, a space before the offset, +HHMM
        _, text = self.extract("--since", "2026-03-04 11:00:00 +0100",
                               "--until", "2026-03-04 12:30:00 -0100")
        self.assertIn("#ses_a:", text)
        self.assertEqual(ex.parse_since("2026-03-04 11:00:00 +0100"), ms("2026-03-04T10:00:00"))
        self.assertEqual(ex.parse_since("2026-03-04T11:00:00+0100"), ms("2026-03-04T10:00:00"))

    def test_verify_checks_the_record_at_the_line(self):
        self.extract("--since", "2026-03-01")
        rf = os.path.join(self.out, "range-001.jsonl")

        def verify(quote, line):
            code, text = run_main(["--verify", rf, "--line", line], stdin=quote)
            self.assertEqual(code, 0)
            return text.strip()
        self.assertEqual(verify("use SECRETWORD", "2"), "match")
        self.assertEqual(verify("use SECRETWORD", "1"), "no match")
        self.assertEqual(verify("not there", "2"), "no match")

    def test_assistant_text_at_a_denial_seq_is_not_a_match(self):
        conn = sqlite3.connect(self.db)
        add_session(conn, "ses_d", created="2026-05-04T10:30:00", updated="2026-05-04T10:40:00",
                    messages=[
            ("assistant", {"content": [oc_text("I will delete the file"),
                                       oc_tool("bash", "error", {"command": "rm x"},
                                               {"type": "tool.execution",
                                                "message": "The user rejected this: keep it"})]})])
        conn.close()
        _, text = self.extract("--since", "2026-05-04T10:15:00Z", "--until", "2026-05-04T10:45:00Z")
        rf = os.path.join(self.out, "range-001.jsonl")

        def verify(quote):
            return run_main(["--verify", rf, "--line", "1"], stdin=quote)[1].strip()
        self.assertEqual(verify("keep it"), "match")
        self.assertEqual(verify("I will delete the file"), "no match")

    def test_verify_rejects_a_non_numeric_line(self):
        with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
            run_main(["--verify", "x", "--line", "abc"], stdin="q")

    def test_error_in_extractor_still_prints_result(self):
        with mock.patch.object(ex, "extract_opencode", side_effect=RuntimeError("boom secret")):
            code, text = run_main(["--repo", REPO, "--branch", "b", "--harness", "opencode"])
        self.assertEqual(code, 1)
        self.assertTrue(text.startswith("RESULT: extractor error"))
        self.assertNotIn("secret", text)

    def test_worktree_on_another_branch_is_excluded_through_the_cli(self):
        conn = sqlite3.connect(self.db)
        add_session(conn, "ses_wt", REPO + "/.worktrees/other", messages=[("user", {"text": "w"})])
        conn.close()
        wts = [(REPO, "main"), (REPO + "/.worktrees/other", "feat/other"),
               (REPO + "/.worktrees/mine", "feat/x")]
        argv = ["--repo", REPO, "--branch", "feat/x", "--harness", "opencode",
                "--projects-dir", self.root, "--since", "2026-03-01"]
        with mock.patch.object(ex, "list_worktrees", return_value=wts):
            buf = io.StringIO()
            with contextlib.redirect_stdout(buf):
                ex.main(argv)
        self.addCleanup(shutil.rmtree, output_dir(buf.getvalue()), True)
        self.assertIn("#ses_a:", buf.getvalue())
        self.assertNotIn("ses_wt", buf.getvalue())


class VerifyTests(unittest.TestCase):
    BS = chr(92)
    QUOTE = "it's \"quoted\" and C:" + BS + "path" + BS + "n with " + BS + BS + " backslash"

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = os.path.join(self.tmp.name, "logs")
        write_jsonl(os.path.join(self.root, ENC, "s1.jsonl"), [
            cl_assistant_text("assistant words", "feat/x"),
            cl_user("so " + self.QUOTE + "\n  and more   text", "feat/x")])
        _, text = run_main(["--repo", REPO, "--branch", "feat/x", "--projects-dir", self.root])
        self.addCleanup(shutil.rmtree, output_dir(text), True)
        self.rf = os.path.join(output_dir(text), "range-001.jsonl")

    def tearDown(self):
        self.tmp.cleanup()

    def verify(self, quote, line=2, rf=None):
        code, text = run_main(["--verify", rf or self.rf, "--line", str(line)], stdin=quote)
        self.assertEqual(code, 0)
        return text.strip()

    def test_tricky_quote_matches(self):
        self.assertEqual(self.verify(self.QUOTE), "match")

    def test_whitespace_is_normalised(self):
        self.assertEqual(self.verify("and\nmore text\n"), "match")

    def test_wrong_text_wrong_line_and_empty(self):
        self.assertEqual(self.verify("not in the record"), "no match")
        self.assertEqual(self.verify(self.QUOTE, line=1), "no match")
        self.assertEqual(self.verify("   "), "no match")

    def test_assistant_record_never_matches(self):
        self.assertEqual(self.verify("assistant words", line=1), "no match")

    def test_unreadable_range_file_is_an_error_not_a_miss(self):
        code, text = run_main(["--verify", os.path.join(self.tmp.name, "nope.jsonl"),
                               "--line", "1"], stdin="first")
        self.assertEqual((code, text.strip()), (1, "error: cannot read range file"))

    def test_never_echoes_record_text(self):
        self.assertNotIn("quoted", self.verify(self.QUOTE))


if __name__ == "__main__":
    unittest.main()
