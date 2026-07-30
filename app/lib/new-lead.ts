export const NEW_LEAD_WINDOW_MS = 48 * 60 * 60 * 1000; // 48 hours

export function isNewLead(createdAt: string): boolean {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return Date.now() - created < NEW_LEAD_WINDOW_MS;
}
