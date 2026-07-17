---
name: oracle-grill-me
description: >
  Grill the user relentlessly about a plan, decision, or idea, maintaining the project's
  domain model (CONTEXT.md, ADRs) as decisions crystallise. Use when the user wants to
  stress-test their thinking, or uses any 'grill' trigger phrases.
user-invocable: true
---

# Grill Me

Interview me relentlessly about every aspect of this until we reach a shared understanding. Walk down each branch of the decision tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer.

Ask the questions one at a time, waiting for feedback on each question before continuing. Asking multiple questions at once is bewildering.

If a *fact* can be found by exploring the environment (filesystem, tools, etc.), look it up rather than asking me. The *decisions*, though, are mine — put each one to me and wait for my answer.

Do not act on it until I confirm we have reached a shared understanding.

Run this session using the `oracle-domain-modelling` skill.
