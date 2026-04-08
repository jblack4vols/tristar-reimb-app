import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';

describe('Authentication', () => {
  it('bcrypt hash and compare works correctly', () => {
    const password = 'TestPassword123!';
    const hash = bcrypt.hashSync(password, 12);

    expect(bcrypt.compareSync(password, hash)).toBe(true);
    expect(bcrypt.compareSync('wrong-password', hash)).toBe(false);
  });

  it('bcrypt produces different hashes for same password', () => {
    const password = 'SamePassword';
    const hash1 = bcrypt.hashSync(password, 10);
    const hash2 = bcrypt.hashSync(password, 10);

    expect(hash1).not.toBe(hash2); // Different salts
    expect(bcrypt.compareSync(password, hash1)).toBe(true);
    expect(bcrypt.compareSync(password, hash2)).toBe(true);
  });

  it('detects already-hashed passwords', () => {
    const hash = bcrypt.hashSync('test', 10);
    expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);
    expect('plaintext'.startsWith('$2')).toBe(false);
  });
});
