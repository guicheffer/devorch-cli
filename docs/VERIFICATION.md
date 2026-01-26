# Context Training Verification

## Overview

Context verification and quality checking ensures that context-training files accurately reflect your codebase and follow best practices. This process automatically validates code examples, import paths, function signatures, and quality standards after generating or updating context-training files.

## How It Works

Verification runs automatically as the final step in both `/train-context` and `/update-context` commands. The process consists of two main components:

### 1. Context Verifier

Validates that code examples and references in your context-training files match the actual codebase.

**What it checks:**
- ✅ Import paths exist and are correct
- ✅ Function signatures match actual implementations
- ✅ Directory references are valid
- ✅ File references exist
- ✅ Code examples reflect current patterns

**What it doesn't check (fictional examples are valid):**
- Generic examples with placeholder names (UserProfile, handleClick, fetchData)
- Common patterns (useState, useEffect, standard React hooks)
- Illustrative code demonstrating concepts
- Simplified examples for teaching purposes

### 2. Quality Checker

Analyzes code examples for quality, security, and maintainability issues.

**What it checks:**
- ✅ Best practices (clear naming, error handling, TypeScript usage)
- ✅ Anti-patterns (god functions, tight coupling, magic numbers)
- ✅ Security issues (hardcoded secrets, injection risks, missing validation)
- ✅ Maintainability (code duplication, unclear intent, overly complex examples)

## Issue Categories

### Critical Issues (Auto-Fixed)

Issues that are clearly wrong and can be confidently fixed automatically:

| Issue Type | Example | Fix |
|------------|---------|-----|
| **Wrong import path** | `import { api } from '@/services/api'` (file doesn't exist) | Search codebase, update to correct path: `@/utils/api` |
| **Non-existent directory** | References `src/components/` (doesn't exist) | Find actual directory: `src/ui/` |
| **Wrong file extension** | References `.js` file that is actually `.ts` | Update extension |

**Auto-fix process:**
1. Verifier detects the issue
2. Searches codebase for correct path/reference
3. Updates markdown file automatically
4. Reports the fix in INCONSISTENCIES.md

### Mismatch Issues (Review Needed)

Issues where the example differs from actual implementation. These require user review to decide whether to update:

| Issue Type | Example | Reason |
|------------|---------|--------|
| **Different implementation** | Shows styled-components, codebase uses emotion | Architectural choice or outdated pattern |
| **Outdated pattern** | Shows class components, codebase uses hooks | Pattern evolved over time |
| **Signature difference** | Shows `function foo(a, b)`, actual is `function foo(a, b, c)` | API changed or intentional simplification |

**Why not auto-fixed:** The difference might be intentional (teaching simplified version) or the pattern might need updating. User should decide.

### Fictional Examples (Accepted)

Generic, illustrative examples that demonstrate patterns without being specific to your codebase:

| Pattern | Example | Why Accepted |
|---------|---------|--------------|
| **Generic naming** | `const UserProfile = () => { ... }` | Demonstrates component pattern |
| **Common hooks** | `const [data, setData] = useState(null)` | Standard React pattern |
| **Placeholder values** | `apiKey: "your-api-key-here"` | Obviously not a real secret |
| **Teaching examples** | Simplified error handling | Illustrates concept clearly |

**Heuristics for fictional detection:**
```typescript
// Generic patterns (fictional)
User*, Product*, Item*, Data*
handle*, fetch*, get*, set*, update*
example*, test*, demo*, sample*

// Placeholder indicators
"example.com", "localhost", "test.com"
"your-api-key", "TODO", "<insert-value>"
"123", "abc", "test-id"
```

### Quality Issues

**Critical (Must Fix):**
- Hardcoded secrets (API keys, tokens, passwords)
- Security vulnerabilities (SQL injection, XSS risks)
- Missing error handling in async operations
- Major anti-patterns (god functions >50 lines)

**Warnings (Recommendations):**
- Minor anti-patterns (tight coupling, magic numbers)
- Maintainability issues (code duplication, unclear naming)
- Style inconsistencies
- Missing best practices (but not critical)

## Verification Loop

The verification process runs up to 3 times to give you opportunities to fix issues:

```
┌─────────────────────────────────────────────┐
│  Iteration 1                                │
├─────────────────────────────────────────────┤
│  1. Run context-verifier                    │
│     → Auto-fix critical issues              │
│     → Report mismatches                     │
│     → Accept fictional examples             │
│                                             │
│  2. Check status                            │
│     ✅ Passed? → Continue to quality        │
│     ⚠️ Mismatches? → Ask user               │
│                                             │
│  3. Run quality-checker                     │
│     → Analyze code examples                 │
│     → Calculate quality scores              │
│     → Identify critical/warning issues      │
│                                             │
│  4. Check quality                           │
│     ✅ Passed? → Complete                   │
│     ⚠️ Critical? → Ask user (fix/proceed)   │
│     ℹ️ Warnings? → Ask user (fix/accept)    │
└─────────────────────────────────────────────┘

If issues remain → Iteration 2 (repeat above)
If still issues → Iteration 3 (final attempt)
If still issues → Ask user to accept or abort
```

## User Decision Points

During verification, you'll be asked to make decisions at key points:

### 1. When Mismatches Are Found

After auto-fixing critical issues, if mismatches remain:

**Options:**
- **Review and fix manually**: Stop here, fix issues yourself, then re-run
- **Continue with quality checks**: Proceed anyway, review mismatches later
- **Abort verification**: Stop the process

**Recommendation:** Review mismatches if they're in critical patterns. If they're minor or intentional simplifications, continue.

### 2. When Quality Critical Issues Are Found

If quality checker finds security issues or major anti-patterns:

**Options:**
- **Fix and retry**: Fix issues and re-run verification (if under max iterations)
- **Proceed anyway**: Accept context-training with critical issues (not recommended)
- **Abort**: Stop to review and fix manually

**Recommendation:** Always fix critical security issues before proceeding.

### 3. When Quality Warnings Are Found

If only warnings (no critical issues):

**Options:**
- **Accept with warnings**: Proceed with context-training (warnings are recommendations)
- **Fix and retry**: Improve patterns and re-run verification

**Recommendation:** Warnings are okay for teaching examples. Fix if time permits, but not blocking.

### 4. When Max Iterations Are Reached

After 3 iterations, if issues still exist:

**Options:**
- **Accept with warnings**: Use context-training as-is, acknowledge issues exist
- **Abort and fix manually**: Stop, review INCONSISTENCIES.md, fix manually

**Recommendation:** If only warnings remain, safe to accept. If critical issues persist, fix manually.

## INCONSISTENCIES.md Report

After each verification run, a detailed report is generated at:
```
devorch/context-training/{your-name}/INCONSISTENCIES.md
```

### Report Structure

```markdown
# Context Training Verification Report

**Generated**: 2025-01-26 10:30:00
**Status**: Issues Found

## Summary
- Files Checked: 12
- Critical Issues: 3 (auto-fixed)
- Mismatches: 5 (review needed)
- Fictional Examples: 42 (accepted)
- Quality Score: 75/100

## Critical Issues (Auto-Fixed)
[Details of what was automatically corrected]

## Mismatches (Review Needed)
[Items that need your review and decision]

## Fictional Examples (Accepted)
[Generic examples that were correctly identified as illustrative]

## Quality Findings
[Best practices, security, anti-patterns, maintainability scores and issues]

## Quality Scores
- Overall: 75/100
- Best Practices: 80/100
- Security: 60/100 ⚠️
- Maintainability: 85/100
- Anti-Patterns: 90/100

## Recommendations
[Actionable next steps based on findings]
```

## Quality Scoring

Quality scores range from 0-100 and are calculated across four categories:

### Best Practices (30% weight)
- Clear, descriptive naming
- Proper error handling
- TypeScript usage (no `any`)
- Appropriate abstractions

**Scoring:**
- 90-100: Excellent - All best practices followed
- 70-89: Good - Minor improvements possible
- 50-69: Fair - Several issues to address
- <50: Poor - Major issues present

### Anti-Patterns (20% weight)
- God functions (>50 lines, >5 params)
- Tight coupling
- Magic numbers/strings
- Missing error handling

**Scoring:**
- 100: No anti-patterns found
- Deduct 10 points per anti-pattern instance

### Security (40% weight - highest)
- Hardcoded secrets
- Injection risks (SQL, XSS, command)
- Missing input validation
- Insecure data handling

**Scoring:**
- 100: No security issues
- 0: Any critical security issue found

### Maintainability (10% weight)
- Code duplication
- Overly long examples (>30 lines)
- Unclear intent
- Poor structure

**Scoring:**
- 100: Highly maintainable
- Deduct 5 points per maintainability issue

### Overall Score

```
Overall = (BestPractices × 0.3) + (AntiPatterns × 0.2) +
          (Security × 0.4) + (Maintainability × 0.1)
```

**Thresholds:**
- ✅ **80-100**: Excellent - Ready for production use
- ✅ **70-79**: Good - Minor improvements recommended
- ⚠️ **50-69**: Fair - Address quality issues before production
- ❌ **<50**: Poor - Major issues, fix before using

## Examples

### Example 1: All Checks Pass

```bash
$ devorch train-context

# ... workflow steps ...

Step 7: Verify Context

Running verification (Iteration 1)...

✅ Verification Complete

Files Checked: 8
Critical Issues: 0
Mismatches: 0
Fictional Examples: 15 (accepted)

✅ Quality Check Complete

Overall Score: 92/100

Best Practices: 95/100
Security: 100/100
Maintainability: 90/100
Anti-Patterns: 100/100

✅ Context training verified successfully!

No issues found. Ready to use.
```

### Example 2: Critical Issues Auto-Fixed

```bash
$ devorch train-context

# ... workflow steps ...

Step 7: Verify Context

Running verification (Iteration 1)...

⚠️ Verification found issues (auto-fixed)

Files Checked: 10
Critical Issues: 3 (auto-fixed)
  - Fixed import path in api.md:45
  - Fixed directory reference in ui.md:120
  - Fixed function signature in auth.md:67
Mismatches: 0
Fictional Examples: 22 (accepted)

✅ Quality Check Complete

Overall Score: 85/100

Report: devorch/context-training/mobile-app/INCONSISTENCIES.md

✅ Context training verified successfully!

Review auto-fixes in INCONSISTENCIES.md to ensure correctness.
```

### Example 3: Mismatches Require Review

```bash
$ devorch train-context

# ... workflow steps ...

Step 7: Verify Context

Running verification (Iteration 1)...

⚠️ Verification found mismatches

Files Checked: 12
Critical Issues: 2 (auto-fixed)
Mismatches: 4 (review needed)
  - ui.md:78: Shows styled-components, codebase uses emotion
  - state.md:120: Shows Context API, codebase uses Zustand
  - ...

Question: How would you like to proceed?

[1] Review and fix manually
    Stop here so I can review and fix mismatches

[2] Continue with quality checks (Recommended)
    Proceed to quality checking, review later

[3] Abort verification
    Stop verification process

Your choice: 2

Running quality check...

✅ Quality Check Complete

Overall Score: 78/100

Report: devorch/context-training/mobile-app/INCONSISTENCIES.md

⚠️ Context training completed with 4 mismatches

Review INCONSISTENCIES.md and decide whether to update patterns
or keep them as intentional simplifications.
```

### Example 4: Quality Critical Issues

```bash
$ devorch train-context

# ... workflow steps ...

Step 7: Verify Context

Running verification (Iteration 1)...

✅ Verification passed

Running quality check...

❌ Quality check found critical issues

Critical Issues: 2
  - security.md:67: Hardcoded API key
  - api.md:145: SQL injection risk

Quality Score: 35/100 ❌
  Security: 0/100

Question: How would you like to proceed?

[1] Fix and retry (Recommended)
    Fix issues and re-run verification

[2] Proceed anyway
    Accept with critical issues (not recommended)

[3] Abort
    Stop here to fix manually

Your choice: 1

# User fixes the issues in markdown files

Re-running verification (Iteration 2)...

✅ Verification passed

✅ Quality check passed

Quality Score: 88/100

✅ Context training verified successfully!
```

## Troubleshooting

### Verification keeps failing after 3 iterations

**Problem:** Even after fixes, verification still reports issues.

**Solutions:**
1. **Check INCONSISTENCIES.md carefully**: Look for patterns in what's failing
2. **Verify your fixes**: Make sure you're editing the right files in `devorch/context-training/{name}/`
3. **Check for typos**: Auto-fix relies on finding similar paths - typos can break this
4. **Accept with warnings**: If only non-critical issues remain, it's safe to accept

### Auto-fix changed the wrong import path

**Problem:** Verifier found a similar path but it's not the correct one.

**Solutions:**
1. **Review INCONSISTENCIES.md**: Check the "Auto-Fixed" section
2. **Manually correct**: Edit the markdown file to use the correct path
3. **Re-run verification**: The verifier will validate your manual fix
4. **Report issue**: If auto-fix is consistently wrong, this is a bug

### Quality checker flags teaching examples as issues

**Problem:** Simplified examples for teaching are marked as quality issues.

**Solutions:**
1. **Check severity**: If it's a "Warning", not "Critical", you can accept it
2. **Add context**: Sometimes adding a comment helps: `// Simplified for illustration`
3. **Accept warnings**: Teaching examples don't need to be production-perfect
4. **Balance teaching vs quality**: Some simplification is good for clarity

### Verification is too strict / too lenient

**Problem:** Verification standards don't match your project's needs.

**Solutions:**
1. **Quality standards**: During pattern review (Step 3f), specify your standards clearly
2. **Accept fictional examples**: Generic examples are valuable for teaching
3. **Focus on critical issues**: Warnings are recommendations, not requirements
4. **Provide feedback**: Let us know if heuristics need adjustment

### Can't fix quality issues in 3 iterations

**Problem:** Complex quality issues take longer than 3 attempts to resolve.

**Solutions:**
1. **Accept with warnings**: Use context-training, fix incrementally
2. **Fix offline**: Edit files manually, then run `/update-context` to re-verify
3. **Prioritize critical**: Fix security issues first, warnings later
4. **Split work**: Accept now, improve patterns over time

## Best Practices

### During Pattern Review

1. **Be specific about quality standards**: In Step 3f, clearly describe your expectations
2. **Focus on critical patterns**: Don't over-specify for every domain
3. **Allow fictional examples**: Generic examples make better teaching material
4. **Balance real vs ideal**: Teaching examples can be slightly simplified

### During Verification

1. **Review auto-fixes**: Check INCONSISTENCIES.md to ensure fixes are correct
2. **Fix critical issues immediately**: Don't proceed with security problems
3. **Accept warnings strategically**: Warnings are okay for teaching, critical issues are not
4. **Use the loop**: If unsure, try fixing and re-running (you have 3 attempts)

### After Verification

1. **Review the report**: Read INCONSISTENCIES.md thoroughly
2. **Fix mismatches thoughtfully**: Decide if they're outdated or intentionally simplified
3. **Improve incrementally**: Don't need to fix everything at once
4. **Update over time**: Run `/update-context` to re-verify after changes

## Manual Verification

While verification runs automatically, you can manually verify context-training files:

### Read the report
```bash
cat devorch/context-training/your-name/INCONSISTENCIES.md
```

### Re-run verification
```bash
# After manual fixes, run update-context to re-verify
devorch update-context

# Select "No" for PR ingestion
# Verification will still run on existing files
```

### Check specific patterns
```bash
# Use grep to find patterns in your context-training
grep -r "pattern-name" devorch/context-training/your-name/

# Verify against codebase
grep -r "actual-function" src/
```

## FAQ

### Q: What if my codebase has multiple implementations of the same pattern?

**A:** The verifier accepts patterns that match at least one implementation in your codebase. If your project uses both styled-components and emotion, for example, both patterns can coexist in context-training.

### Q: Can I skip verification?

**A:** Verification runs automatically and is recommended for accuracy. If you need to skip it temporarily, you can abort at the first decision point. However, using unverified context-training may lead to incorrect guidance.

### Q: How do I know if an issue is critical vs warning?

**A:** The report clearly marks severity:
- ❌ **Critical**: Security issues, major anti-patterns, wrong paths (must fix)
- ⚠️ **Warning**: Recommendations, minor issues (nice to fix)
- ✅ **Accepted**: Fictional examples, valid patterns (no action needed)

### Q: What's the difference between "mismatch" and "critical issue"?

**A:**
- **Critical issue**: Path/signature is wrong and can be auto-fixed with confidence
- **Mismatch**: Implementation differs, could be outdated or intentional (needs user review)

### Q: How long does verification take?

**A:** Typically 30-60 seconds per iteration, depending on context-training size and number of files to check. Quality checking adds another 20-30 seconds.

### Q: Can verification break my context-training files?

**A:** No. Verification only makes targeted changes (import paths, signatures). It preserves all pattern content and markdown formatting. All changes are documented in INCONSISTENCIES.md for review.

### Q: What if I disagree with a quality finding?

**A:** Quality findings are recommendations based on general best practices. Your project may have different standards. You can:
1. Accept the warning and proceed
2. Adjust your quality standards in future pattern reviews
3. Add context/comments to explain the pattern's purpose

## Related Documentation

- [Context Training Guide](../README.md#context-training) - Overview of context training
- [/train-context command](../templates/context-training/train-context/) - Generate new context training
- [/update-context command](../templates/context-training/update-context/) - Update existing context training
- [Contributing](../CONTRIBUTING.md) - How to improve verification

## Feedback

Found an issue or have suggestions for improving verification?
- Report issues: https://github.com/anthropics/devorch/issues
- Discuss improvements: https://github.com/anthropics/devorch/discussions

## Reference

This verification system is based on agent-smith PR #8: https://github.com/rodrigoluizs/agent-smith/pull/8
