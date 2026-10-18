# Multi-agent debate for code review: research notes

Rationale for the Triage → Critique → Debate design in
[`skills/code-review`](../../skills/code-review/SKILL.md). Compiled from four literature and
product surveys. Vendor figures are self-reported. Claims I could not confirm from a primary
source are marked **(unverified)**.

## Verdict

Keep independent parallel critics, add one defense and one rebuttal, and verify evidence
mechanically. Do not add rounds. The evidence favours independent reviewers, a per-finding
verifier, and checks against real code over longer argument.

## When debate helps and when it hurts

- **Most of the gain is voting, not arguing.** Across 7 benchmarks, majority voting accounts for
  most of the improvement usually credited to debate; expected belief in the correct answer does
  not rise across rounds (Choi et al., NeurIPS 2025, <https://arxiv.org/abs/2508.17536v1>).
  Across 5 debate methods, 9 benchmarks and 4 models, debate often fails to beat chain-of-thought
  or self-consistency at higher compute (<https://arxiv.org/pdf/2502.08788>). Smit et al. report
  the same and high sensitivity to settings (ICML 2024,
  <https://proceedings.mlr.press/v235/smit24a.html>).
  → Parallel independent critics are the part that works. Treat the debate as a filter.
- **Longer debates get worse.** Agents switch from correct to incorrect after reading peers'
  reasoning (Wynn et al. 2025, <https://arxiv.org/abs/2509.05396v2>). In Khan et al., the best
  judge accuracy came after 1–2 rounds and weaker judges degraded after round 2
  (<https://arxiv.org/html/2402.06782v4>).
  → One round.
- **Debate helps most when the judge cannot see the source.** When the judge can read it, results
  are mixed (Kenton et al., NeurIPS 2024, <https://arxiv.org/pdf/2407.04622>). Our Judge can read
  the code, so the debate's value is the Author surfacing missing context. Missing context caused
  48% of sampled false positives in SWR-Bench (<https://arxiv.org/html/2509.01494v2>).
- **Model diversity beats extra rounds.** A panel of judges from different model families beat a
  single large judge at over 7× lower cost (Verga et al. 2024,
  <https://arxiv.org/abs/2404.18796>). The skill is harness-agnostic, so it can only vary
  personas, not models.

## Closest analogue: VulTrial

Prosecutor, defending code author, moderator and jury (Widyasari et al., ICSE 2026,
<https://arxiv.org/html/2505.10961v2>).

- Removing the defender raised false positives from 154 to 277.
- One round was best. Correct pairs fell 96 → 87 → 81 and false positives rose 154 → 173 → 194
  over 1, 2 and 3 rounds as the author drifted toward conceding.
- About 4× the cost of one agent with GPT-4o.

→ Keep the Author. Drop round 2.

## Judge design

- Known biases: position, verbosity and self-preference (Zheng et al. 2023,
  <https://arxiv.org/abs/2306.05685>; Panickssery et al., NeurIPS 2024,
  <https://arxiv.org/abs/2404.13076v1>).
- Verified quotes are what made debate judging work in Khan et al.: matching quotes were tagged
  verified and the judge trusted only those (76% vs 54% for a single consultant).
- No study found that directly compares a full transcript with contested items only.
  **Inference:** give the Judge each contested item, both final positions and verified evidence,
  with side labels removed.

## Sycophancy and capitulation

- After "Are you sure?", Claude 1.3 wrongly admitted mistakes 98% of the time and GPT-4 42%
  (Sharma et al., <https://arxiv.org/html/2310.13548v4>).
- Across 10 models, a challenge changed answers 46% of the time and cut accuracy 17% on average
  (FlipFlop, <https://arxiv.org/abs/2311.08596v2>).
- Agents follow a majority even when they know the right answer; one dissenter reduces this
  (ICLR 2025, <https://arxiv.org/html/2501.13381v1>).
- Agreement is not proof. Ten reviewers unanimously endorsed an OpenSSL bug that did not exist;
  one test disproved it (Refute-or-Promote, <https://arxiv.org/abs/2604.19049>).

→ Critics concede only to a specific refutation of cited lines. The Author's dispute needs
verified evidence too. Executed checks outrank argument.

## How production review tools work

| Tool | Architecture | Noise control | Notes |
|---|---|---|---|
| Greptile | Single agent loop (v3); parallel hypothesis swarm (v5) | Embeds comments, blocks near-duplicates of downvoted ones; LLM self-scoring was "nearly random" | Addressed rate 19% → 55%+ after feedback learning (vendor) |
| CodeRabbit | Review agent proposes, verification agents check, scripts run in a sandbox | Verification pass; learnings from replies; nitpicks only in "assertive" mode | On pushback it re-checks, then keeps the finding with new evidence or withdraws it and records a learning |
| Cursor Bugbot | v1: 8 shuffled passes, majority vote, validator. Now: one tool-using agent | Learned rules from reactions; dedup across runs | Dropped voting for an agentic reviewer |
| Qodo PR-Agent | Generate, then self-reflection scoring 0–10 | Score threshold; max 3 findings | Qodo 2.0: parallel specialists plus a judge |
| Anthropic review | Parallel agents, then a verifier per finding | Do-not-flag list (pre-existing, linter-catchable, pedantic) | Labels: Important / Nit / Pre-existing; one follow-up reply per thread |
| OpenAI Codex | One review-trained agent with code execution | Posts only when expected value is positive | P0–P3, GitHub gets P0/P1 |
| Ellipsis | Parallel generators, each with evidence | Confidence threshold, dedup, hallucination check against evidence | |

Sources: <https://greptile.com/blog/make-llms-shut-up>, <https://www.greptile.com/blog/greptile-v5>,
<https://coderabbit.ai/blog/context-engineering-ai-code-reviews>,
<https://docs.coderabbit.ai/overview/architecture.md>, <https://cursor.com/blog/building-bugbot>,
<https://github.com/qodo-ai/pr-agent>, <https://code.claude.com/docs/en/code-review>,
<https://github.com/openai/codex/blob/main/codex-rs/prompts/templates/review/rubric.md>,
<https://nickbradford.substack.com/p/lessons-from-27-months-building-llm>.

Recurring patterns: generate broadly then verify independently; require evidence; favour
precision over recall; few severity buckets; remember past disputes; measure what authors act on.
None publishes results for a multi-round debate.

## Comment taxonomies

- Conventional Comments: labels plus blocking / non-blocking decorations
  (<https://conventionalcomments.org/>). Netlify's feedback ladder adds "not blocking, but must be
  addressed later".
- Human review is mostly about understanding and improving code, not finding defects (Bacchelli &
  Bird, ICSE 2013). LLMs find functional bugs more reliably than subjective issues (SWR-Bench).

→ Classify by **kind × blocking**. Only issues get the full debate.

## Decisions taken for `code-review`

| Decision | Evidence |
|---|---|
| Parallel critics, then merge | Choi; SWR-Bench (gains level off near five runs) |
| Author defends every finding | VulTrial |
| One rebuttal round | VulTrial; Khan; Wynn |
| Verified quotes; unverified evidence has no weight | Khan |
| Executed checks outrank code reading, then skills, then assertion | Refute-or-Promote; Codex; CodeRabbit |
| Dispute and confirmation both need evidence | Sharma; FlipFlop |
| Judge sees contested items with anonymous positions | Zheng; Panickssery (inference) |
| Judge only runs when something needs ruling | Production tools verify, not re-judge |
| Kind × blocking classification | Conventional Comments; Anthropic review |
| No self-scored confidence | Greptile |
| Audit: working-tree snapshot, activity logs, re-run decisive checks | Refute-or-Promote |

## Open questions

- **(unverified)** One preprint reports a +1.3 point edge for debate at equal compute
  (<https://arxiv.org/abs/2605.01566>); not opened.
- **(unverified)** Claude Code's plugin using a 0–100 confidence cutoff of 80; the current command
  file has no numeric threshold.
- **(unverified)** CodeRabbit internals from a sponsored third-party write-up (planner, 7–8
  models, nano-model context compression).
- Vendor metrics (address rates, upvote ratios) are self-reported.
- Whether the Author's drift toward conceding appears with persona prompts and evidence rules is
  untested here; track the concede rate and address rate on real reviews.
