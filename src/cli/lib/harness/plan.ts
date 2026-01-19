/**
 * Plan parsing and analysis utilities for Harness commands
 */

import { readdirSync } from 'node:fs';
import { fileExists, readFile } from '@/utils/files.js';
import { getFeaturePath, getPlanPath, getSpecsPath } from './paths.js';

export interface Task {
  name: string;
  criteria: { text: string; checked: boolean }[];
}

export interface PlanAnalysis {
  isCompleted: boolean;
  statusLine: string | null;
  tasks: Task[];
}

export type FeatureStatus = 'completed' | 'in_progress' | 'not_started';

export interface FeatureInfo {
  status: FeatureStatus;
  specsCount: number;
  logsCount: number;
}

/**
 * Check if PLAN.md has any tasks (lines starting with "### Task")
 */
export function hasTasks(planPath: string): boolean {
  if (!fileExists(planPath)) {
    return false;
  }

  try {
    const content = readFile(planPath);
    return /^###\s+Task\s+\d+/m.test(content);
  } catch {
    return false;
  }
}

/**
 * Parse and analyze a PLAN.md file
 */
export function analyzePlan(content: string): PlanAnalysis {
  const lines = content.split('\n');
  const analysis: PlanAnalysis = {
    isCompleted: content.includes('## COMPLETED'),
    statusLine: null,
    tasks: [],
  };

  // Find status line
  const statusMatch = content.match(/^##\s+Status:\s*(.+)$/m);
  if (statusMatch) {
    analysis.statusLine = statusMatch[1].trim();
  }

  // Parse tasks
  let currentTask: Task | null = null;

  for (const line of lines) {
    // Match task headers like "### Task 1: Task Name"
    const taskMatch = line.match(/^###\s+Task\s+\d+[:.]\s*(.+)$/);
    if (taskMatch) {
      if (currentTask) {
        analysis.tasks.push(currentTask);
      }
      currentTask = { name: taskMatch[1].trim(), criteria: [] };
      continue;
    }

    // Match acceptance criteria checkboxes
    const criteriaMatch = line.match(/^-\s*\[([ xX])\]\s*(.+)$/);
    if (criteriaMatch && currentTask) {
      currentTask.criteria.push({
        checked: criteriaMatch[1].toLowerCase() === 'x',
        text: criteriaMatch[2].trim(),
      });
    }
  }

  // Don't forget the last task
  if (currentTask) {
    analysis.tasks.push(currentTask);
  }

  return analysis;
}

/**
 * Get summary info about a feature (status, specs count, logs count)
 */
export function getFeatureInfo(featureName: string): FeatureInfo {
  const planPath = getPlanPath(featureName);
  const specsPath = getSpecsPath(featureName);
  const logsPath = `${getFeaturePath(featureName)}/logs`;

  // Count specs
  let specsCount = 0;
  if (fileExists(specsPath)) {
    try {
      const files = readdirSync(specsPath);
      specsCount = files.filter((f) => f.endsWith('.md')).length;
    } catch {
      // Ignore errors
    }
  }

  // Count logs
  let logsCount = 0;
  if (fileExists(logsPath)) {
    try {
      const files = readdirSync(logsPath);
      logsCount = files.filter((f) => f.startsWith('iteration-')).length;
    } catch {
      // Ignore errors
    }
  }

  // Determine status from PLAN.md
  let status: FeatureStatus = 'not_started';
  if (fileExists(planPath)) {
    try {
      const content = readFile(planPath);
      if (content.includes('## COMPLETED')) {
        status = 'completed';
      } else if (logsCount > 0 || content.includes('[x]') || content.includes('[X]')) {
        status = 'in_progress';
      }
    } catch {
      // Ignore errors
    }
  }

  return { status, specsCount, logsCount };
}

/**
 * Count total and completed acceptance criteria from plan analysis
 */
export function countCriteria(analysis: PlanAnalysis): { total: number; completed: number } {
  const total = analysis.tasks.reduce((sum, t) => sum + t.criteria.length, 0);
  const completed = analysis.tasks.reduce(
    (sum, t) => sum + t.criteria.filter((c) => c.checked).length,
    0
  );
  return { total, completed };
}
