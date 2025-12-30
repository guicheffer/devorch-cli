# How to Import Google Docs Exports

This guide explains how to update the handbook from Google Docs exports.

## Quick Start

### For Text-Only Updates (Most Common)

1. **Export from Google Docs**
   - Open the handbook in Google Docs
   - Go to File → Download → Markdown (.md)
   - This downloads a .zip file

2. **Extract and Place in Import Folder**
   - Extract the .zip file
   - Place **only the .md file** in `docs/handbook/import/`
   - You can ignore the images folder if no new images

3. **Run the Import Command**
   ```bash
   # In Claude Code, from the docs/handbook directory
   /import-from-gdocs
   ```

4. **Review and Confirm**
   - Claude will analyze the file
   - Show you what changes will be made
   - Ask for confirmation before proceeding

5. **Done!**
   - Files will be split and organized
   - Import folder will be cleaned up

### For Updates with New Images (Less Common)

If you've added new diagrams or screenshots:

1. **Export HTML instead**
   - Go to File → Download → Web Page (.html)
   - This includes embedded images

2. **Place Both Files**
   - Put the .md file in `import/`
   - Put the .html file in `import/` as well

3. **Run the Import Command**
   - The command will extract images from HTML
   - Give them descriptive names
   - Update all references

4. **Done!**
   - Text content updated
   - Images extracted and organized
   - All references updated

## What the Command Does

### Always:
- ✅ Splits the large exported file by H1 headings
- ✅ Maps sections to the correct existing files
- ✅ Creates new files for new sections
- ✅ Maintains folder structure (root vs `dive-deeper/`)
- ✅ Updates README.md index if needed
- ✅ Cleans up the import folder

### If HTML file present:
- ✅ Extracts images from HTML to the `images/` folder
- ✅ Renames images with descriptive names
- ✅ Updates all `![][imageN]` references to proper paths

### If only .md file:
- ✅ Keeps existing image references unchanged
- ✅ Notes any new image references that need attention
- ✅ Processes text content only

## Folder Structure

```
docs/handbook/
├── .claude/
│   └── commands/
│       └── import-from-gdocs.md    # The command
├── import/                          # Place exports here (gitignored)
│   └── README.md
├── images/                          # All handbook images
├── dive-deeper/                     # Role-specific playbooks
│   ├── onboarding.md
│   ├── product-playbook-pm.md
│   ├── ux-playbook-ux.md
│   ├── engineering-playbook-eng.md
│   └── engineering-manager-playbook-em.md
├── README.md                        # Main index
├── our-guiding-principles.md
├── the-blueprint.md
├── context-engineering.md
├── rituals-ceremonies.md
├── v0-self-assessment.md
├── dive-deeper.md
└── changelog.md
```

## Troubleshooting

### Images not showing up
- **For text-only updates**: This is expected - existing images remain unchanged
- **For new images**: Make sure you exported as HTML and placed both .md and .html in `import/`
- Check that image names don't have special characters

### Files not being updated
- Check that the H1 headings match expected section names
- See the command file for the mapping of headings to files

### New sections created incorrectly
- Review the H1 mapping in `.claude/commands/import-from-gdocs.md`
- You can manually move files after import if needed

### Command warns about missing images
- This means the .md has `![][imageN]` references but no HTML file
- Either: Add the .html file and re-run, or manually add images later

## Notes

- **Most updates are text-only** - just drop the .md file in `import/`
- **Only export HTML when you've added new images** to the Google Doc
- The `import/` folder is gitignored and should be empty between imports
- Always review the changes before confirming the import
- Backup files (.backup) are automatically created but also gitignored
