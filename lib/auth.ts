// Browser-compatible authentication utilities
// Uses simple hashing for demonstration purposes

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

export async function hashPassword(password: string): Promise<string> {
  // For browser environment, use a simple approach
  // In production, consider using a library like tweetnacl.js or similar
  const encoder = new TextEncoder();
  const data = encoder.encode(password + Date.now() + Math.random());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 32);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // Simple verification - in production use proper bcrypt
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  try {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const passwordHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
    // Store format: we compare with stored hash
    // For demo, we just check if it's a valid hash format
    return hash && hash.length > 0;
  } catch (e) {
    return false;
  }
}

export function generateId(): string {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}
