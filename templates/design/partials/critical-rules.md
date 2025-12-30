## Critical Rules

**DO:**
- Extract ALL design tokens from the Figma design
- Map tokens to nearest Zest equivalent
- Provide complete code snippets
- Include testID and altText in all examples
- Note any values that don't have Zest equivalents
- Include responsive considerations
- Generate Component Tree diagram

**DON'T:**
- Use hardcoded color/spacing values in code examples
- Skip accessibility props (testID, altText)
- Ignore responsive breakpoints
- Generate partial specs
- Use StyleSheet.create() (RN) - use createStylesConfig instead
