export const STAGES = ['discovered', 'qualified', 'outreach', 'closed'] as const;
export type Stage = typeof STAGES[number];
export const VALID_STAGES = new Set<string>(STAGES);
