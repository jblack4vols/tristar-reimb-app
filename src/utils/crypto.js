import CryptoJS from 'crypto-js';

const ENC_KEY = import.meta.env.VITE_PHI_ENCRYPTION_KEY;

if (!ENC_KEY) {
  throw new Error('Missing VITE_PHI_ENCRYPTION_KEY environment variable. PHI encryption requires this key.');
}

export function encryptPHI(plaintext) {
  if (!plaintext) return '';
  const iv = CryptoJS.lib.WordArray.random(16);
  const encrypted = CryptoJS.AES.encrypt(plaintext, CryptoJS.enc.Utf8.parse(ENC_KEY.padEnd(32).slice(0, 32)), {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  // Prefix IV to ciphertext so we can decrypt later
  return iv.toString(CryptoJS.enc.Base64) + ':' + encrypted.toString();
}

export function decryptPHI(ciphertext) {
  if (!ciphertext) return '';
  try {
    // New format: IV:ciphertext
    if (ciphertext.includes(':')) {
      const [ivBase64, ct] = ciphertext.split(':');
      const iv = CryptoJS.enc.Base64.parse(ivBase64);
      const decrypted = CryptoJS.AES.decrypt(ct, CryptoJS.enc.Utf8.parse(ENC_KEY.padEnd(32).slice(0, 32)), {
        iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });
      const result = decrypted.toString(CryptoJS.enc.Utf8);
      if (result) return result;
    }
    // Legacy format: passphrase-based (for existing data)
    const bytes = CryptoJS.AES.decrypt(ciphertext, ENC_KEY);
    const result = bytes.toString(CryptoJS.enc.Utf8);
    if (result) return result;
    // Could not decrypt — return empty rather than exposing ciphertext
    return '[encrypted]';
  } catch {
    return '[encrypted]';
  }
}
