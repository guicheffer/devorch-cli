---
schema: command-multi-agent
name: /design-change-rn
description: Implement design changes to React Native modules based on Figma designs. Asks clarifying questions to pinpoint exact location, reads Figma specifications, finds implementation files, and verifies changes match designs using Mobile MCP.
mode: multi-agent
dependencies:
  skills:
    - figma-dev-mode-figma-researcher
    - figma-dev-mode-figma-image-downloader
    - ui-design-system-rn-zest-integration
    - ui-design-system-rn-zest-components
    - ui-design-system-rn-accessibility
    - ui-design-system-rn-styling-patterns
    - ui-design-system-rn-responsive-design
    - ui-design-system-rn-images
    - mobile-mcp
  subagents: []
partials:
  setup: common/partials/commands/command-setup.md
  instructions-footer: common/partials/commands/standard-instructions-footer.md
---

# Design Change RN

## Purpose

Implement design changes to React Native modules (shared-mobile-modules) based on Figma designs with careful clarification and verification. You act like the designers' gateway to doing technical changes!

## Instructions

1. Don't skip any phase, or step in the workflow
2. Always stop for user feedback, when requested

{{partials.instructions-footer}}

## Workflow

### PHASE 0: Pre-checks

{{partials.setup}}

### PHASE 1: Check prerequisites

Check `gh` CLI:

```bash
if ! command -v gh &> /dev/null; then
  echo "GitHub CLI (gh) not found"
  echo "Install: https://cli.github.com/"
  exit 1
fi
```

Check `gh` is properly authenticated:

```bash
if ! gh auth status &> /dev/null; then
  echo "GitHub CLI not authenticated"
  echo "Run: gh auth login"
  exit 1
fi
```

**STOP** and explain the user they need to have the `gh` CLI tool installed. You can help them with the install!

#### Optional Prerequisites for Local Testing

Check if `node` is installed:

```bash
if ! command -v node &> /dev/null; then
  echo "Node not found"
  echo "Install: https://nodejs.org/en/download"
  exit 1
fi
```

Check if `yarn` is installed:

```bash
if ! command -v yarn &> /dev/null; then
  echo "Yarn not found"
  echo "Install: https://yarnpkg.com/getting-started/install"
  exit 1
fi
```

Check for iOS development tools (macOS only):

```bash
if [[ "$OSTYPE" == "darwin"* ]]; then
  if ! command -v xcrun &> /dev/null; then
    echo "Xcode Command Line Tools not found"
    echo "Install: xcode-select --install"
    exit 1
  fi
fi
```

Check whether the Mobile MCP is available. Use `mobile_list_available_devices` to verify. If it's not available **STOP** and explain the user how to install it:

```bash
claude mcp add mobile-mcp -- npx -y @mobilenext/mobile-mcp@latest
```

**EXPLAIN** to the user that they need these CLI tools installed to test the changes locally. This will make it easier to verify the design changes.

### PHASE 2: Collect input [INTERACTIVE]

We require the following from the user, ask them the questions one-by-one. The questions could have been answered as a part of $ARGS, if yes, then answer the question from that $ARGS input variable.

1. **Design Change**: We need the user to define the design change they want, this will be in the form of a description of the change like:

   "We want to change the color to brand.background.default"
   "We want to increase heading sizes to headline-lg"

   Even better though is if the user adds a figma file in this case. The figma file link will look something like: `https://www.figma.com/design/rXFdAU9w1qCDKajA6MaxUo/-DRAFT--Onboarding?node-id=1-15326&t=0VD3WkaI5MB3kRdR-11`. Make sure the user selects a **frame**, not the full file.

2. **Change locality**: Which module and which screen/component within that module needs the change. For example:

   "We want to change the CTA button in the onboarding module"
   "We want to fix the recipe card styling in the menu-management module"

   The user will run this command in the shared-mobile-modules repository, which contains React Native modules organized by feature.

3. **Ticket number**: We need a JIRA ticket number for the Pull Request

### PHASE 3: Parse locality

Use the glob and grep tools to find the right locality within the repo. The shared-mobile-modules repo is organized as:

```
packages/
  [module-name]/
    src/
      screens/
      components/
      ...
```

If you are presented with ambiguous localities, or more than one places where the designer would do the change, let's try to hone into just one place, with more clarifying questions, and presenting the user with the options you found.

**ONLY CONTINUE** to the next phase when we're sure about the locality of the change and we were able to hone into the exact locality of the change. This can be n+1 localities, if the user wants to do a sweeping change, usually it's just one single change though.

### PHASE 4: Parse design input

**WHEN**: Given a Figma file. Activate the `figma-dev-mode-figma-researcher` skill to research the given figma file. If the figma researcher fails download the screenshots by activating `figma-dev-mode-figma-image-downloader` skill.

Use the information distilled to formulate the exact design change that the user requires.

**PRESENT** the design change to the user, and ask whether this sounds good. Explain to the user what you can see, and **EXPECT** and **ASK** for feedback.

**WHEN**: Given a worded design change, continue to the next phase.

### PHASE 5: Implement

Activate all skills starting with `ui-design-system-rn-`. Use these skills to apply the design change.

**CRITICAL RULES:**

1. **Use Zest tokens via useZestStyles** - Never hardcode colors, spacing, or typography:
   ```typescript
   // Correct - use Zest tokens
   const styles = useZestStyles(createStylesConfig((theme) => ({
     container: {
       backgroundColor: theme.alias.color.brand.background.default,
       padding: theme.global.spacing.md,
     }
   })));

   // Wrong - hardcoded values
   const styles = StyleSheet.create({
     container: { backgroundColor: '#00A86B', padding: 16 }
   });
   ```

2. **Use Zest components** - Button, Text, Icon, Card, Badge, InputField, InlineMessage, etc.
   ```typescript
   // Correct - Zest component
   <Button variant="primary" appearance="brand" onPress={handlePress}>
     <Text>Submit</Text>
   </Button>

   // Wrong - custom implementation
   <TouchableOpacity style={styles.button}>
     <RNText style={styles.text}>Submit</RNText>
   </TouchableOpacity>
   ```

3. **Always provide testID** - For testing purposes:
   ```typescript
   <Button testID="submit-button" variant="primary" onPress={handleSubmit}>
   ```

4. **Always provide altText for icons** - For accessibility:
   ```typescript
   <Icon name="HeartOutline24" altText="Add to favorites" />
   ```

5. **Use ImageCloudinary for images** - Never use require():
   ```typescript
   <ImageCloudinary
     src="https://res.cloudinary.com/yourcompany/image/upload/..."
     width={200}
     height={150}
     quality="auto:good"
   />
   ```

**NEVER** do any changes to API state, local state, effects, or any business logic - this always _just_ needs to be a design change, nothing more!

**IMPORTANT**: When making changes, add a Figma reference comment at the top of modified files or functions:

```typescript
// Figma: [FIGMA_FILE_URL]
```

This creates traceability between code and design.

### PHASE 5b (OPTIONAL): Show changes locally

**WHEN**: User doesn't have `yarn`, `node`, or mobile development tools, skip to `PHASE 6`

**WHEN**: User has the prerequisites, offer to test locally:

#### For iOS (macOS only):

1. Check if an iOS simulator is available:
   ```bash
   xcrun simctl list devices available | grep -E "iPhone|iPad"
   ```

2. Boot a simulator if needed:
   ```bash
   xcrun simctl boot "iPhone 16"
   ```

3. Start Metro bundler in the background:
   ```bash
   cd packages/[module-name] && yarn start &
   ```

4. Run the app on simulator:
   ```bash
   yarn ios
   ```

#### For Android:

1. Check if an Android emulator is running:
   ```bash
   adb devices
   ```

2. Start the app:
   ```bash
   yarn android
   ```

#### Verify with Mobile MCP:

1. Use `mobile_list_available_devices` to find available devices
2. Use `mobile_take_screenshot` to capture the current state
3. Navigate to the changed screen using `mobile_list_elements_on_screen` and `mobile_click_on_screen_at_coordinates`
4. Take a screenshot of the implemented changes
5. Compare with the Figma design

Help debug any rendering issues through:
- Metro bundler console output
- Device logs (`adb logcat` for Android, Console app for iOS)
- React Native error screens

Ask the user to verify the changes before continuing to PHASE 6.

### PHASE 6: Create PR

Since we're not working with a dev, use the `gh` tool to create a new PR for them. Create a branch like this:

`feature/[TICKET_NUMBER]-[slug-of-change-description]`

For example: `feature/EPS-1000-change-button-styling`

Then use the PR Template to create the PR. The title should start with [TICKET_NUMBER], in brackets:

```txt
[EPS-1000] Update button styling in onboarding module
```

### PHASE 7: Monitor GH Actions

Now you need to monitor the GH actions on the PR. Keep checking the status:

```bash
gh pr checks [PR_NUMBER] --watch
```

The UX designer can see the changes once the checks pass and the PR is deployed to a preview environment (if available).

Keep waiting until some action fails, fix it for the user when it's something you can fix.

Common issues to fix automatically:
- TypeScript errors
- Linting errors (prettier, eslint)
- Test failures (update snapshots if styling changes are intentional)
- Import path issues

**ONLY QUIT AND SUCCEED** when all the checks are green.

## Report

Show the user what kind of change we did, and report:
- The PR link
- Summary of changes made
- Any design tokens/components used
- Screenshots of before/after (if local testing was done)

## Critical Rules

**DO:**
- Use Zest tokens and components for ALL styling
- Add testID to interactive elements
- Add altText to all icons
- Add Figma reference comments
- Follow the skills for implementation patterns
- Wait for user confirmation at interactive phases

**DON'T:**
- Modify business logic, API calls, or state management
- Use hardcoded colors, spacing, or typography values
- Use StyleSheet.create() - use useZestStyles instead
- Use require() for images - use ImageCloudinary
- Skip accessibility requirements
- Create new custom components when Zest equivalents exist
