import crypto from 'crypto';
import dotenv from 'dotenv';
import { config } from '../config';
dotenv.config();

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

const KEY = Buffer.from(config.calendly.encryptionKey, 'hex'); // Must be 32 bytes

export function encrypt(text:string) {
  if (!text) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  
  return [
    iv.toString('hex'),
    encrypted.toString('hex'),
    authTag.toString('hex')
  ].join(':');
}

export function decrypt(encryptedText:string) {
  if (!encryptedText) return null;
  const [ivHex, encryptedHex, authTagHex] = encryptedText.split(':');
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    KEY,
    Buffer.from(ivHex, 'hex')
  );
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final()
  ]);
  
  return decrypted.toString('utf8');
}
