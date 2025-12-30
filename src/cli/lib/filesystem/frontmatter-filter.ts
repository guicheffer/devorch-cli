import type { CodingAgent } from '../../types/index.js';

type AssetType = 'subagent' | 'command' | 'skill';

/**
 * Get frontmatter fields to include for a specific AI agent and file type
 */
export function getAgentFrontmatterFields(_agent: CodingAgent, fileType: AssetType): string[] {
  // Claude Code only (Cursor no longer supported)
  if (fileType === 'subagent') {
    return ['name', 'description', 'category', 'tools', 'model', 'color', 'dependencies'];
  } else {
    // Commands for Claude Code
    return ['name', 'description', 'mode', 'dependencies'];
  }
}
