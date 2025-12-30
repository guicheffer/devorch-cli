# Backend PHP API - Specification Guidance

**Status:** 🟢 PRs fetched, ready for pattern analysis

## Overview

**Reference Repository:** yourcompany/api-v2
**PRs Fetched:** 50 (ready for analysis)
**Repository Type:** Legacy PHP monolith (9.1M lines)

## Important Note

api-v2 is a **legacy monolith**. When analyzing patterns, consider:
- Filtering PRs by labels like "refactoring" or "modernization"
- Extracting **current best practices** rather than legacy patterns
- Looking for recent architectural improvements

## Expected Domains

Based on typical PHP/Laravel patterns:
- MVC structure and routing
- Eloquent ORM patterns
- Service layer architecture
- API resources/controllers
- Middleware and request handling
- Testing with PHPUnit
- Dependency injection
- Queue/job processing
- Database migrations
- Configuration management

## Next Steps

1. Run pr-pattern-analyzer:
   ```bash
   Task subagent_type=context-training/pr-pattern-analyzer
     prompt="Analyze yourcompany/api-v2 PRs from /tmp/artifacts/pr-fetcher-php/final_prs.json"
   ```

2. Review extracted patterns
3. Generate implementer files
4. Add PHP-specific examples

## PR Data Location

- Raw PRs: `/tmp/artifacts/pr-fetcher-php/raw_prs.json`
- Filtered PRs: `/tmp/artifacts/pr-fetcher-php/final_prs.json` (50 PRs ready)
