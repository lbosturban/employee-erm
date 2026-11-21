/**
 * Generates a UUID-like unique identifier.
 * Uses the native crypto API when available and falls back to a
 * timestamp + random counter for environments without crypto.randomUUID.
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Returns the current UTC time as an ISO-8601 string. */
export function nowIso(): string {
  return new Date().toISOString();
}
