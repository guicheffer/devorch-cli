# Mobile React Native - Specification Guidance

**Status:** 🟢 PRs fetched, ready for pattern analysis

## Overview

**Reference Repository:** yourcompany/shared-mobile-modules
**PRs Fetched:** 50 (ready for analysis)
**Repository Type:** React Native shared modules

## Expected Domains

Based on typical React Native patterns:
- Component architecture
- Navigation patterns (React Navigation)
- State management (Redux/Context)
- Native module integration
- Platform-specific code (iOS/Android)
- Styling with StyleSheet
- Testing (Jest, Detox)
- Performance optimization
- Image handling
- Accessibility
- Animations (Reanimated)
- TypeScript patterns

## Next Steps

1. Run pr-pattern-analyzer:
   ```bash
   Task subagent_type=context-training/pr-pattern-analyzer
     prompt="Analyze yourcompany/shared-mobile-modules PRs from /tmp/artifacts/pr-fetcher-mobile/final_prs.json"
   ```

2. Review extracted patterns
3. Generate implementer files
4. Add React Native-specific examples

## PR Data Location

- Raw PRs: `/tmp/artifacts/pr-fetcher-mobile/raw_prs.json`
- Filtered PRs: `/tmp/artifacts/pr-fetcher-mobile/final_prs.json` (50 PRs ready)
