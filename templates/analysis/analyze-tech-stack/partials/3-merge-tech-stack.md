# Merge Tech Stack

This workflow intelligently merges detected technologies with existing tech-stack.md documentation, preserving rationale while adding new discoveries.

## Step 1: Check if tech-stack.md Exists

Check if `devorch/tech-stack.md` exists using the Read tool:

**If file does NOT exist:**
- Skip to Step 4 (Generate New tech-stack.md)
- No merge required

**If file exists:**
- Read the current contents
- Proceed to Step 2

## Step 2: Parse Existing tech-stack.md

Extract information from the existing file:

### Extract Declared Technologies

Parse each section (Frontend, Backend, Infrastructure, etc.) and extract:
- Technology name (e.g., "React", "PostgreSQL")
- Version if specified (e.g., "v18.2.0", ">=14")
- Any inline notes or context

Example:
```markdown
### Frontend
- **React** (v18.x)
  - Using for component-based UI
- **Tailwind CSS** (v3.0)
```

Extracted: React v18.x, Tailwind CSS v3.0

### Extract Rationale Sections

Identify and preserve sections containing explanations:
- Sections titled "Rationale", "Why we chose X", "Technical Decision Records"
- Paragraphs explaining technology choices
- Architecture decision records (ADRs)
- Any custom explanatory sections

### Extract Custom Sections

Identify user-added sections that don't fit standard categories:
- Custom organization
- Project-specific notes
- Migration plans
- Deprecation notes

## Step 3: Compare Detected vs Declared

Compare the analyzed tech stack (from previous step) against declared technologies:

### ✅ Confirmed Technologies

**Criteria:** Declared in tech-stack.md AND detected in project

**Action:** Keep as-is with existing rationale

**Example:**
- tech-stack.md says: "React (v18.x)"
- Detected: "React (v18.2.0)" in package.json
- Result: Confirmed ✅, keep with rationale

### 🔄 Version Updates

**Criteria:** Same technology but different version

**Action:** Update version, note the change

**Example:**
- tech-stack.md says: "Next.js (v13.0.0)"
- Detected: "Next.js (v14.0.0)" in package.json
- Result: Update to v14.0.0, add update note

### ➕ New Technologies

**Criteria:** Detected in project but NOT in tech-stack.md

**Action:** Add to appropriate section with "(auto-detected)" marker

**Example:**
- tech-stack.md: No mention of Redis
- Detected: Redis in docker-compose.yml
- Result: Add "Redis (auto-detected from docker-compose.yml)"

### ⚠️ Discrepancies

**Criteria:** Declared in tech-stack.md but NOT detected in project

**Possible reasons:**
- Planned but not yet implemented
- External service (not in local configs)
- Recently removed (docs not updated)
- Infrastructure managed separately

**Action:** Flag in "Review Needed" section with context

**Example:**
- tech-stack.md says: "MongoDB"
- Detected: No MongoDB dependencies or configs
- Result: Flag for review

## Step 4: Generate or Update tech-stack.md

### Structure for New File (First Generation)

```markdown
# Tech Stack

> Generated on: [YYYY-MM-DD]
> This document is automatically maintained by the `/analyze-tech-stack` command

## Overview

This document describes the technology stack used in this project. Technologies are auto-detected from dependency files and configuration. Add rationale sections to explain key technology choices.

## Frontend

[List frontend technologies by subcategory]

## Backend

[List backend technologies by subcategory]

## Infrastructure

[List infrastructure technologies]

## Development Tools

[List development tools]

## Rationale

Please add rationale for your technology choices by editing this document.

**Note:** The `/analyze-tech-stack` command will preserve your rationale during updates.

---

*Last analyzed: [YYYY-MM-DD HH:MM]*
```

### Structure for Updated File (Intelligent Merge)

```markdown
# Tech Stack

> Last updated: [YYYY-MM-DD]
> This document is automatically maintained by the `/analyze-tech-stack` command

## Overview

[Preserve existing overview if present, otherwise use default]

## Frontend

### UI Library
- **React** (v18.2.0)
  [Preserve existing rationale]

### Meta-framework
- **Next.js** (v14.0.0) 🔄 *Updated from v13.0.0 on [date]*
  [Preserve existing rationale]

### Styling
- **Tailwind CSS** (v3.3.0)
  [Preserve existing rationale]

## Backend

### Runtime
- **Node.js** (v20.x)
  [Preserve existing rationale]

### Framework
- **Express** (v4.18.0)
  [Preserve existing rationale]

### Database
- **PostgreSQL** (inferred from pg v8.11.0)
  [Preserve existing rationale]

## Infrastructure

### Containerization
- **Docker** *(auto-detected on [date])*
  - Detected from: Dockerfile, docker-compose.yml
  - *Please add rationale when convenient*

### Cache/Queue
- **Redis** *(auto-detected on [date])*
  - Detected from: docker-compose.yml
  - *Please add rationale when convenient*

## Development Tools

### Build Tools
- **Vite** (v4.5.0)
  [Preserve existing rationale]

### Testing
- **Jest** (v29.5.0)
  [Preserve existing rationale]

- **Playwright** *(auto-detected on [date])*
  - Detected from: playwright.config.ts
  - *Please add rationale when convenient*

## Rationale for Key Choices

[Preserve ALL existing rationale sections]

### New Auto-Detected Technologies

The following technologies were detected during the latest analysis:

- **Docker** (detected [date]): Containerization platform
  - Source: Dockerfile, docker-compose.yml
  - *Please document why Docker was chosen*

- **Redis** (detected [date]): In-memory data store
  - Source: docker-compose.yml
  - *Please document the use case for Redis*

## Review Needed ⚠️

The following technologies are documented but were not detected in the project:

- **MongoDB**
  - Last mentioned in tech-stack.md
  - Not found in: dependencies, docker-compose, or configs
  - **Action required:** Verify if still in use or remove from documentation
  - Possible reasons: External service, recently removed, or managed separately

---

*Last analyzed: [YYYY-MM-DD HH:MM]*
*Previous analysis: [YYYY-MM-DD HH:MM]*
```

## Merge Strategy Guidelines

### 1. Preserve User Content
- **NEVER** delete user-written rationale
- **NEVER** rewrite explanations
- **ALWAYS** keep custom sections and organization

### 2. Update Intelligently
- Update version numbers when detected
- Add update timestamp and note: 🔄 *Updated from vX to vY on [date]*
- Preserve surrounding context

### 3. Mark New Additions
- Use "(auto-detected on [date])" marker
- Include source information
- Prompt for rationale addition

### 4. Flag Discrepancies
- Create "Review Needed" section
- Explain what's missing
- Suggest possible actions
- Include helpful context

### 5. Use Consistent Formatting
- Use standard emoji markers: ✅ 🔄 ➕ ⚠️
- Keep professional, technical documentation style
- Maintain markdown formatting consistency
- Use clear section hierarchy

### 6. Add Metadata
- Include "Last analyzed" timestamp
- Track update history
- Note which command generated/updated the file

## Step 5: Write the File

Use the Write tool to write the merged content to `devorch/tech-stack.md`.

After writing, generate a summary:

```markdown
## Update Summary

**✅ Confirmed Technologies** (already documented and detected):
- React, Next.js, Express, PostgreSQL, Jest

**🔄 Version Updates**:
- Next.js: v13.0.0 → v14.0.0
- Tailwind CSS: v3.0.0 → v3.3.0

**➕ New Technologies Added**:
- Docker (detected from Dockerfile, docker-compose.yml)
- Redis (detected from docker-compose.yml)
- Playwright (detected from playwright.config.ts)

**⚠️ Flagged for Review**:
- MongoDB (declared but not detected)

**📝 Preserved**:
- All existing rationale sections
- Custom organization and notes
- Architecture decision records

**File location:** `devorch/tech-stack.md`
```

## Important Notes

- This workflow produces the FINAL tech-stack.md file
- All user content must be preserved
- New additions should prompt for documentation
- Discrepancies should be flagged, not auto-resolved
- The file should be human-readable and maintainable
- Timestamps help track evolution over time
