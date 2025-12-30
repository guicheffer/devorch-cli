import { z } from 'zod';
import { sourceSchema } from './base';

// Simple skill schema for template skills (manual skills in templates/)
// Override schema to be optional since template skills don't have it
export const simpleSkillFrontmatterSchema = sourceSchema.extend({
  description: z.string(),
});

// Foundry skill schema for generated skills with learning sources
export const foundrySkillFrontmatterSchema = sourceSchema.extend({
  context: z.string().optional(),

  learning_sources: z.object({
    primary_repo: z.object({
      url: z.string(),
      type: z.enum(['internal', 'external']),
      branches: z.array(z.string()).default(['main']),
      paths: z.array(z.string()).default([]),
    }),
    api_reference_repo: z
      .object({
        url: z.string(),
        type: z.enum(['internal', 'external']),
        branches: z.array(z.string()).default(['main']),
        paths: z.array(z.string()).default([]),
      })
      .optional(),
    documentation: z.array(z.string()).optional(),
  }),

  extraction_rules: z.array(z.string()),
  extraction_focus: z.string(),
});

// Backward compatibility: use simple schema by default for 'skill'
export const skillFrontmatterSchema = simpleSkillFrontmatterSchema;

export const skillFrontmatterSchemas = {
  skill: simpleSkillFrontmatterSchema,
  'skill-foundry': foundrySkillFrontmatterSchema,
};

export type SkillFrontmatterSchema = z.infer<typeof skillFrontmatterSchema>;
