# Respond to Review (rs) — Interview Mode

## Overview

Interactive interview mode to resolve code review findings. No subagents.

The agent interviews the user one question at a time, multiple choice, until it has enough context to resolve all issues raised by the review.

## Prompt

```
Interview me until you have enough context to resolve all the issues raised by the code review.
Ask me questions 1 by 1, multiple choice.
```

## Behavior

1. Load the review findings from the current conversation context
2. Begin interviewing the user — one question at a time, always multiple choice
3. Use answers to build understanding of how to resolve each finding
4. Once all context is gathered, apply the fixes
5. **Always ask user before applying fixes**

## Guidelines

- One question at a time — never batch questions
- Always provide multiple choice answers (a, b, c, d...)
- Start with the most ambiguous findings first
- Skip findings that are clearly actionable without input
- After all questions are answered, summarize the plan and confirm before making changes
