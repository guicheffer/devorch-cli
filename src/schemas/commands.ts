import { z } from 'zod';
import { sourceSchema } from './base';

export const commandFrontmatterSchema = sourceSchema.extend({
  schema: z.enum(['command-multi-agent', 'command-single-agent']),
  mode: z.enum(['multi-agent', 'single-agent']),
});

export const commandFrontmatterSchemas = {
  command: commandFrontmatterSchema,
  'command-multi-agent': commandFrontmatterSchema,
  'command-single-agent': commandFrontmatterSchema,
};

export type CommandFrontmatterSchema = z.infer<typeof commandFrontmatterSchema>;
