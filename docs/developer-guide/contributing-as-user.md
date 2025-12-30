# Contributing as a User

This guide is for users who get stuck using devorch and want to help improve it.

## When You Get Stuck

**Don't suffer in silence.** Getting stuck is valuable feedback that helps improve devorch for everyone.

### Step 1: Ask Claude What Happened

When a command fails or gets stuck, **ask Claude directly**:

```
Why did you get stuck?
Why did you include this file?
What was your reasoning for [specific action]?
```

Claude can explain its decision-making process and help you understand what went wrong.

### Step 2: Diagnose the Issue

Work with Claude to understand the root cause:

- **Was it a missing dependency?** → Might need better dependency resolution
- **Did it choose the wrong implementer?** → Might need clearer descriptions or better context training
- **Did it misunderstand the spec?** → Might need clearer specification templates
- **Did it get caught in a loop?** → Might need better error handling or retry logic
- **Did it read irrelevant files?** → Might need better file discovery heuristics

### Step 3: Come Up With Improvements

Once you understand the issue, brainstorm solutions with Claude:

- Could a command be improved?
- Could a subagent be more clear?
- Could context training provide better guidance?
- Could error messages be more helpful?
- Could the dependency system be smarter?

## How to Contribute Improvements

You have two options:

### Option 1: Share in Community (Quick Feedback)

**Best for:** Getting quick feedback, discussing ideas, or sharing patterns

1. Document your issue and proposed solution
2. Post in **#ai-native-pdlc** Slack channel
3. Tag relevant people who might have context
4. Discuss and refine the solution together

**What to include:**
- Command/subagent that got stuck
- What you were trying to do
- What went wrong
- Your proposed improvement

Example post:
```
Got stuck with /implement-spec - it kept reading test files instead of source code.

Issue: File discovery was too broad, included __tests__ directories.

Proposed fix: Add exclusion patterns to implementer file discovery.

Thoughts?
```

### Option 2: Create GitHub Issue (Formal Tracking)

**Best for:** Bugs, feature requests, or documented improvements

1. Go to [devorch issues](https://github.com/anthropics/devorch/issues)
2. Check if issue already exists
3. Create new issue with template:

```markdown
## Issue
Brief description of what went wrong

## Context
- Command: /implement-spec
- Subagent: ui-implementer
- Repository: mobile-app

## What Happened
Detailed explanation of the failure

## Expected Behavior
What should have happened

## Proposed Solution
Your idea for fixing it

## Reproduction Steps
1. Run /implement-spec on X
2. Observe Y behavior
3. See error Z
```

### Option 3: Submit a Pull Request (Direct Contribution)

**Best for:** Clear fixes, new assets, or improvements you've already tested

1. Fork the repository
2. Create a branch: `git checkout -b fix/implement-spec-file-discovery`
3. Make your changes
4. Test with your own repository
5. Submit PR with:
   - Clear description of problem
   - Explanation of solution
   - Example of improvement

**Common contributions:**
- Improve command/subagent descriptions
- Add better error messages
- Fix file discovery patterns
- Add missing dependencies
- Improve context training templates
- Add new skills from your codebase

## Common Issues and Fixes

### Issue: Command Chose Wrong Implementer

**Symptom:** Implementer doesn't match the task

**Debug with Claude:**
```
Why did you choose the API implementer for this UI task?
```

**Possible fixes:**
- Improve implementer descriptions in frontmatter
- Add clearer specialization in context training
- Add examples of when to use each implementer

**Contribute:**
- Update `context-training/{name}/implementers/*.md` with clearer guidance
- Add `specializes_in` field to implementer frontmatter

### Issue: Subagent Reads Irrelevant Files

**Symptom:** Too many files read, context overload

**Debug with Claude:**
```
Why did you read all those test files?
Show me the file discovery patterns you used.
```

**Possible fixes:**
- Add exclusion patterns to file discovery
- Improve glob patterns in subagent prompts
- Add file relevance filtering

**Contribute:**
- Update subagent file discovery instructions
- Add exclusion patterns to context training
- Create skill with file discovery patterns

### Issue: Circular Dependencies

**Symptom:** Installation fails with dependency cycle error

**Debug with Claude:**
```
Why is there a circular dependency between these subagents?
```

**Possible fixes:**
- Restructure dependencies (command → subagent → skill)
- Extract shared logic into skill
- Use partials in shared/workflows instead of dependencies

**Contribute:**
- Report the circular dependency path
- Suggest restructuring in GitHub issue
- Submit PR with fixed dependency tree

### Issue: Missing Context Training Guidance

**Symptom:** Implementer doesn't follow repository patterns

**Debug with Claude:**
```
What guidance did you have for [specific pattern]?
Did you read the context training files?
```

**Possible fixes:**
- Add missing patterns to context training
- Improve skill references
- Add examples to implementer customizations

**Contribute:**
- Share your context training improvements
- Create PR with new implementer customization
- Add skill from your codebase

### Issue: Command Gets Stuck in Loop

**Symptom:** Same error repeated, no progress

**Debug with Claude:**
```
Why did you retry the same approach?
What error are you seeing?
```

**Possible fixes:**
- Add better error detection
- Improve retry logic with backoff
- Add max retry limits
- Better error messages

**Contribute:**
- Document the loop condition
- Suggest retry improvements
- Add error handling patterns to skills

## Debugging Workflow Example

**Scenario:** `/implement-spec` reads too many files and times out.

1. **Ask Claude:**
```
Why did you read so many files?
Show me the file discovery patterns.
```

2. **Claude explains:**
```
I used pattern: src/**/*.{ts,tsx}
This matched 500+ files including tests, stories, and generated code.
```

3. **Identify fix:**
```
We should exclude:
- __tests__/
- *.test.ts
- *.stories.tsx
- __generated__/
```

4. **Test locally:**
- Update your context training with exclusions
- Run command again
- Verify it only reads relevant files

5. **Contribute back:**
- Post in #ai-native-pdlc: "Added exclusion patterns to UI implementer, reduced files from 500 to 50"
- Or create PR updating `templates/subagents/implementer/ui-implementer.md`

## Best Practices

### Do:
- Ask Claude why it got stuck
- Document the issue clearly
- Test your fix locally first
- Share learnings in Slack
- Create issues for bugs
- Submit PRs for improvements

### Don't:
- Suffer in silence
- Assume it's "just you"
- Make changes without understanding root cause
- Skip documentation
- Forget to test

## Getting Help

- **Slack:** #ai-native-pdlc (quick questions, discussions)
- **GitHub Issues:** Bugs, feature requests
- **README:** Installation and basic usage
- **CLAUDE.md:** AI assistant development guide
- **CONTEXT_TRAINING.md:** Context training system details

## Example Contributions

**Good issue:**
```markdown
## Issue: Implementer reads test files

Command: /implement-spec
Subagent: ui-implementer

## What Happened
Implementer read 200 test files, caused timeout

## Root Cause
File discovery pattern too broad: src/**/*.ts

## Proposed Solution
Add exclusions: **/__tests__/**, **/*.test.ts

## Testing
Tested locally, reduced from 200 to 30 files
```

**Good Slack post:**
```
📍 /implement-spec improvement:

Issue: UI implementer reading test files
Fix: Added test exclusions to context training
Result: 85% fewer files, 3x faster

Should we add this to default UI implementer? cc @reviewer
```

**Good PR:**
```markdown
## Improve UI implementer file discovery

### Problem
UI implementer reads too many test files, causing timeouts

### Solution
Add exclusion patterns for tests, stories, generated code

### Changes
- templates/subagents/implementer/ui-implementer.md: Add exclusions
- docs/CONTRIBUTING_AS_DEV.md: Document pattern

### Testing
Tested on 3 repositories, file count reduced by 70-90%
```

## Remember

**Your struggles are valuable data.** When you get stuck:
1. You've found something that needs improvement
2. Asking Claude why helps you understand
3. Sharing helps everyone
4. Contributing makes devorch better

Don't stay stuck alone - ask, debug, improve, share! 🚀
