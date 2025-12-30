# PRD: [Feature Name]

**DOCUMENT STATUS**: [DRAFT | REVIEW | FINAL]

## 1. Context and Problem Statement

### 1.1. The Opportunity
* **What is the problem we are trying to solve?**
    * *Example: Our current time from a new experiment idea to a validated learning is 131 days, which is too slow to innovate effectively.*
* **Why is this a problem?**
    * *Example: This slow learning cycle means we are slow to react to customer needs and market changes, and we risk investing significant engineering effort in ideas that are not validated.*
* **Who is it a problem for?**
    * *Example: This affects our product teams' ability to innovate and our customers, who wait too long for valuable new features.*

### 1.2. Strategic Alignment
* **How does this align with our company goals?**
    * *Example: This initiative directly supports our goal to "Do Things Fast" by radically shortening the feedback cycle from idea to production.*

## 2. Goals and Success Metrics

### 2.1. Hypothesis
* **We believe that** [adopting AI-native product development practices]
* **will result in** [a significant reduction in our discovery-to-validation and build cycle times].
* [cite_start]**We will know we're right when** [we hit 3 out of 4 of our success criteria, including a 1-week build cycle and a team satisfaction score of 8/10]. [cite: 900, 1740]

### 2.2. Key Metrics (KPIs)
* **Leading Indicators (Process Metrics):**
    * **Time to Validated Learning**: Reduce from 131 days to 1 week.
    * [cite_start]**Delivery Speed**: Achieve a 1-week build cycle time (from `prd.md` to first production release). [cite: 1742]
    * [cite_start]**Team Satisfaction**: Achieve an 8/10 overall team satisfaction score via weekly pulse checks. [cite: 1742]
* **Lagging Indicators (Business Impact):**
    * **[Primary Business KPI]**: *Example: Increase feature adoption by Y%.*

## 3. Scope and Requirements

### 3.1. User Personas
* **[Persona 1 Name]**: *Example: The Product Manager. Goal: To quickly validate ideas and get features to market.*
* **[Persona 2 Name]**: *Example: The Engineer. Goal: To build high-quality code based on clear, unambiguous requirements.*

### 3.2. Core Requirements (User Stories)
* As a Product Manager, I want to be able to define a new product initiative in a structured, machine-readable document so that I can provide clear context to UX, engineering, and AI agents.
* As an Engineer, I want to receive a precise technical spec derived from a PRD and UX-spec so that I can effectively guide an AI to generate production-ready code.
* As a UX Designer, I want to translate the PRD into a detailed `ux-spec.md` with user flows and Figma references so that the intended user experience is clearly documented for implementation.

### 3.3. Out of Scope
* *Example: This initiative will not initially focus on redesigning the entire company-wide KPI tree.*
* *Example: We will not be building a custom in-house AI assistant; we will use existing tools like Cursor and Claude Code.*

## 4. Dependencies and Stakeholders

* **Upstream Dependencies**: This workflow depends on clear business goals and access to reliable customer data from sources like Chattermill.
* **Downstream Dependencies**: The UX and Engineering teams are the direct consumers of this artifact.
* **Key Stakeholders**: [List key stakeholders, e.g., Head of Product, EM, UX Lead].
```
