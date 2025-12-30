import {
  commandFrontmatterSchemas,
  skillFrontmatterSchemas,
  subagentFrontmatterSchemas,
} from '@/schemas';

export function getSchemas() {
  return {
    ...commandFrontmatterSchemas,
    ...subagentFrontmatterSchemas,
    ...skillFrontmatterSchemas,
  };
}
