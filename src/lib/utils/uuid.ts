// Utility functions for UUID validation and handling
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export function ensureCompleteUUID(id: string): string {
  // If it's already a valid UUID, return it
  if (isValidUUID(id)) return id;
  
  // If it's a shortened UUID, pad it
  if (/^[0-9a-f]{8}$/i.test(id)) {
    return `${id}-0000-4000-a000-000000000000`;
  }
  
  throw new Error('Invalid UUID format');
}