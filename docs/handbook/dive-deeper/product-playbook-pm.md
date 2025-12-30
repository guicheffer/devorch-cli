# 📊 Product Playbook (PM)

## 📊 Product Playbook (PM)

PoC: [Ebrahim Kargar](mailto:ekar@yourcompany.com)

### Objective

To define the "what" and the "why" of a product initiative in a clear, context-rich, and machine-readable format. Your role is to be the source of truth for the business and user needs, translating them into an actionable specification that kicks off the entire development process.

#### Key tools and services

* **Authoring Tools (e.g., Google Docs, Cursor)**: Your environment for drafting and collaborating on the `prd.md`.  
  * **Onboarding**: You are free to use any tool you are comfortable with. A standardized **`prd.md` template** will be provided to ensure the structure is consistent. The final output must be a clean Markdown file.  
* **Context Synthesis Tools (e.g., Chattermill)**: Your tools for gathering and making sense of raw data from user feedback, research, and market analysis.  
* **AI Assistants (Gemini, ChatGPT, Cursor)**: Your strategic partner for research, analysis, and drafting assistance.

### Expected outcome

Your primary deliverable is a comprehensive **`prd.md`** file, created from a standard template. This document is the actionable, context-rich specification that serves as the single source of truth for the initiative. It must clearly articulate the problem, define success, and outline the core requirements in a way that is unambiguous for both human stakeholders and the downstream AI agents.

### Example workflows

Here are several ways to execute your role effectively. The key is that the authoring of the `prd.md` can happen in any environment you prefer, as long as it follows the standard template and results in a structured markdown file.

#### Workflow 1: Building Your Context Container

The goal of this phase is to synthesize raw data into a set of clear, concise insights that will inform your `prd.md`.

1. **Extract Raw Insights**: Use a tool like **Chattermill** to pull raw user feedback, survey results, and support tickets related to the problem area.  
2. **Synthesize in a Dedicated Space**: Use a tool like **NotebookLM** or a **directory managed by Cursor or Claude Code** to create a queryable knowledge base from your research. Ask questions to distill the information into key themes and evidence-based insights.   
   * One way to also get to a solid PRD is using the [AI-Native PDLC PM Gem](https://gemini.google.com/gem/12fHTZEsz1DJrNkizZqVOPwNHmsr8fdKL?usp=sharing). This one uses context from the [BMAD](https://github.com/bmad-code-org/BMAD-METHOD/blob/f09e282d72fc067637230dccc5a3a89068ec5b71/docs/user-guide.md#the-planning-workflow-web-ui-or-powerful-ide-agents) method.  
   * Another way is to use Claude Code; and organize your context on your filesystem: [How to Context Engineering with Claude Code](https://www.youtube.com/watch?v=4nthc76rSl8)  
3. **Structure Your Findings**: Document your synthesized findings in structured markdown files (e.g., `research-insights.md`, `user-pain-points.md`) within your managed directory. This will be the direct input for your `prd.md`.

#### Workflow 2: Authoring the `prd.md`

Now, use your synthesized insights to fill out the standard `prd.md` template in your authoring tool of choice.

1. **Fill Out the Template**: Work through the `prd.md` template section by section (Problem Statement, Success Metrics, User Personas, Requirements, etc.), using your synthesized research as the source of truth.  
2. **Use AI for Drafting Assistance**: While you're writing, you can still use an AI assistant to help you articulate your points clearly. For example: "Based on these key insights [paste insights], help me write a compelling Problem Statement."  
3. **Review for Clarity**: Before finalizing, review the document with UX and Engineering leads. The goal is to eliminate any ambiguity that could confuse a person or an AI.

#### Workflow 3: The Handover

1. **Export to Markdown**: Once the `prd.md` is complete and approved, ensure the final output is a clean markdown file.  
2. **Deliver the `prd.md`**: This final markdown file is your official handover to the UX team. It provides the complete context they need to begin their work on the `ux-spec.md`.  
3. **Remain the Context Guardian**: You are the ultimate owner of the "why" and must remain available to provide clarifying context as the UX and Engineering teams dive into the details.

#### Workflow 4: Maintaining Context

Post-handover, it is critical to maintain the PRD to continue to be the source of truth for the feature or product created, as designers, engineers, and stakeholders will continue to use the PRD to guide decisions, processes, kick off product development, and adjust and create plans. Maintaining context is critical to ensure continued alignment. 

1. **Define update capture process:** ensure ongoing work (Jira, Slack, Statsig) sources are hooked into your context management space \- NotebookLM, Claude Code, etc.   
2. **Ensure update compliance:** product demos, meeting notes, sprint updates,and  weekly reports are continuously published and updated.  
3. **Synthesise ongoing updates:** synthesize findings, updates, and progress with the use of your chosen tool.   
4. **Update the PRD:** focusing on the user stories (core requirements) and scope \- continuously update the list of core requirements, decisions made, and their respective status within your PRD. 

### Appendix

#### `prd.md` Template Example

```