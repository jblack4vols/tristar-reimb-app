import { describe, it, expect, vi, beforeAll } from 'vitest';

// Mock import.meta.env before importing crypto module
beforeAll(() => {
  vi.stubEnv('VITE_PHI_ENCRYPTION_KEY', 'test-key-for-unit-tests-32chars!');
});

describe('PHI Encryption', () => {
  it('encrypts and decrypts plaintext correctly', async () => {
    const { encryptPHI, decryptPHI } = await import('../utils/crypto.js');
    const original = 'John Doe';
    const encrypted = encryptPHI(original);

    expect(encrypted).not.toBe(original);
    expect(encrypted).toContain(':'); // IV:ciphertext format
    expect(decryptPHI(encrypted)).toBe(original);
  });

  it('returns empty string for empty input', async () => {
    const { encryptPHI, decryptPHI } = await import('../utils/crypto.js');
    expect(encryptPHI('')).toBe('');
    expect(encryptPHI(null)).toBe('');
    expect(decryptPHI('')).toBe('');
    expect(decryptPHI(null)).toBe('');
  });

  it('produces different ciphertexts for same input (random IV)', async () => {
    const { encryptPHI } = await import('../utils/crypto.js');
    const a = encryptPHI('Jane Smith');
    const b = encryptPHI('Jane Smith');
    expect(a).not.toBe(b); // Different IVs
  });

  it('handles legacy unencrypted data gracefully', async () => {
    const { decryptPHI } = await import('../utils/crypto.js');
    const legacyPlain = 'Plain Text Name';
    // Should return original if decryption fails
    expect(decryptPHI(legacyPlain)).toBe(legacyPlain);
  });
});
