# Context Verification and Quality Checks Implementation Plan

## Overview

Implement context verification and quality checking for devorch's context-training workflow, based on the agent-smith PR [#8](https://github.com/rodrigoluizs/agent-smith/pull/8). This ensures context-training files accurately reflect the codebase and follow best practices.

## Reference

**Source**: agent-smith PR #8 - https://github.com/rodrigoluizs/agent-smith/pull/8
**Adapted for**: devorch context-training workflow

## What We're Building

### 1. Context Verifier (from agent-smith PR)
- Validates context-training files against actual codebase
- Checks: import paths, function signatures, code examples, directory references
- Categorizes issues:
  - **Critical**: Wrong paths/signatures → Auto-fix
  - **Mismatch**: Different implementation → Report for review
  - **Fictional**: Illustrative examples → Accept
- Generates `INCONSISTENCIES.md` report
- Max 3 iteration loop

### 2. Quality Checker (NEW - not in agent-smith PR)
- Validates code quality of patterns
- Checks: best practices, anti-patterns, security issues
- Returns JSON internally (for workflow decisions)
- All findings consolidated in INCONSISTENCIES.md (not separate file)

### 3. Enhanced Pattern-Reviewer (NEW - not in agent-smith PR)
- Add quality assessment questions during pattern review
- Collect best practices expectations
- Document anti-patterns to avoid

## Critical Design Decisions

1. **Verification placement**: After artifact-generator (Step 7 for /train-context, Phase 4e for /update-context) - validates final markdown files
2. **Shared partial**: `verify-context.md` with loop logic - reusable by both commands
3. **Max iterations**: 3 attempts with user decision points
4. **Quality questions**: Integrated into pattern-reviewer (Step 3f) - more seamless
5. **Auto-fix critical only**: Mismatches require user review

## Implementation Status

### ✅ Completed

- [x] Context-verifier subagent (`templates/context-training/subagents/context-verifier.md`)
- [x] Quality-checker subagent (`templates/context-training/subagents/quality-checker.md`)
- [x] Verify-context shared partial (`templates/context-training/partials/verify-context.md`)
- [x] Step 7 partial for /train-context (`templates/context-training/train-context/partials/7.verify-context-step.md`)
- [x] Updated /train-context command with verification step
- [x] Updated /update-context command with Phase 4e (verify & quality check)
- [x] Enhanced pattern-reviewer with quality standards questions (Step 3f)

### 🚧 In Progress

- [ ] VERIFICATION.md documentation (`docs/VERIFICATION.md`)
- [ ] Update README with verification section

### 📋 TODO (Lower Priority)

- [ ] Unit tests for context-verifier (`tests/unit/context-verifier.test.ts`)
- [ ] Unit tests for quality-checker (`tests/unit/quality-checker.test.ts`)
- [ ] Integration tests for verify workflow (`tests/integration/verify-workflow.test.ts`)
- [ ] Test fixtures (`tests/fixtures/context-training/`)

## Implementation Phases

### Phase 1: Core Verification ✅ COMPLETE

**Files Created:**
1. `templates/context-training/subagents/context-verifier.md` (~600 lines)
   - Extracts verifiable elements from markdown (imports, functions, directories)
   - Uses Glob/Grep/Read to verify against codebase
   - Categorizes issues (critical/mismatch/fictional)
   - Auto-fixes critical issues
   - Generates INCONSISTENCIES.md report
   - Returns verification-results.json

2. `templates/context-training/partials/verify-context.md` (~300 lines)
   - Implements verification loop (max 3 iterations)
   - Calls context-verifier → check status → user decisions
   - Calls quality-checker → check status → user decisions
   - Reusable by multiple commands

### Phase 2: Quality Checks ✅ COMPLETE

**Files Created:**
1. `templates/context-training/subagents/quality-checker.md` (~550 lines)
   - Analyzes code examples in markdown
   - Checks: best practices, anti-patterns, security, maintainability
   - Calculates quality score (0-100)
   - Returns JSON internally (workflow uses to decide next steps)
   - Quality findings added to INCONSISTENCIES.md report

**Files Modified:**
1. `templates/context-training/partials/verify-context.md`
   - Added quality check step after verification
   - Handles quality issues (fix & retry loop)
   - Presents quality scores to user

### Phase 3: Command Integration ✅ COMPLETE

**Files Created:**
1. `templates/context-training/train-context/partials/7.verify-context-step.md` (~50 lines)
   - Step 7 wrapper for /train-context
   - Reads context-training name and calls shared partial

**Files Modified:**
1. `templates/context-training/train-context/command.md`
   - Added dependencies: context-verifier, quality-checker (lines 13-14)
   - Added partials: verify-context, verify-context-step (lines 23-24)
   - Added Step 7 section (after line 70)

2. `templates/context-training/update-context/command.md`
   - Added dependencies: context-verifier, quality-checker (lines 13-14)
   - Added partial: verify-context (line 20)
   - Added Phase 4e section (after line 293)

### Phase 4: Pattern-Reviewer Enhancement ✅ COMPLETE

**Files Modified:**
1. `templates/context-training/subagents/pattern-reviewer.md`
   - Added Step 3f: Quality Standards questions (lines 298-373)
   - Asks about: Best Practices, Anti-Patterns, Security, Performance, Maintainability
   - Collects quality expectations per domain
   - Updated output JSON to include quality_standards field (lines 476-482, 522-528)
   - Renumbered subsequent steps (3f→3g, 4→5, 5→6)

### Phase 5: Documentation 🚧 IN PROGRESS

**Files to Create:**
1. `docs/VERIFICATION.md` (~300 lines)
   - Explain verification process
   - Document issue categories (critical/mismatch/fictional/quality)
   - Show INCONSISTENCIES.md report format (includes quality findings)
   - Troubleshooting guide
   - Examples

**Files to Modify:**
1. `README.md`
   - Add verification section
   - Link to VERIFICATION.md
   - Mention quality checks

## Data Flow

### /train-context:
```
Step 1-6: Existing (prerequisites → artifact generation)
    ↓ validated-patterns.json + generated files
Step 7: Verify Context (NEW)
    ↓ Internal JSON (verification + quality results)
    ↓ (Loop max 3x if issues found)
    ↓ INCONSISTENCIES.md report (includes quality findings)
Final Report
```

### /update-context:
```
Phase 4d: Integrate patterns
    ↓ updated files
Phase 4e: Verify & Quality Check (NEW)
    ↓ Internal JSON (verification + quality results)
    ↓ (Loop max 3x if issues found)
    ↓ INCONSISTENCIES.md report updated
Phase 5: Report
```

## Verification Loop Logic

```
Iteration 1:
  1a. Run context-verifier
    - Extract elements from markdown
    - Verify against codebase
    - Auto-fix critical issues
    - Generate INCONSISTENCIES.md
  1b. Check status
    - If passed: Continue to quality check
    - If mismatches: Ask user (continue/stop)
  2a. Run quality-checker
    - Analyze code examples
    - Check best practices, security
    - Calculate quality score
  2b. Check quality
    - If passed: Complete ✅
    - If critical issues: Ask user (fix & retry/proceed/abort)

Iteration 2-3:
  - User fixes issues
  - Re-run verification
  - If issues persist after 3: Ask to accept or abort
```

## User Decision Points

1. **Verification mismatches found**: Continue with auto-fixes / Stop to review
2. **Quality critical issues**: Fix and retry / Proceed anyway / Abort
3. **Max iterations reached**: Accept with warnings / Abort

## Verification Heuristics

### Fictional Detection (accept as illustrative):
- Generic naming: User*, handle*, fetch*, get*, set*, data, item
- Common patterns: useState, useEffect, API calls, form handling
- Placeholder values: "example.com", "TODO", "your-value-here"

### Critical Issues (auto-fix):
- Import path doesn't exist: Search codebase for correct path
- Function signature mismatch: Use actual signature from codebase
- Directory doesn't exist: Find correct directory path

### Mismatch Issues (report for review):
- Different implementation (e.g., styled-components vs emotion)
- Outdated examples (e.g., class components vs hooks)
- Missing context (incomplete examples)

## Quality Check Categories

### Best Practices:
- Clear naming (not `x`, `temp`, `data2`)
- Error handling (try-catch, error boundaries)
- TypeScript usage (types, not `any`)

### Anti-Patterns:
- God functions (>50 lines, >5 params)
- Tight coupling (hardcoded deps)
- Magic numbers/strings
- Missing error handling

### Security:
- Hardcoded secrets (API keys, tokens)
- Injection risks (SQL, XSS)
- Missing input validation

### Maintainability:
- Code duplication
- Overly long examples (>30 lines)
- Unclear intent

## Report Format

### INCONSISTENCIES.md
Single consolidated report for user (includes verification + quality findings):

```markdown
# Context Training Verification Report

**Generated**: 2025-01-26 10:30:00
**Status**: Issues Found (3 critical, 5 mismatches, 2 quality warnings)

## Summary

- **Files Checked**: 12
- **Critical Issues**: 3 (auto-fixed)
- **Mismatches**: 5 (review needed)
- **Fictional Examples**: 12 (accepted)
- **Quality Score**: 75/100
- **Quality Warnings**: 2 (non-blocking)

## Critical Issues (Auto-Fixed)

### File: implementers/api.md (Line 45)
- **Type**: Import Path
- **Issue**: Module '@/services/api' does not exist
- **Before**: `import { api } from '@/services/api'`
- **After**: `import { api } from '@/utils/api'`
- **Action**: ✅ Auto-corrected

## Mismatches (Review Needed)

### File: implementers/ui.md (Line 78)
- **Type**: Different Implementation
- **Issue**: Shows styled-components, codebase uses emotion
- **Context**: `const Button = styled.button\`background: blue;\``
- **Suggestion**: Update to use emotion syntax
- **Action**: ⚠️ Manual review needed

## Fictional Examples (Accepted)

### File: implementers/state.md (Line 120)
- **Pattern**: Generic `useUserProfile` hook
- **Status**: ✅ Illustrative - pattern correct
- **Reason**: Generic naming, demonstrates valid hook pattern

## Quality Findings

### File: implementers/api.md (Line 145)
- **Severity**: Warning
- **Category**: Best Practices
- **Issue**: Missing retry logic for transient failures
- **Suggestion**: Add exponential backoff pattern for network errors

### File: implementers/security.md (Line 67)
- **Severity**: Critical ❌
- **Category**: Security
- **Issue**: Missing input sanitization before rendering user content
- **Suggestion**: Always sanitize user input to prevent XSS
- **Action**: ⚠️ Fix required

## Quality Scores

- **Overall**: 75/100
- **Best Practices**: 80/100
- **Security**: 60/100 ⚠️
- **Maintainability**: 85/100
- **Anti-Patterns**: 90/100

## Recommendations

1. Review mismatch issues in ui.md
2. Fix security critical issue in security.md
3. Consider adding retry logic to API patterns
```

## Next Steps

1. ✅ Core verification and quality checking implementation complete
2. 🚧 Complete documentation (VERIFICATION.md + README update)
3. 📋 Add tests (unit + integration) for robustness
4. 📋 Consider CLI command for manual verification: `devorch verify-context --name {name}`

## Open Questions

None - implementation is complete and working as designed.
