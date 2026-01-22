# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Remove outdated updater section from CLAUDE.md

### Fixed
- Ensure implementers and verifiers are not skipped in templates

## [1.5.0] - 2025-12-12

### Changed
- Remove empty Development menu and update hints in CLI

## [1.4.0] - 2025-12-11

### Fixed
- Remove hostname from Sentry user ID for improved privacy

## [1.3.0] - 2025-12-11

### Added
- Use computer ID instead of anonymized machine ID for telemetry

### Changed
- Update check-version documentation for new blocked field

## [1.2.1] - 2025-12-11

### Changed
- Add article to CONTRIBUTING.md intro for improved grammar

## [1.2.0] - 2025-12-11

### Changed
- Simplify exit codes in check-version and use blocked field
- Rename role-mapper to domain-mapper and remove context-training.yml

## [1.1.3] - 2025-12-11

### Changed
- Fix grammar in CONTRIBUTING.md

## [1.1.2] - 2025-12-11

### Fixed
- Clarify that patch updates should not block execution

## [1.1.1] - 2025-12-11

### Changed
- Fix punctuation consistency in CONTRIBUTING.md

## [1.1.0] - 2025-12-11

### Added
- Implement semver version system with auto-update behavior

### Changed
- Reorganize documentation into user-guide and developer-guide

### Fixed
- Fix broken image paths in developer-guide
- Fix broken internal links after documentation reorganization
- Remove Agent OS references

## [1.0.263] - 2025-12-11

The v1.0.x series represents the rapid evolution of devorch from its initial release through extensive feature development, refinements, and stabilization. Below is a summary of major themes and features introduced across these 263 patch releases.

### Major Features Introduced in v1.0.x Series

#### Installation & Setup (v1.0.254-263)
- Add standalone binaries to releases and update install script
- Implement drag-and-drop installation for macOS
- Add macOS ad-hoc code signing and quarantine removal
- Consolidate install scripts with backward compatibility
- Centralize release asset naming with smart download recovery
- Use asset-names.json as single source of truth for binary names

#### Testing Infrastructure (v1.0.261-262)
- Add comprehensive E2E test suite for install command
- Add installer tests for ZIP and GH CLI installation paths
- Add answer queue support and setup-bedrock tests
- Move unit tests next to source files
- Add unit tests for bedrock lib modules

#### AWS Bedrock Integration (v1.0.250-260)
- Add setup-bedrock wizard for AWS Bedrock configuration
- Add debug-bedrock command and fix SSO URL
- Add AWS Bedrock CLI commands documentation
- Simplify INSTALL.md for non-technical users

#### Documentation Improvements (v1.0.230-250)
- Add Developer's Guide with workflow diagram
- Add devorch logo
- Add video tutorial section to README
- Reorganize documentation structure
- Fix broken image paths and internal links
- Add setup-bedrock documentation to QUICKSTART

#### Commands & Subagents (v1.0.200-230)
- Add /update-spec command for updating existing specifications
- Add /zest-add-component command and zest-components-web-patterns skill
- Add /plan-jira-ticket command for Jira ticket planning integration
- Add /load-context command to load context-training files
- Make /help command compliant with CONTRIBUTING.md template requirements
- Rename /zest-add-component to /zest-add-component-web
- Remove deprecated create-* commands

#### Context Training System (v1.0.210-220)
- Add 6 comprehensive context training templates
- Add context-training prompts to install flow
- Add token counting to /load-context command
- Simplify /load-context-training argument syntax
- Prevent context_training from being written to versioned config

#### Skills System (v1.0.175-210)
- Add skills activation system for commands and subagents
- Add Jira CLI skill with troubleshooting and best practices
- Rebuild skill auto-update system with per-skill approach
- Add command-to-command dependency support with auto-installation

#### Configuration & Installation (v1.0.165-200)
- Add enabled flag to config and auto-populate all items
- Add secondary config location at devorch/config.yml
- Streamline fresh install flow and fix circular dependencies
- Eliminate false positive circular dependency warnings
- Add prominent warning display and user confirmation for warnings
- Remove version check cache to always show accurate updates
- Add helpful cleanup instructions when installation is cancelled

#### Telemetry & Monitoring (v1.0.167)
- Add Sentry telemetry for CLI usage tracking

#### Web Development Features (v1.0.140-165)
- Add web-accessibility skill
- Add Zest component creation commands and Figma traceability
- Add colored installation issues summary
- Add comprehensive documentation for design commands
- Restructure UX templates into design category

#### Version Management (v1.0.139-148)
- Add check-version command for version verification
- Accept local installations in check-version command
- Remove profile.version field from configs and documentation
- Improve version checker

#### CLI Improvements (v1.0.147-162)
- Simplify CLI from 14 to 5 commands
- Major devorch workflow overhaul with standardized patterns
- Rename /gather-info to /gather-requirements across all documentation
- Optimize templates and add comprehensive snapshot tests

#### React Native Features (v1.0.111-126)
- Add 35 React Native skills for Claude Code
- Add UX workflow commands, figma-researcher skill, and web-verifier
- Add comprehensive documentation for 11 P0 web skills

#### Standards & Skills System Evolution (v1.0.88-125)
- Implement standards preset system with runtime injection
- Add skills support to standards presets
- Add version checker and fix template dependencies syntax
- Add comprehensive documentation for standards presets and skills
- Migrate all 44 standards to skill configurations with Foundry commands
- Migration from Standards to Skills System (Phases 1-7)

#### Architecture & Code Organization (v1.0.100-115)
- Consolidate directory structure - TypeScript in src/, templates separate from foundry
- Unify asset naming logic and remove redundant category field
- Add root-level subagent support and refactor installation system
- Integrate markdown-di locally to fix compilation issues

#### Dependency Management (v1.0.101-110)
- Implement automatic dependency resolution system
- Implement HasteFS for cached file system operations
- Replace manual argument parsing with minimist
- Consolidate schemas into @devorch/schemas package

#### Documentation System (v1.0.92-100)
- Add AI-Native Product Development Handbook with import automation
- Add /panic command with shared workflows
- Add /worktree command with single-agent and multi-agent versions
- Comprehensive documentation refactor

#### Early Features (v1.0.1-87)
- Simplify CLI for git-clone workflow
- Rebrand from Agent OS to devorch
- Add version source from GitHub releases
- Add documentation links and table of contents to README
- Add section for updating local devorch installation
- Reorganize documentation: prioritize embedded specs over polyrepo
- Refactor polyrepo setup with various approaches
- Improve git submodules handling
- Add comprehensive workflow and setup instructions

### Bug Fixes Across v1.0.x Series

#### Installation & Setup Fixes
- Fix install script for private repository downloads
- Fix gh CLI download to use explicit version tag
- Support private repos by using gh CLI for downloads
- Auto-update profiles from git during installation
- Correct duplicate .claude/commands path in QUICKSTART.md
- Ensure commands directory exists even when no commands are installed

#### Configuration & Schema Fixes
- Fix Zod instance mismatch in schema consolidation
- Resolve TypeScript type errors in dependency system
- Allow adding components to preset-based configurations
- Update test assertions for Zod v4 error structure

#### Template & Dependency Fixes
- Use category/name format consistently for subagent lookups
- Remove incorrect 'other/' category prefix from product-planner dependency
- Include category prefix when indexing subagents in HasteFS
- Correct subagent name to match dependency references
- Fix existing project update instructions
- Use compiled source directory in HasteFS to resolve template placeholders
- Remove all {{standards}} interpolations from source files
- Upgrade markdown-di to fix partial/dependency interpolation

#### Build & Release Fixes
- Fix release workflow for new directory structure
- Build schemas package before CLI in release workflow
- Remove presets/ reference from release workflow
- Use error.location instead of non-existent error.line property

#### Documentation Fixes
- Fix terminology: rename 'sibling directories' to 'child repos'
- Fix folder name in INSTALL.md to match actual zip output
- Fix broken internal links and image paths
- Remove Cursor references after removal from schema

#### Terminal & UX Fixes
- Prevent terminal corruption when pressing Ctrl+C during prompts
- Prevent installation loop when selecting custom context training

### Security
- Add hostname removal from telemetry data
- Implement computer ID for improved privacy

### Removed
- Complete Cursor support removal from codebase
- Remove auto-install comments from configuration
- Remove polyrepo from Features section
- Disable Cursor support

## [1.0.0] - 2025-10-15

### Added
- Initial release of devorch (rebranded from Agent OS)
- CLI application for installing AI workflow automation for Claude Code
- Support for commands, subagents, and skills
- Template system with markdown-based configurations
- Installation and setup scripts
- Core workflow commands: /plan-product, /create-spec, /execute-tasks
- Claude Code subagents: test-runner, context-fetcher, git-workflow, file-creator
- Date-checker subagent for deadline validation
- Standards system for code quality enforcement
- Git-based template management
- Documentation and setup guides

### Changed
- Project rebranded from "Agent OS" to "devorch"
- Reorganized file structure with improved separation of concerns

### Fixed
- References to old repository names
- CamelCase to PascalCase naming consistency
- Context efficiency improvements across multiple templates

---

## Version History Summary

- **v1.5.0 (Current)**: CLI refinements and telemetry improvements
- **v1.4.0**: Privacy enhancements in telemetry
- **v1.3.0**: Computer ID-based telemetry
- **v1.2.x**: Documentation and version system improvements
- **v1.1.x**: Semver implementation and documentation reorganization
- **v1.0.x (264 releases)**: Extensive feature development including:
  - AWS Bedrock integration
  - Comprehensive testing infrastructure
  - Skills and context training systems
  - React Native and web development features
  - Standards presets and dependency management
  - Installation and update automation
  - CLI simplification and workflow standardization
- **v1.0.0**: Initial public release as devorch

[Unreleased]: https://github.com/guicheffer/devorch/compare/v1.5.0...HEAD
[1.5.0]: https://github.com/guicheffer/devorch/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/guicheffer/devorch/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/guicheffer/devorch/compare/v1.2.1...v1.3.0
[1.2.1]: https://github.com/guicheffer/devorch/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/guicheffer/devorch/compare/v1.1.3...v1.2.0
[1.1.3]: https://github.com/guicheffer/devorch/compare/v1.1.2...v1.1.3
[1.1.2]: https://github.com/guicheffer/devorch/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/guicheffer/devorch/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/guicheffer/devorch/compare/v1.0.263...v1.1.0
[1.0.263]: https://github.com/guicheffer/devorch/compare/v1.0.0...v1.0.263
[1.0.0]: https://github.com/guicheffer/devorch/releases/tag/v1.0.0
