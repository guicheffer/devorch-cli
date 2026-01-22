# 🎨 UX Playbook (UX)

## 🎨 UX Playbook (UX)

PoC: [Brian Lin](mailto:brian.lin@yourcompany.ca)

### Objective

To create actionable, context-rich design specs that serve as a direct input for engineering. Your role is to bridge the product vision and the user experience by thinking beyond visuals to document the complete experience in a way that both an **AI and an engineer can understand and build from**.

### Key tools, and services

* **Figma**: Your primary tool for creating visual designs and prototypes. The **Figma Dev Mode MCP** is a key service that allows AI Verifier Agents to compare the final implementation against your designs.  
  * **Onboarding**: Structure your Figma pages to mirror the steps of the user journey (e.g., Information, Cart & Review, Shipping, Payment). This makes it easier for both AI and engineers to locate and understand the relevant screens.  
* **AI Assistants (Thought Partner)**: Use tools like **ChatGPT** or **Gemini** to brainstorm and capture key aspects of the user journey, such as user objectives, friction points, edge cases, and microcopy.  
* **AI Assistants (Implementation)**: Use tools like **Cursor** or **Claude Code** to make small, targeted design changes directly in the codebase without needing an engineer.  
  * **Onboarding**: Get access to the relevant code repositories and the team's devorch profile. This will allow you to use agentic commands (e.g., `@ui-implementer`) to make precise changes.  
* **Markdown**: The format for your primary deliverable, the `ux-spec.md` file.  
  * **Onboarding**: Learn to create structured markdown documents that clearly link out to your Figma files and related specs.

### Expected outcome

Your primary deliverable is a **`ux-spec.md`** file containing detailed user flows and references to specific, well-organized Figma frames. This spec serves as the direct input for the engineering team. For smaller changes, your outcome might be a direct pull request with the required design modifications.

### Example workflows

Here are several ways to execute your role effectively in an AI-native environment.

#### Workflow 1: From Research to Actionable Spec (for new features)

1. **Use AI as a Thought Partner**: Begin by using an AI assistant like Gemini or ChatGPT to flesh out the user experience from your initial `research-insights.md`. Ask targeted questions to define key aspects of the feature.  
2. **Create the `ux-spec.md` Document**: Create a detailed markdown file that documents the entire experience, including metadata, user flows, screen-by-screen specifications, error handling, and mobile considerations. Reference specific Figma frames throughout.  
3. **Handover to Engineering**: The final `ux-spec.md` is your handover to the engineering team. It provides the necessary context for them to create the `technical-spec.md` and guide the AI implementation.

#### Workflow 2: Agentic Design Implementation (for minor changes)

This workflow is for making small, specific design updates directly in the code, such as changing a color, adjusting spacing, or updating an icon.

1. **Identify the Change**: Clearly define the change you want to make (e.g., "Change the primary button color from blue to purple on the login screen").  
2. **Open the Codebase in an AI Assistant**: Navigate to the relevant repository in Cursor or Claude Code.  
3. **Use an Implementer Agent**: Invoke the appropriate agent from your team's profile to make the change. For example: `@ui-implementer find the primary button component and change its background color to our new brand purple (#6200EE).`  
4. **Verify the Change**: Use the in-IDE preview or a local development server to visually confirm the change was applied correctly.  
5. **Submit a Pull Request**: Once you are satisfied, submit your changes as a pull request for the engineering team to review and merge.

### Appendix

```