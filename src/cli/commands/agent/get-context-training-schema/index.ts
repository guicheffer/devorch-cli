/**
 * Get context-training schema for AI agents
 * Machine-readable schema output for implementer/verifier frontmatter
 */

import type { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { GlobalOptions } from '@/cli/lib/cli/command-registry.js';
import { flushAndExit } from '@/cli/lib/telemetry/telemetry.js';
import {
  implementerFrontmatterSchema,
  verifierFrontmatterSchema,
} from '@/schemas/context-training.js';
import { logger } from '@/utils/logger.js';
import { stringifyYaml } from '@/utils/yaml.js';

interface GetContextTrainingSchemaOptions extends GlobalOptions {
  format?: 'yaml' | 'json';
  schemaType?: 'implementer' | 'verifier';
}

/**
 * Get-context-training-schema command
 * Usage:
 *   devorch agent get-context-training-schema <type>  # Output schema for type
 *   devorch agent get-context-training-schema implementer
 *   devorch agent get-context-training-schema verifier
 */
export async function getContextTrainingSchemaCommand(
  options: GetContextTrainingSchemaOptions = {}
): Promise<void> {
  const format = options.format || 'yaml';
  const schemaType = options.schemaType;

  // Validate schema type
  if (!schemaType || !['implementer', 'verifier'].includes(schemaType)) {
    logger.error('Invalid schema type. Must be one of: implementer, verifier');
    console.log('SCHEMA_TYPE=invalid');
    console.log('VALID_TYPES=implementer,verifier');
    await flushAndExit(1);
  }

  try {
    // Select the appropriate schema
    let schema: z.ZodTypeAny;
    let schemaName: string;

    switch (schemaType) {
      case 'implementer':
        schema = implementerFrontmatterSchema;
        schemaName = 'Implementer Frontmatter';
        break;
      case 'verifier':
        schema = verifierFrontmatterSchema;
        schemaName = 'Verifier Frontmatter';
        break;
    }

    // Convert Zod schema to JSON Schema
    const jsonSchema = zodToJsonSchema(schema, {
      name: schemaName,
      $refStrategy: 'none',
    });

    logger.debug('JSON Schema generated', { jsonSchema });

    // Output in requested format
    if (format === 'json') {
      console.log(JSON.stringify(jsonSchema, null, 2));
    } else {
      // YAML format (default)
      // Extract the actual schema properties (might be nested under definitions)
      interface JsonSchemaProperty {
        type?: string;
        description?: string;
        [key: string]: unknown;
      }

      interface JsonSchemaDefinition {
        properties?: Record<string, JsonSchemaProperty>;
        required?: string[];
        [key: string]: unknown;
      }

      interface JsonSchemaRoot {
        properties?: Record<string, JsonSchemaProperty>;
        required?: string[];
        definitions?: Record<string, JsonSchemaDefinition>;
        [key: string]: unknown;
      }

      const typedJsonSchema = jsonSchema as JsonSchemaRoot;
      let properties = typedJsonSchema.properties || {};
      let required = typedJsonSchema.required || [];

      // Check if schema is in definitions (zod-to-json-schema format)
      if (Object.keys(properties).length === 0 && typedJsonSchema.definitions) {
        const def = Object.values(typedJsonSchema.definitions)[0];
        properties = def?.properties || {};
        required = def?.required || [];
      }

      // Create a simplified schema representation
      const yamlSchema = {
        type: schemaType,
        required_fields: required,
        fields: Object.entries(properties).map(([name, prop]) => ({
          name,
          type: prop.type,
          description: prop.description || '',
          required: required.includes(name),
        })),
      };

      console.log(stringifyYaml(yamlSchema));
    }

    logger.debug('Schema output successfully', {
      schemaType,
      format,
    });

    await flushAndExit(0);
  } catch (err) {
    logger.error('get-context-training-schema command failed', { error: err });

    // Output error in machine-readable format
    console.log('ERROR=command_failed');
    console.log(`MESSAGE=${err instanceof Error ? err.message : 'Unknown error'}`);
    await flushAndExit(2);
  }
}
