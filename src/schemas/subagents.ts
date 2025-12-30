import { z } from 'zod';
import { sourceSchema } from './base';

export const baseAgentFrontmatterSchema = sourceSchema.extend({
  schema: z.enum([
    'specification-agent',
    'implementation-agent',
    'implementer-agent',
    'verifier-agent',
    'base-agent',
    'panic-agent',
    'subagent',
  ]),
  context_training_role: z
    .enum(['specification', 'implementation', 'none'])
    .describe(
      'Determines which context-training content this subagent receives: ' +
        'specification (spec style guidelines), ' +
        'implementation (available implementers/verifiers), ' +
        'none (no context training needed)'
    ),
  tools: z.string().optional(),
  color: z.string(),
  model: z.literal('inherit'),
});

export const specificationAgentFrontmatterSchema = baseAgentFrontmatterSchema;

export const implementationAgentFrontmatterSchema = baseAgentFrontmatterSchema;

export const baseAgentFrontmatterSchemaRequired = baseAgentFrontmatterSchema;

export const panicAgentFrontmatterSchema = baseAgentFrontmatterSchema;

export const subagentFrontmatterSchemas = {
  'implementer-agent': baseAgentFrontmatterSchema,
  'verifier-agent': baseAgentFrontmatterSchema,
  'specification-agent': specificationAgentFrontmatterSchema,
  'implementation-agent': implementationAgentFrontmatterSchema,
  'panic-agent': panicAgentFrontmatterSchema,
  'base-agent': baseAgentFrontmatterSchemaRequired,
  subagent: baseAgentFrontmatterSchema,
};

export type AgentFrontmatterSchema = z.infer<
  (typeof subagentFrontmatterSchemas)[keyof typeof subagentFrontmatterSchemas]
>;
export type SpecificationAgentFrontmatterSchema = z.infer<
  typeof specificationAgentFrontmatterSchema
>;
export type PanicAgentFrontmatterSchema = z.infer<typeof panicAgentFrontmatterSchema>;
