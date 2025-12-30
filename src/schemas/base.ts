import { z } from 'zod';

export const trackedRepositorySchema = z.object({
  url: z.string(),
  type: z.enum(['internal', 'external']),
  paths: z.array(z.string()),
  last_synced: z.string().datetime().optional(),
  sync_frequency: z.enum(['daily', 'weekly', 'monthly']),
});

export type TrackedRepository = z.infer<typeof trackedRepositorySchema>;

export const sourceSchema = z.object({
  schema: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  partials: z.record(z.string(), z.string()).optional(),
  generated_by: z.string().optional(),
  generated_at: z.string().optional(),
  generator_version: z.string().optional(),
  source_config: z.string().optional(),
  dependencies: z
    .object({
      commands: z.array(z.string()).optional(),
      subagents: z.array(z.string()).optional(),
      skills: z.array(z.string()).optional(),
    })
    .optional(),
  tracked_repositories: z.array(trackedRepositorySchema).optional(),
});
