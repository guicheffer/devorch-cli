---
schema: command-multi-agent
name: /analyze-tech-stack
description: Analyze project dependencies and generate/update shared tech-stack.md
mode: multi-agent
dependencies:
  subagents:
    - analysis/dependency-scanner
    - analysis/tech-stack-analyzer
    - analysis/tech-stack-merger
partials:
  setup: common/partials/commands/command-setup.md
  detect-dependencies: analysis/analyze-tech-stack/partials/1-detect-project-dependencies.md
  analyze-tech: analysis/analyze-tech-stack/partials/2-analyze-tech-stack.md
  merge-tech-stack: analysis/analyze-tech-stack/partials/3-merge-tech-stack.md
---

# Analyze Tech Stack (Multi-Agent Orchestrator)

You are the orchestrator for tech stack analysis. You will coordinate three specialized subagents to efficiently analyze the project's dependencies and generate or update `devorch/tech-stack.md`.

{{partials.setup}}

---

## Overview

This command uses a multi-agent approach for context window efficiency:
1. **dependency-scanner**: Scans filesystem for dependency and config files
2. **tech-stack-analyzer**: Parses files and categorizes technologies
3. **tech-stack-merger**: Intelligently merges with existing tech-stack.md

## Workflow

### Phase 1: Scan for Dependencies

Launch the **dependency-scanner** subagent using the Task tool:

```
Task tool parameters:
- subagent_type: "analysis/dependency-scanner"
- description: "Scan project for dependency files"
- prompt: "{{partials.detect-dependencies}}"
```

**What the subagent will do:**
- Search for dependency manifests (package.json, go.mod, requirements.txt, etc.)
- Search for infrastructure configs (Dockerfile, docker-compose.yml, k8s)
- Search for framework/tool configs (next.config.js, tsconfig.json, etc.)
- Return list of detected files with their contents

**Wait for subagent completion**

---

**WHEN NO DEPENDENCIES FOUND**: Stop here, we don't need to analyze tech stack further. **REPORT** to the user what you find, but especially did not find.
**IF DEPENDENCIES FOUND**: Proceed to Phase 2.

### Phase 2: Analyze Technologies

Launch the **tech-stack-analyzer** subagent using the Task tool:

```
Task tool parameters:
- subagent_type: "analysis/tech-stack-analyzer"
- description: "Analyze and categorize detected technologies"
- prompt: "
{{partials.analyze-tech}}

Here are the detected files from the dependency-scanner:
[Include the full output from Phase 1]
"
```

**What the subagent will do:**
- Parse each detected dependency file
- Extract technology names and versions
- Categorize into Frontend, Backend, Infrastructure, etc.
- Infer technologies from configs
- Return structured tech stack analysis

**Wait for subagent completion**, then proceed to Phase 3.

### Phase 3: Merge and Generate

Launch the **tech-stack-merger** subagent using the Task tool:

```
Task tool parameters:
- subagent_type: "analysis/tech-stack-merger"
- description: "Merge detected tech with existing tech-stack.md"
- prompt: "
{{partials.merge-tech-stack}}

Here is the analyzed tech stack:
[Include the full output from Phase 2]

File location: devorch/tech-stack.md
"
```

**What the subagent will do:**
- Check if devorch/tech-stack.md exists
- If exists: Parse existing content, compare with detected tech
- Intelligently merge: preserve rationale, add new tech, flag discrepancies
- If not exists: Generate new file from detected tech
- Write the final tech-stack.md file
- Return summary of changes

**Wait for subagent completion**, then proceed to Final Steps.

## Coordination Notes

### Data Flow Between Subagents

```
dependency-scanner → [file list + contents]
                  ↓
tech-stack-analyzer → [categorized tech with versions]
                    ↓
tech-stack-merger → [final tech-stack.md file]
```

### Context Efficiency Benefits

**Single-Agent Approach:**
- All logic loaded: ~3000+ tokens
- All detection + parsing + merging in one context

**Multi-Agent Approach:**
- dependency-scanner: ~800 tokens (scanning logic only)
- tech-stack-analyzer: ~900 tokens (parsing logic only)
- tech-stack-merger: ~700 tokens (merge logic only)
- **Total: ~2400 tokens + parallel potential**

### Error Handling Between Phases

**If Phase 1 (scanner) finds no files:**
- Do NOT proceed to Phase 2
- Inform user: "No dependency files detected. See error handling below."

**If Phase 2 (analyzer) fails to parse files:**
- Log the error
- Proceed to Phase 3 with partial results
- Note parsing failures in final summary

**If Phase 3 (merger) fails:**
- Provide error details to user
- Suggest manual creation of tech-stack.md

## Final Steps

After all subagents complete, synthesize the results and inform the user:

```markdown
✅ Tech stack analysis complete!

**File:** devorch/tech-stack.md

**Phase Results:**
- **Scanning**: [X] dependency files, [Y] config files detected
- **Analysis**: [Z] technologies identified across [N] categories
- **Merge**: File successfully updated

**Summary:**
- New technologies added: [list]
- Version updates: [list]
- Flagged for review: [list]

📝 **Next steps:**
- Review devorch/tech-stack.md
- Add rationale for key technology choices
- Your rationale will be preserved during future updates
```

## Parallelization Opportunities

**Current implementation:** Sequential (Phase 1 → 2 → 3)

**Future optimization potential:**
- If project has multiple directories (frontend/, backend/), scanner could parallelize
- Multiple parsers could run in parallel (package.json parser + go.mod parser simultaneously)

**Current sequential approach is chosen for:**
- Simpler orchestration logic
- Clear data dependencies (each phase needs previous output)
- Sufficient performance for most projects

## Error Handling

**If no dependency files are found:**
```
⚠️ No dependency files detected in this project.

The dependency-scanner subagent searched for:
- JavaScript/TypeScript: package.json
- Python: requirements.txt, pyproject.toml
- Go: go.mod
- [etc.]

Possible reasons:
- New project without dependencies yet
- Unsupported project type
- Unusual project structure

Would you like to create a basic tech-stack.md manually?
```

**If devorch/ directory doesn't exist:**
```
❌ Error: devorch/ directory not found.

The tech-stack.md file should be created at: devorch/tech-stack.md

Please initialize devorch first:
- Run `/plan-product` to create a product
- Or create devorch/ directory manually
```

**If a subagent fails:**
```
❌ Subagent failure in Phase [N]: [subagent name]

Error: [error message]

Recovery options:
- Try running the command again
- Check file permissions for the subagent
- Report issue if error persists
```

## Success Criteria

- ✅ All three subagents complete successfully
- ✅ All relevant dependency files detected and parsed
- ✅ Technologies correctly categorized
- ✅ Version information extracted when available
- ✅ Existing rationale preserved (if file already exists)
- ✅ New technologies clearly marked
- ✅ Discrepancies flagged for review
- ✅ File is well-formatted and human-readable
- ✅ User receives clear summary and next steps
