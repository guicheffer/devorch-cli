# Data Pipeline Airflow - Specification Guidance

**Status:** 🟢 PRs fetched, ready for pattern analysis

## Overview

**Reference Repository:** yourcompany/bdpi-snowplow-analytics
**PRs Fetched:** 50 (ready for analysis)
**Repository Type:** Airflow data pipelines

## Expected Domains

Based on typical Airflow patterns:
- DAG definition and structure
- Task dependencies and operators
- Data validation patterns
- Error handling and retries
- XCom for data passing
- Connections and variables
- Scheduling and triggers
- Testing DAGs
- Data quality checks
- Python utilities and helpers

## Next Steps

1. Run pr-pattern-analyzer:
   ```bash
   Task subagent_type=context-training/pr-pattern-analyzer
     prompt="Analyze yourcompany/bdpi-snowplow-analytics PRs from /tmp/artifacts/pr-fetcher-airflow/final_prs.json"
   ```

2. Review extracted patterns
3. Generate implementer files
4. Add Airflow-specific examples

## PR Data Location

- Raw PRs: `/tmp/artifacts/pr-fetcher-airflow/raw_prs.json`
- Filtered PRs: `/tmp/artifacts/pr-fetcher-airflow/final_prs.json` (50 PRs ready)
