## Context Verification and Quality Check Loop

This partial implements verification and quality checking with a maximum of 3 iterations. It can be called after context-training artifacts are generated or updated.

**Input expected:**
- `context_training_name`: The name of the context training to verify (e.g., "mobile-app")

**Output:**
- INCONSISTENCIES.md report (if issues found)
- Verification and quality status
- List of issues found and fixed

---

### Verification Loop (Max 3 Iterations)

```markdown
# Initialize verification state
ITERATION=1
MAX_ITERATIONS=3
VERIFICATION_PASSED=false
QUALITY_PASSED=false
```

**Iteration {ITERATION} of {MAX_ITERATIONS}**

#### Step 1: Run Context Verifier

Launch the **context-training/context-verifier** subagent using the Task tool:

```markdown
Task tool parameters:
- subagent_type: "context-training/context-verifier"
- description: "Verify context-training files against codebase"
- prompt: "Verify the context-training files for '{context_training_name}' against the actual codebase.

Context training directory: devorch/context-training/{context_training_name}/

Follow your workflow to:
1. Discover all markdown files in the context-training directory
2. Extract verifiable elements (imports, functions, directories, file references)
3. Distinguish between specific references and fictional/illustrative examples
4. Verify specific references against the codebase using Glob/Grep/Read
5. Categorize issues as:
   - CRITICAL: Wrong paths/signatures (auto-fix these)
   - MISMATCH: Different implementation (flag for review)
   - FICTIONAL: Generic/illustrative examples (accept as valid)
6. Auto-fix all critical issues with high confidence
7. Generate INCONSISTENCIES.md report with all findings
8. Return verification-results.json with status and details

This is iteration {ITERATION} of {MAX_ITERATIONS}.

Return the verification status and summary."
```

**What the subagent will do:**
- Parse all markdown files in the context-training directory
- Extract code examples and identify verifiable elements
- Use Glob/Grep/Read to verify against codebase
- Auto-fix critical issues (wrong paths, incorrect signatures)
- Categorize mismatches and fictional examples
- Generate detailed INCONSISTENCIES.md report
- Return verification results as JSON

**After the subagent completes:**

Parse the verification results from the Task tool response. The subagent returns JSON with:

```json
{
  "verification_status": "PASSED | ISSUES_FOUND | CRITICAL_ERRORS",
  "iteration": 1,
  "summary": {
    "files_checked": 12,
    "verifiable_elements": 156,
    "critical_issues": 3,
    "critical_auto_fixed": 3,
    "mismatches": 5,
    "fictional_accepted": 42,
    "total_issues": 8
  },
  "report_path": "devorch/context-training/{context-training-name}/INCONSISTENCIES.md"
}
```

#### Step 2: Check Verification Status

**If verification_status === "PASSED":**
- ✅ All verifiable elements are accurate
- Continue to quality checks (Step 3)

**If verification_status === "ISSUES_FOUND":**
- Critical issues were auto-fixed
- Mismatches were flagged for review

**Present results to user:**

```
Verification Complete (Iteration {ITERATION})

Status: {emoji} {status_text}

Files Checked: {count}
Critical Issues: {count} (auto-fixed)
Mismatches: {count} (review needed)
Fictional Examples: {count} (accepted)

Report: devorch/context-training/{context-training-name}/INCONSISTENCIES.md
```

**If mismatches found, ask user:**

Use AskUserQuestion tool:

```json
{
  "questions": [
    {
      "question": "Verification found {count} mismatches that need review. How would you like to proceed?",
      "header": "Mismatches",
      "multiSelect": false,
      "options": [
        {
          "label": "Review and fix manually",
          "description": "Stop here so I can review INCONSISTENCIES.md and fix issues myself, then re-run verification"
        },
        {
          "label": "Continue with quality checks",
          "description": "Proceed to quality checking. I'll review mismatches later before final use"
        },
        {
          "label": "Abort verification",
          "description": "Stop verification process. Context training may have accuracy issues"
        }
      ]
    }
  ]
}
```

**Based on user response:**

- **"Review and fix manually"**: Stop here, instruct user to:
  1. Review INCONSISTENCIES.md
  2. Fix issues in markdown files
  3. Re-run verification or continue the workflow

- **"Continue with quality checks"**: Proceed to Step 3

- **"Abort verification"**: Exit with warning that context training has unresolved issues

**If verification_status === "CRITICAL_ERRORS":**
- Major issues that couldn't be auto-fixed
- Stop and ask user to review

#### Step 3: Run Quality Checker

Launch the **context-training/quality-checker** subagent using the Task tool:

```markdown
Task tool parameters:
- subagent_type: "context-training/quality-checker"
- description: "Check code quality in context-training files"
- prompt: "Analyze code quality in context-training files for '{context_training_name}'.

Context training directory: devorch/context-training/{context_training_name}/

Follow your workflow to:
1. Read all markdown files with code examples
2. Analyze code examples for:
   - Best practices (clear naming, error handling, TypeScript usage)
   - Anti-patterns (god functions, tight coupling, magic numbers)
   - Security issues (hardcoded secrets, injection risks, missing validation)
   - Maintainability (code duplication, unclear intent, overly long examples)
3. Calculate quality scores (0-100) per category
4. Identify critical issues that should be fixed
5. Identify warnings that are recommendations
6. Add findings to INCONSISTENCIES.md report
7. Return quality-results.json

This is iteration {ITERATION} of {MAX_ITERATIONS}.

Return the quality status and scores."
```

**What the subagent will do:**
- Parse code examples in all markdown files
- Check against quality criteria
- Calculate quality scores
- Identify critical vs warning issues
- Update INCONSISTENCIES.md with quality findings
- Return quality results as JSON

**After the subagent completes:**

Parse the quality results from the Task tool response. The subagent returns JSON with:

```json
{
  "quality_status": "PASSED | WARNINGS | CRITICAL_ISSUES",
  "iteration": 1,
  "scores": {
    "overall": 75,
    "best_practices": 80,
    "security": 60,
    "maintainability": 85,
    "anti_patterns": 90
  },
  "summary": {
    "critical_issues": 1,
    "warnings": 3,
    "files_with_issues": 2
  },
  "report_updated": true
}
```

#### Step 4: Check Quality Status

**If quality_status === "PASSED":**
- ✅ All quality checks passed
- No critical issues or warnings
- **Verification complete successfully**
- Exit loop

**If quality_status === "WARNINGS":**
- Quality scores are acceptable but some improvements recommended
- No blocking issues

**Present results to user:**

```
Quality Check Complete (Iteration {ITERATION})

Overall Score: {score}/100

Best Practices: {score}/100
Security: {score}/100
Maintainability: {score}/100
Anti-Patterns: {score}/100

Critical Issues: {count}
Warnings: {count}

Updated Report: devorch/context-training/{context-training-name}/INCONSISTENCIES.md
```

**If warnings only (no critical issues):**

Use AskUserQuestion tool:

```json
{
  "questions": [
    {
      "question": "Quality check found {count} warnings (no critical issues). How would you like to proceed?",
      "header": "Quality",
      "multiSelect": false,
      "options": [
        {
          "label": "Accept with warnings",
          "description": "Proceed with context training. Warnings are recommendations, not blockers"
        },
        {
          "label": "Fix and retry",
          "description": "Let me fix the warnings and re-run quality check"
        }
      ]
    }
  ]
}
```

**Based on user response:**
- **"Accept with warnings"**: Complete successfully with warnings noted
- **"Fix and retry"**: Increment iteration, fix issues, loop back if under max iterations

**If quality_status === "CRITICAL_ISSUES":**
- Critical quality issues found (security, major anti-patterns)
- Must be addressed

**Present critical issues to user:**

```
⚠️ Critical Quality Issues Found

{List critical issues with file/line references}

These issues should be fixed before using this context training.
```

Use AskUserQuestion tool:

```json
{
  "questions": [
    {
      "question": "Critical quality issues were found. How would you like to proceed?",
      "header": "Critical",
      "multiSelect": false,
      "options": [
        {
          "label": "Fix and retry (Recommended)",
          "description": "Fix critical issues and re-run verification (iteration {next_iteration}/{max_iterations})"
        },
        {
          "label": "Proceed anyway",
          "description": "Accept context training with critical issues. Not recommended for production use"
        },
        {
          "label": "Abort",
          "description": "Stop here. I'll fix issues manually"
        }
      ]
    }
  ]
}
```

**Based on user response:**

- **"Fix and retry"**:
  - Increment `ITERATION`
  - If `ITERATION <= MAX_ITERATIONS`: Loop back to Step 1
  - If `ITERATION > MAX_ITERATIONS`: Go to Step 5 (Max Iterations Reached)

- **"Proceed anyway"**:
  - Complete with critical warnings
  - Document that critical issues exist
  - Not recommended for production

- **"Abort"**:
  - Exit verification
  - Provide guidance on fixing issues

#### Step 5: Max Iterations Reached

If `ITERATION > MAX_ITERATIONS` and issues still exist:

```
⚠️ Maximum Verification Iterations Reached

After {MAX_ITERATIONS} attempts, some issues remain:

Verification Status: {status}
Quality Status: {status}

Report: devorch/context-training/{context-training-name}/INCONSISTENCIES.md
```

Use AskUserQuestion tool:

```json
{
  "questions": [
    {
      "question": "Maximum iterations reached with unresolved issues. How would you like to proceed?",
      "header": "Max Reached",
      "multiSelect": false,
      "options": [
        {
          "label": "Accept with warnings",
          "description": "Use context training as-is. I understand there may be accuracy or quality issues"
        },
        {
          "label": "Abort and fix manually",
          "description": "Stop here. I'll review INCONSISTENCIES.md and fix issues myself"
        }
      ]
    }
  ]
}
```

**Based on user response:**
- **"Accept with warnings"**: Complete with documented issues
- **"Abort and fix manually"**: Exit with instructions

---

### Verification Complete

**If all checks passed:**

```
✅ Verification and Quality Checks Passed

Context training files are accurate and high quality.

Location: devorch/context-training/{context_training_name}/
Status: Ready to use

No issues found.
```

**If completed with warnings:**

```
✅ Verification Complete (with warnings)

Context training files have been verified.

Location: devorch/context-training/{context_training_name}/
Report: INCONSISTENCIES.md

{X} warnings noted - see report for details.
These are recommendations, not blocking issues.
```

**If completed with critical issues accepted:**

```
⚠️ Verification Complete (with critical issues)

Context training files have critical issues:
- {issue 1}
- {issue 2}

Location: devorch/context-training/{context_training_name}/
Report: INCONSISTENCIES.md

⚠️ Not recommended for production use until issues are resolved.
```

---

### Next Steps After Verification

Based on the verification outcome, provide appropriate next steps:

**If passed without issues:**
1. Context training is ready to use
2. Configure in devorch/config.local.yml (if not already configured):
   ```yaml
   profile:
     context_training: {context_training_name}
   ```
3. Run `devorch install` to activate
4. Test with spec or implementation commands

**If completed with warnings:**
1. Review INCONSISTENCIES.md for recommendations
2. Optionally improve patterns based on warnings
3. Context training is still usable as-is
4. Configure and activate as above

**If completed with critical issues:**
1. **Do not use in production** until issues are fixed
2. Review INCONSISTENCIES.md for critical issues
3. Fix security issues and major anti-patterns
4. Re-run verification after fixes
5. Only activate after critical issues are resolved
