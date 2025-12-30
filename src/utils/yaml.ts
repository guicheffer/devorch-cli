import { parse, stringify } from 'yaml';

/**
 * Parse YAML content to object
 */
export function parseYaml(content: string): any {
  return parse(content);
}

/**
 * Stringify object to YAML
 */
export function stringifyYaml(obj: any): string {
  return stringify(obj, {
    indent: 2,
    lineWidth: 80,
  });
}
