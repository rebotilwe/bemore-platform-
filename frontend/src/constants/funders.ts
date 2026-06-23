/**
 * Funder constants — Institutional funding partners
 * Updated: Removed PBSA, added actual institutional funders for the BeMore platform
 */

import type { FunderName } from '../types/index.ts';

// Primary funders
export const FUNDERS: FunderName[] = [
  'DBSA',
  'NHFC', 
  'NEF',
  'SAIF'
] as const;

// Funder display names
export const FUNDER_DISPLAY_NAMES: Record<string, string> = {
  DBSA: 'Development Bank of Southern Africa',
  NHFC: 'National Housing Finance Corporation',
  NEF: 'National Empowerment Fund',
  SAIF: 'South African Infrastructure Fund',
};

// Funder colors for UI badges
export const FUNDER_COLORS: Record<string, string> = {
  DBSA: '#005b9b',
  NHFC: '#e87b2d',
  NEF: '#1a7a3a',
  SAIF: '#9b2d30',
};

// Legacy export for backwards compatibility with old code
export const FUNDER_NAMES = FUNDER_DISPLAY_NAMES;

// Helper to check if a funder is valid
export function isValidFunder(name: string): boolean {
  return FUNDERS.includes(name as FunderName);
}

// Helper to get funder display name
export function getFunderDisplayName(name: string): string {
  return FUNDER_DISPLAY_NAMES[name] || name;
}