import { describe, expect, it } from 'bun:test';
import {
  getAsciiArt,
  loadTemplate,
  renderCreateSpecsPrompt,
  renderPlanTemplate,
  renderPromptTemplate,
  renderTemplate,
} from '@/cli/lib/harness/templates.js';

describe('lib/harness/templates', () => {
  describe('loadTemplate', () => {
    it('should load ascii-art.txt', () => {
      const content = loadTemplate('ascii-art.txt');
      expect(content.length).toBeGreaterThan(100);
    });

    it('should load PLAN.template.md', () => {
      const content = loadTemplate('PLAN.template.md');
      expect(content).toContain('{{FEATURE_NAME}}');
    });

    it('should load PROMPT.template.md', () => {
      const content = loadTemplate('PROMPT.template.md');
      expect(content).toContain('{{{FEATURE_NAME}}}');
    });

    it('should load create-specs-prompt.md', () => {
      const content = loadTemplate('create-specs-prompt.md');
      expect(content).toContain('{{{FEATURE_NAME}}}');
      expect(content).toContain('{{{DESCRIPTION}}}');
    });
  });

  describe('renderTemplate', () => {
    it('should render template with context', () => {
      const rendered = renderTemplate('PLAN.template.md', {
        FEATURE_NAME: 'my-feature',
      });
      expect(rendered).toContain('my-feature');
      expect(rendered).not.toContain('{{FEATURE_NAME}}');
    });
  });

  describe('getAsciiArt', () => {
    it('should return ascii art content', () => {
      const art = getAsciiArt();
      expect(art.length).toBeGreaterThan(0);
    });
  });

  describe('renderPromptTemplate', () => {
    it('should render with feature name, harness dir, and context training', () => {
      const rendered = renderPromptTemplate('auth-system', 'mobile-app');
      expect(rendered).toContain('auth-system');
      expect(rendered).toContain('devorch/harness/auth-system');
      expect(rendered).toContain('devorch/context-training/mobile-app');
    });
  });

  describe('renderPlanTemplate', () => {
    it('should render with feature name', () => {
      const rendered = renderPlanTemplate('auth-system');
      expect(rendered).toContain('auth-system');
    });
  });

  describe('renderCreateSpecsPrompt', () => {
    it('should render with all context', () => {
      const rendered = renderCreateSpecsPrompt(
        'auth-system',
        'Build user authentication',
        'devorch/harness/auth-system/specs'
      );
      expect(rendered).toContain('auth-system');
      expect(rendered).toContain('Build user authentication');
      expect(rendered).toContain('devorch/harness/auth-system/specs');
    });
  });
});
