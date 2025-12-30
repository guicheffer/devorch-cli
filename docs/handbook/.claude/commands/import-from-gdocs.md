# Import and Process Google Docs Export

You are helping to import and process a Google Docs export of the AI-Native Product Development Handbook.

## Context

The handbook is maintained in Google Docs and periodically exported to this repository. The export process needs to:
1. Split the large exported file into individual markdown files by H1 headings
2. Organize files into the correct folder structure
3. Extract and organize images
4. Update image references in markdown files

## Current Structure

```
docs/handbook/
├── .claude/
│   └── commands/
├── import/              # Place Google Docs exports here (gitignored)
├── images/              # All handbook images
├── dive-deeper/         # Role-specific playbooks
│   ├── onboarding.md
│   ├── product-playbook-pm.md
│   ├── prd-feature-name.md
│   ├── ux-playbook-ux.md
│   ├── ux-spec-feature-name.md
│   ├── engineering-playbook-eng.md
│   ├── engineering-spec-feature-name.md
│   └── engineering-manager-playbook-em.md
├── README.md            # Main index
├── our-guiding-principles.md
├── the-blueprint.md
├── context-engineering.md
├── rituals-ceremonies.md
├── v0-self-assessment.md
├── dive-deeper.md
└── changelog.md
```

## Your Task

When the user says they've placed a new Google Docs export in the `import/` folder:

1. **Analyze the Import**
   - Check what file(s) are in the `import/` folder
   - Identify if it's a markdown file only or if there's an HTML file with images
   - List all H1 headings found in the file

2. **Compare with Existing Files**
   - For each H1 heading, determine which existing file it corresponds to
   - Identify any new sections that don't have a corresponding file
   - Note any sections that have been removed
   - Check for any new image references (format: `![][imageN]`)

3. **Ask for Confirmation**
   - Show the user what changes will be made
   - List which files will be updated
   - List which files will be created
   - **If new image references found**: Warn the user that images need to be extracted from HTML
   - Ask if they want to proceed

4. **Process the Import** (after confirmation)
   - Split the large file by H1 headings
   - Save each section to the appropriate file
   - Maintain the proper folder structure (files in root vs `dive-deeper/`)

   **For Image References:**
   - If `![][imageN]` references exist but no HTML file present:
     - Keep the existing image references as-is
     - Note in the summary that images need to be added later
   - If HTML file is present in import folder:
     - Extract images from the HTML export
     - Save to `images/` folder with descriptive names
     - Update all `![][imageN]` references to proper paths
   - If no new image references:
     - Skip image processing entirely

5. **Update README.md** (if needed)
   - Ensure all new sections are linked in the index
   - Keep the structure organized

6. **Clean Up**
   - Remove processed files from `import/` folder
   - Create a summary of changes made
   - List any image references that need manual attention

## Important Notes

- **Image Naming**: Give images descriptive names that match their content
  - Examples: `blueprint-think-make-cycle.png`, `context-window-diagram.png`

- **Image References**: Use relative paths
  - Root level files: `./images/filename.png`
  - dive-deeper files: `../images/filename.png`

- **H1 Mappings** (common sections):
  - "AI-Native Product Development" → `README.md`
  - "Our Guiding Principles" → `our-guiding-principles.md`
  - "The Blueprint" → `the-blueprint.md`
  - "Context Engineering" → `context-engineering.md`
  - "Rituals & Ceremonies" → `rituals-ceremonies.md`
  - "Self Assessment" / "[v0] Self Assessment" → `v0-self-assessment.md`
  - "Dive Deeper" → `dive-deeper.md`
  - "Onboarding" → `dive-deeper/onboarding.md`
  - "Product Playbook" → `dive-deeper/product-playbook-pm.md`
  - "UX Playbook" → `dive-deeper/ux-playbook-ux.md`
  - "Engineering Playbook" → `dive-deeper/engineering-playbook-eng.md`
  - "Engineering Manager Playbook" → `dive-deeper/engineering-manager-playbook-em.md`
  - "CHANGELOG" → `changelog.md`

- **Preserve Existing Images**: Don't rename or move existing images unless necessary

## Example Usage

```
User: I've exported the handbook from Google Docs and placed it in the import folder

You: Let me check the import folder and analyze the file...
[analyze the file, show comparison, ask for confirmation]

User: Yes, proceed

You: [process the import, update files, handle images]
Done! Here's what I did:
- Updated 5 existing files
- Created 2 new files
- Added 3 new images
- Summary of changes...
```
