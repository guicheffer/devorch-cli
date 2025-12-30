#!/usr/bin/env bun

/**
 * Parses PLAN.md and generates a matrix for GitHub Actions
 * Extracts phases with incomplete tasks for sequential execution
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface Phase {
  phase_number: number;
  phase_name: string;
  has_incomplete_tasks: boolean;
}

/**
 * Parse PLAN.md to extract phases
 */
export function parsePlan(content: string): Phase[] {
  const lines = content.split('\n');
  const phases: Phase[] = [];
  let currentPhase: Phase | null = null;

  for (const line of lines) {
    // Match phase headers: ## Phase 1: Phase Name
    const phaseMatch = line.match(/^##\s+Phase\s+(\d+):\s*(.+)/i);
    if (phaseMatch) {
      const [, phaseNum, phaseName] = phaseMatch;

      if (currentPhase) {
        phases.push(currentPhase);
      }

      currentPhase = {
        phase_number: parseInt(phaseNum ?? '0', 10),
        phase_name: (phaseName ?? '').trim(),
        has_incomplete_tasks: false,
      };
      continue;
    }

    // Check for incomplete tasks: - [ ]
    if (currentPhase && line.match(/^\s*-\s+\[\s+\]/)) {
      currentPhase.has_incomplete_tasks = true;
    }
  }

  // Add last phase
  if (currentPhase) {
    phases.push(currentPhase);
  }

  return phases;
}

/**
 * Generate GitHub Actions matrix JSON
 */
export function generateMatrix(phases: Phase[]): string {
  // Only include phases with incomplete tasks
  const incompletePhasesPhases = phases.filter((p) => p.has_incomplete_tasks);

  const matrix = {
    include: incompletePhasesPhases.map((phase) => ({
      phase_number: phase.phase_number,
      phase_name: phase.phase_name,
    })),
  };

  return JSON.stringify(matrix, null, 2);
}

async function main() {
  try {
    const planPath = join(process.cwd(), 'PLAN.md');
    const content = readFileSync(planPath, 'utf8');

    const phases = parsePlan(content);
    const matrix = generateMatrix(phases);

    console.log(matrix);
  } catch (error) {
    console.error('Error parsing PLAN.md:', error);

    // Return empty matrix on error
    console.log(
      JSON.stringify(
        {
          include: [],
        },
        null,
        2
      )
    );
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
