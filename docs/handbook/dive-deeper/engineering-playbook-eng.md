# 👩‍💻 Engineering Playbook (ENG)

## 👩‍💻 Engineering Playbook (ENG)

PoC: [Pepijn Senders](mailto:ps@yourcompany.com)

### Objective

Your objective is to master two core AI-powered methodologies: **Agentic Development** for tactical, daily tasks and **Spec-Driven Development** for strategic, large-scale features. Your mission is to act as a "human-in-the-loop," leveraging deep context from Product and UX to create precise technical specifications. Your ability to provide the right context to the LLM will directly determine the quality and speed of the generated code. This is the essential skill of **Context Engineering**.

### Key Tools and Services

* [**`devorch`](https://github.com/guicheffer/devorch)**: This is HelloTech's internal framework for AI-first development. It is your primary tool for orchestrating AI agents and managing the context they need to perform their work. Here we collect context training and train subagents on our ways of working. Spec-machine will help you get the right context for your task\!
* **The Project Configuration ([`devorch.config.yml`](https://github.com/guicheffer/devorch/blob/master/docs/user-guide/configuration.md))**: This file is the true source of truth for your project. It contains your team's specific context training, skills, and specialized AI agents (Implementers and Verifiers). This configuration is what provides the deep, specific context to the AI.
* **Context Training**: Repository-specific customizations that guide how devorch works for your project. Context training includes specification guidelines, implementation patterns, and verification rules. Run `/analyze-tech-stack` and `/train-context` to generate customized guidelines for your repository.  
* **AI Assistants**: Cursor and Claude Code are your primary environments for interacting with AI agents to write, test, and deploy code by using `devorch` commands.

### Expected Outcome

Your primary deliverable is high-quality, production-ready code that is efficiently generated and verified by AI. A key artifact you will create and use is the **`technical-spec.md`** file. For any significant feature, this document is the expected outcome of your work. It translates product and UX requirements into a precise, machine-readable blueprint that guides a team of AI agents through implementation and automated verification.

### Example Workflows

As an engineer, you'll operate in two distinct modes, moving fluidly between them based on the task at hand.

![][image9]

#### Workflow 1: Agentic Development (The "Here and Now")

This is the tactical, day-to-day use of specialized AI agents for specific, in-context requests. Think of it as having a team of experts on call directly in your IDE.

* **When to Use**: For focused tasks like updating a UI component, adding a new test, refactoring a function, or implementing a single API endpoint.  
* **How it Works**:  
  1. Inside your AI assistant, you provide a clear, context-rich prompt.  
  2. When you execute a command, **`devorch`** uses the project's **configuration** to orchestrate the right tools. For example, a command might invoke a specialized subagent defined in your config that has deep knowledge of our Zest design system, ensuring the output automatically adheres to the correct patterns.

#### Workflow 2: Spec-Driven Development (The "Big Picture")

This is a strategic methodology for developing larger, more complex features from start to finish. Here, you shift from a coder to an architect, orchestrating a team of AI agents.

* **When to Use**: For building new features, epics, or any work item that involves multiple components or spans different parts of the codebase.  
* **How it Works**:  
  1. The process begins with you creating a detailed, machine-readable **`technical-spec.md`** based on inputs from Product and UX. This spec becomes the single source of truth for the feature.  
  2. The workflow then uses a **Reflect-and-Refine loop**, where `devorch` commands employ agents defined in your project's **configuration**:  
     * **Implementer Agents**: The "doers" (e.g., `@ui-implementer`) that execute the plan, writing code to build the feature as described in your spec.  
     * **Verifier Agents**: The "evaluators" that act as an automated quality gate, checking the implementer's work against the spec and context training guidelines.

### Appendix

#### `engineering-spec.md` Template Example

````