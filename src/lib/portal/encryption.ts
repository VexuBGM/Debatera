/**
 * Portal Token Encryption
 *
 * AES-256-GCM encryption for storing portal tokens reversibly.
 * The encryption key is derived from CLERK_SECRET_KEY via SHA-256.
 * This allows organizers to view existing portal links without regenerating.
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

function getEncryptionKey(): Buffer {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) {
    throw new Error('CLERK_SECRET_KEY is required for portal token encryption');
  }
  return createHash('sha256').update(secret).digest();
}

export function encryptToken(token: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${authTag.toString('base64')}.${encrypted.toString('base64')}`;
}

export function decryptToken(encryptedValue: string): string | null {
  try {
    const key = getEncryptionKey();
    const [ivB64, tagB64, ciphertextB64] = encryptedValue.split('.');
    if (!ivB64 || !tagB64 || !ciphertextB64) return null;
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(tagB64, 'base64');
    const ciphertext = Buffer.from(ciphertextB64, 'base64');
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(ciphertext, undefined, 'utf8') + decipher.final('utf8');
  } catch {
    return null;
  }
}
