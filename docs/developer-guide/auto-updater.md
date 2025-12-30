# Auto-Updater System

> **⚠️ DEPRECATED DOCUMENTATION**
>
> This document describes an outdated implementation of the auto-updater system. The actual implementation has been refactored and uses a different approach.
>
> **Current Implementation:**
> - Auto-update configurations are stored in `.updater/` directories within individual skill templates
> - Example: `templates/skills/ui-design-system-web/zest-components/.updater/`
> - Workflow: `.github/workflows/auto-update-skills.yml`
> - Matrix generation: `.github/scripts/generate-update-matrix.ts`
>
> **For current implementation details, see:**
> - [Auto-Update Skills Workflow](../../.github/workflows/auto-update-skills.yml)
> - [Generate Update Matrix Script](../../.github/scripts/generate-update-matrix.ts)
> - Example skill with auto-update: `templates/skills/ui-design-system-web/zest-components/`

---

## Historical Documentation

The following documentation describes the original planned implementation, which was later refactored. It is kept for historical reference only.

### Original Concept: Repository Tracking Configuration

Templates could declare which repositories they track using frontmatter:

```yaml
---
name: zustand-patterns
description: Zustand store patterns

tracked_repositories:
  - url: yourcompany/shared-mobile-modules
    type: internal
    paths: ["/src/**/*Store.ts"]
    last_synced: "2025-01-30T12:00:00Z"
    sync_frequency: weekly
---
```

### Original Architecture

The original design included:
- `src/updater/generate-update-matrix.ts` - Scan templates for tracked repositories
- `src/updater/git-tracker.ts` - Handle repository interaction
- `src/updater/content-updater.ts` - Update template content
- `.github/workflows/sync-tracked-repositories.yml` - Orchestration workflow

**Note:** This architecture was never fully implemented. The system was refactored to use per-skill `.updater/` directories before completion.

### Why It Changed

The refactored implementation (commit #129, #175) simplified the system by:
- Moving configuration closer to skills (`.updater/` directories)
- Removing centralized tracking in frontmatter
- Simplifying the update workflow
- Making updates more granular (per-skill rather than global)

---

**For current auto-update documentation, refer to:**
- `.github/workflows/auto-update-skills.yml` - Current workflow implementation
- `.github/scripts/generate-update-matrix.ts` - Matrix generation logic
- Template examples with `.updater/` directories in `templates/skills/`
