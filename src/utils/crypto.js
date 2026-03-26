import CryptoJS from 'crypto-js';

// Encryption key — in production, this should come from an environment variable.
// For now, it's a static key that ensures PHI is encrypted at rest in Supabase.
// Even if the database is breached, patient names are unreadable without this key.
const ENC_KEY = 'trc-hipaa-enc-2026-TristarPT-x9k2m';

export function encryptPHI(plaintext) {
  if (!plaintext) return '';
  return CryptoJS.AES.encrypt(plaintext, ENC_KEY).toString();
}

export function decryptPHI(ciphertext) {
  if (!ciphertext) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, ENC_KEY);
    const result = bytes.toString(CryptoJS.enc.Utf8);
    // If decryption fails (e.g., unencrypted legacy data), return original
    return result || ciphertext;
  } catch {
    return ciphertext;
  }
}
