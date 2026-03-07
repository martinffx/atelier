---
name: atelier-oracle-challenge
description: Challenge an approach with critical thinking. Use when questioning assumptions, validating decisions, testing approach validity, or preventing automatic agreement.
user-invocable: false
---

# Challenge: Critical Thinking Prompt

## The Iron Law

**NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST**

When you encounter a bug, error, or unexpected behavior, you MUST identify the root cause before implementing a fix. This means:
- Don't just fix the symptom—fix the disease
- If you don't understand why it broke, you don't know if your fix will work
- Quick fixes without investigation become technical debt

This is non-negotiable. If you're implementing a fix without understanding the root cause, you're just guessing.

## When to Use Challenge

**Before Implementing Fixes:**
- Any bug fix
- Error handling changes
- Edge case handling
- Performance fixes

**To Validate Approach:**
- Architecture decisions
- Technology choices
- Design patterns
- Requirement assumptions

**The Four Phases:**

### Phase 1: Root Cause Investigation
- Reproduce the issue consistently
- Identify what's different between expected and actual behavior
- Trace back to where the state diverges

### Phase 2: Pattern Recognition  
- Does this match a known pattern of bugs?
- Is there a category of errors this belongs to?
- What's common between this and other similar issues?

### Phase 3: Hypothesis Formation
- What do I believe is causing this?
- What's the minimal test that would prove/disprove this?
- What would a correct implementation look like?

### Phase 4: Implementation
- Verify fix with tests (consider domain boundary testing)
- Check for similar issues elsewhere
- Document what was learned

## Step 1: Parse Challenge Request

<strategist>
@agent-oracle

Analyze the challenge request: $ARGUMENTS

**Challenge Extraction:**
- **Core concern**: Extract the main doubt or question
- **Target approach**: Identify what is being challenged
- **Context**: Relevant background from current session
- **Specific aspects**: Particular elements to question

**Challenge Summary:**
You're challenging: [identified approach]
Because: [extracted concern]
In context of: [session context]
</strategist>

## Step 2: Set Up Critical Thinking Framework

<framework>
**What to Question:**
- **Underlying assumptions**: What beliefs support this approach?
- **Evidence base**: What data or experience validates it?
- **Context fit**: How well does it work in your specific situation?
- **Alternatives considered**: What other options were explored?
- **Risk factors**: What could go wrong with this approach?

**Critical Thinking Prompts:**
- Is this approach solving the right problem?
- Are the underlying assumptions still valid?
- What evidence contradicts this direction?
- How does this fit with your constraints and goals?
- What are the opportunity costs?
</framework>

## Step 3: Sequential Thinking Analysis

<strategist>
@agent-oracle

Use sequential thinking (mcp__sequential-thinking__sequentialthinking) to analyze this challenge:

**Thought 1**: Question the fundamental assumptions
**Thought 2**: Examine contradictory evidence
**Thought 3**: Explore alternative approaches
**Thought 4**: Assess context-specific fit
**Thought 5**: Evaluate risks and trade-offs
**Thought 6**: Synthesize findings into recommendation

Build systematically through evidence, alternatives, and risks.
Continue until you reach a clear conclusion.
</strategist>

## Step 4: Critical Evaluation Output

**Self-Critique Questions:**
- Does the analysis address the user's specific context?
- Are the recommendations practical and implementable?
- Have we considered the most important constraints?
- Are there any blind spots or missing perspectives?

**Final Synthesis:**
- **Assumption validity**: Are the underlying assumptions sound?
- **Evidence assessment**: Does evidence support or contradict?
- **Alternative recommendation**: If current approach is problematic, what instead?
- **Risk mitigation**: How to address identified concerns?

---

## Usage Examples

**Challenge Technical Decisions:**
```
/atelier-challenge "Do we really need a microservices architecture for this simple app?"
```

**Challenge Implementation Approach:**
```
/atelier-challenge "I think this caching strategy will actually slow things down"
```

**Challenge Requirements:**
```
/atelier-challenge "Are we solving the right problem with this feature?"
```

**Challenge Architectural Patterns:**
```
/atelier-challenge "Should we really use event sourcing for this use case?"
```

## When to Use Challenge

**Before Major Decisions:**
- Architecture choices
- Technology stack decisions
- Design pattern selection
- Implementation approach

**When Something Feels Off:**
- "This seems overly complex"
- "I'm not sure this solves the real problem"
- "This approach feels wrong"
- "Are we over-engineering this?"

**To Prevent Automatic Agreement:**
- When you want genuine critical evaluation
- When you need to challenge conventional wisdom
- When you want to test your own assumptions

## Challenge vs ThinkDeep

**Use /atelier-challenge**: Question assumptions, test validity, assess risks, prevent automatic agreement
**Use /atelier-thinkdeep**: Deep exploration, comprehensive analysis, alternative discovery, complex decisions

**Key distinction**: Challenge = critical evaluation, ThinkDeep = deep exploration

## Red Flags

**Warning signs you're not doing proper debugging:**

- Implementing a fix without reproducing the bug first
- Changing code to "see if it works"
- Not writing a test to verify the bug exists
- Fixing symptoms instead of root cause
- Not checking if the fix breaks other tests
- Not understanding why the fix works

## Common Rationalizations

**Don't rationalize—investigate:**

| Rationalization | Reality |
|----------------|---------|
| "It's probably a race condition" | You don't know, so find out |
| "It's always worked before" | Something changed, find what |
| "The tests are just flaky" | Tests caught a real bug |
| "It's an edge case" | Your code has edge cases in prod |
| "It's fast enough for now" | Technical debt accumulating |
| "I know what the problem is" | You have a hypothesis, not a certainty |

## Quick Reference

**Debugging workflow:**
1. Reproduce → Can you make it happen consistently?
2. Isolate → What's the minimal case?
3. Identify → What's different? What's the same?
4. Hypothesize → What do you think is wrong?
5. Test → Verify your hypothesis
6. Fix → Implement the solution
7. Verify → Does the fix work? Do other tests pass?

**Remember:** Domain boundaries define test boundaries—test at boundaries, mock at boundaries.
