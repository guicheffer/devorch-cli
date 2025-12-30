export * from './commands';
// Backward compatibility aliases for commands
export {
  type CommandFrontmatterSchema as CommandConfig,
  commandFrontmatterSchema as commandConfigSchema,
} from './commands';

export * from './config';

export * from './skills';
// Backward compatibility aliases for skills
export {
  type SkillFrontmatterSchema as SkillConfig,
  skillFrontmatterSchema as skillConfigSchema,
} from './skills';

export * from './subagents';
// Backward compatibility aliases for subagents
export { baseAgentFrontmatterSchema as subagentConfigSchema } from './subagents';

// Export type alias for SubagentConfig
import type { z } from 'zod';
import type { baseAgentFrontmatterSchema } from './subagents';
export type SubagentConfig = z.infer<typeof baseAgentFrontmatterSchema>;

export * from './skill-updater';
