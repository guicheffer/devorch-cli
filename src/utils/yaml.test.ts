import { describe, expect, it } from 'bun:test';
import { parseYaml, stringifyYaml } from '@/utils/yaml.js';

describe('yaml', () => {
  describe('parseYaml', () => {
    it('should parse valid YAML', () => {
      const yaml = `
name: test
value: 42
      `;
      const result = parseYaml(yaml);
      expect(result).toEqual({ name: 'test', value: 42 });
    });

    it('should throw on invalid YAML', () => {
      expect(() => parseYaml('invalid: [yaml')).toThrow();
    });
  });

  describe('stringifyYaml', () => {
    it('should stringify object to YAML', () => {
      const obj = { name: 'test', value: 42 };
      const result = stringifyYaml(obj);
      expect(result).toContain('name: test');
      expect(result).toContain('value: 42');
    });
  });
});
