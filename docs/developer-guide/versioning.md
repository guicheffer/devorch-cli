# Versioning System

devorch uses semantic versioning (semver) with independent tracking of CLI and template versions.

## Version Types

| Type | Source | Values | Purpose |
|------|--------|--------|---------|
| **CLI Version** | `BUILD_VERSION` env var | `vX.Y.Z` or `dev` | Compiled binary version |
| **Template Version** | State file (`templateVersion`) | `vX.Y.Z` or `local` | Installed templates version |

### Special Values

- **`dev`** - CLI running without `BUILD_VERSION` (local development via `bun run dev`)
- **`local`** - Templates installed from local path (`--local` flag)

## Automatic Version Bumping

Releases are triggered automatically when PRs merge to `master`. The bump type is determined by:

### 1. PR Labels (Highest Priority)

| Label | Bump | Use Case |
|-------|------|----------|
| `semver:major` | Major | Breaking changes |
| `semver:minor` | Minor | New features |
| `semver:patch` | Patch | Bug fixes |
| `semver:skip` | Skip | No release needed |

### 2. Changed Files (Auto-Detection)

If no semver label is present:

| Files Changed | Bump | Rationale |
|---------------|------|-----------|
| `src/**` | Minor | CLI binary changes require user update |
| `templates/**` | Patch | Template-only changes, auto-updateable |
| `installer/**` | Patch | Installer changes |
| Other files only | Skip | No release (docs, CI, tests) |

### Examples

```
PR with changes to src/cli/commands/foo.ts
→ Minor bump (1.2.3 → 1.3.0)

PR with changes to templates/spec/bar.md only
→ Patch bump (1.2.3 → 1.2.4)

PR with changes to .github/workflows/ci.yml only
→ Skip (no release)

PR with semver:patch label + src/ changes
→ Patch bump (label overrides auto-detection)
```

## Version Compatibility

Templates declare minimum compatible CLI version via `version-info.json`:

```json
{
  "schemaVersion": 1,
  "version": "1.3.0",
  "bumpType": "patch",
  "minCompatibleCli": "1.3.0",
  "changedFiles": ["templates/spec/writer.md"]
}
```

### Compatibility Rules

- **Patch releases**: Templates compatible with any CLI of same `major`
- **Minor releases**: Templates require CLI update to same version
- **Major releases**: Breaking change, CLI update required

## Check Version Command

The `check-version` command compares installed versions against latest release:

```bash
devorch check-version
```

Returns JSON with version info and blocking status:

```json
{
  "cli": { "current": "v1.0.0", "latest": "v1.1.0" },
  "templates": { "installed": "v1.0.0", "latest": "v1.1.0" },
  "blocked": false,
  "message": "CLI update available (v1.1.0). Run `devorch update` after this task."
}
```

| Update Type | `blocked` | Behavior |
|-------------|-----------|----------|
| None/Patch | `false` | Continue execution, show message if present |
| Minor | `false` | Continue execution, suggest update after task |
| Major | `true` | Stop execution, require update first |

**Exit codes:**
- `0` - Success (always, check `blocked` field)
- `1` - Error (network failure, etc.)

## State File

Installation state is stored in `.devorch/.state/state.json`:

```json
{
  "templateVersion": "v1.3.0",
  "installed_at": "2024-01-15T10:30:00Z",
  "status": "complete",
  "components": { ... }
}
```

## Development Mode

When running locally without `BUILD_VERSION`:

1. CLI shows warning: `Running in dev mode`
2. Version checks are skipped
3. Templates report as `dev` version

## Release Workflow

1. PR merges to `master`
2. `determine-version.ts` calculates bump type
3. If not `skip`, release workflow:
   - Builds CLI binaries (macOS, Linux, Windows)
   - Creates GitHub release with `version-info.json`
   - Users auto-update on next command run

## Code References

- Version utilities: `src/utils/version.ts`
- State manager: `src/cli/lib/installation/state-manager.ts`
- Check version: `src/cli/commands/manage/check-version/`
- Release workflow: `.github/workflows/release.yml`
- Bump detection: `.github/scripts/determine-version.ts`
