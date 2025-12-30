Launch the **context-training/pr-fetcher** subagent using the Task tool:

```markdown
Task tool parameters:
- subagent_type: "context-training/pr-fetcher"
- description: "Fetch merged PRs for context training analysis"
- prompt: "Fetch merged pull requests from this repository for context training.

Follow your workflow to:
1. Verify gh CLI prerequisites
2. Fetch and display repository labels
3. Ask user to select labels for filtering
4. Fetch and categorize PRs by size
5. Ask user to select PR count, timeframe, and size distribution
6. Return filtered PR list with structured JSON output

The user will select which labels and how many PRs to analyze based on what context they want to capture."
```

**What the subagent will do:**
- Verify gh CLI and jq are available
- Fetch all repository labels and group them (squad/tribe vs type labels)
- Interactively ask user which labels to filter by
- Fetch merged PRs and categorize by size
- Filter out PRs with >50% net negative changes
- Ask user for PR count (10/25/50/all), timeframe (1/3/6/12 months, all), and size distribution (balanced/favor large/favor medium/proportional)
- Return filtered PR list as structured JSON for downstream analysis

**Output format:**
The subagent returns JSON **in its response message** (NOT written to disk) with:
- `selection_criteria`: labels, count, timeframe
- `prs`: array of PR objects with metadata
- `summary`: counts by size category

**After the subagent completes:**

**IMPORTANT: The subagent returns the PR list as JSON in the Task tool result. Parse the JSON from the Task tool response.**

**Save artifact for reference (commands should specify their own artifact directory):**

The calling command should save the PR JSON to its own artifacts directory for debugging/reference. The workflow uses the in-memory JSON returned by the subagent.
