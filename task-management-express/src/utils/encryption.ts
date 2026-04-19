/**
 * Encryption Utility for Sensitive Data
 * 
 * Provides AES-256-CBC encryption/decryption for sensitive data like OAuth tokens
 * 
 * @usage
 * import { encrypt, decrypt } from './encryption';
 * 
 * const encrypted = encrypt('sensitive-data');
 * const decrypted = decrypt(encrypted);
 * 
 * @see masterSystemPrompt.md Section 12: Security Rules
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ENCRYPTION_KEY = process.env.OAUTH_ENCRYPTION_KEY || 'default-key-change-in-production-32';
const IV_LENGTH = 16; // AES block size

/**
 * Validate encryption key length
 * AES-256 requires 32 bytes key
 */
function getValidEncryptionKey(): Buffer {
  let key = ENCRYPTION_KEY;
  
  // Pad or truncate to 32 bytes
  if (key.length < 32) {
    key = key.padEnd(32, '0');
  } else if (key.length > 32) {
    key = key.substring(0, 32);
  }
  
  return Buffer.from(key);
}

/**
 * Encrypt sensitive text data
 * 
 * @param text - Plain text to encrypt
 * @returns Encrypted string in format: iv:encryptedData
 * 
 * @example
 * const encrypted = encrypt('oauth-token-123');
 * // Returns: "a1b2c3d4...:encrypted-data-hex"
 */
export function encrypt(text: string): string {
  try {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(
      'aes-256-cbc',
      getValidEncryptionKey(),
      iv
    );
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Return IV + encrypted data (IV needed for decryption)
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt sensitive data');
  }
}

/**
 * Decrypt encrypted text data
 * 
 * @param encryptedText - Encrypted string in format: iv:encryptedData
 * @returns Decrypted plain text
 * 
 * @example
 * const decrypted = decrypt('a1b2c3d4...:encrypted-data-hex');
 * // Returns: "oauth-token-123"
 */
export function decrypt(encryptedText: string): string {
  try {
    const parts = encryptedText.split(':');
    
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted text format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedData = parts[1];
    
    const decipher = createDecipheriv(
      'aes-256-cbc',
      getValidEncryptionKey(),
      iv
    );
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt sensitive data');
  }
}

/**
 * Check if text appears to be encrypted
 * 
 * @param text - Text to check
 * @returns true if text matches encrypted format (iv:hexData)
 */
export function isEncrypted(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }
  
  const parts = text.split(':');
  if (parts.length !== 2) {
    return false;
  }
  
  // Check if IV is valid hex (16 bytes = 32 hex chars)
  const ivPattern = /^[0-9a-f]{32}$/;
  // Check if encrypted data is valid hex
  const dataPattern = /^[0-9a-f]+$/;
  
  return ivPattern.test(parts[0]) && dataPattern.test(parts[1]);
}

/**
 * Safely decrypt - returns original text if not encrypted or on error
 * 
 * @param text - Text to decrypt (or return as-is if not encrypted)
 * @returns Decrypted text or original text if not encrypted
 */
export function safeDecrypt(text: string): string {
  if (!text || !isEncrypted(text)) {
    return text || '';
  }
  
  try {
    return decrypt(text);
  } catch (error) {
    // Return original text on decryption error
    return text;
  }
}
