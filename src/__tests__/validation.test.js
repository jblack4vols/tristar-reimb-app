import { validatePatientName, validatePassword, validateRate, validateRequired, validateUsername } from '../utils/validation';

describe('validatePatientName', () => {
  it('rejects empty name', () => {
    expect(validatePatientName('')).toContain('required');
    expect(validatePatientName('  ')).toContain('required');
    expect(validatePatientName(null)).toContain('required');
  });

  it('rejects too short name', () => {
    expect(validatePatientName('A')).toContain('at least 2');
  });

  it('rejects too long name', () => {
    expect(validatePatientName('A'.repeat(101))).toContain('too long');
  });

  it('accepts valid name', () => {
    expect(validatePatientName('John Doe')).toBeNull();
    expect(validatePatientName('Jo')).toBeNull();
  });
});

describe('validatePassword', () => {
  it('rejects empty password', () => {
    expect(validatePassword('')).toContain('required');
  });

  it('rejects short password', () => {
    expect(validatePassword('abc')).toContain('at least 8');
  });

  it('rejects overly long password', () => {
    expect(validatePassword('x'.repeat(129))).toContain('too long');
  });

  it('accepts valid password', () => {
    expect(validatePassword('password123')).toBeNull();
    expect(validatePassword('12345678')).toBeNull();
  });
});

describe('validateRate', () => {
  it('rejects non-numeric', () => {
    expect(validateRate('abc')).toContain('number');
  });

  it('rejects negative', () => {
    expect(validateRate(-5)).toContain('negative');
  });

  it('warns on very high rate', () => {
    expect(validateRate(15000)).toContain('too high');
  });

  it('accepts valid rates', () => {
    expect(validateRate(0)).toBeNull();
    expect(validateRate(45.50)).toBeNull();
    expect(validateRate(9999)).toBeNull();
  });
});

describe('validateRequired', () => {
  it('rejects empty values', () => {
    expect(validateRequired('', 'Payer')).toContain('Payer');
    expect(validateRequired(null, 'Code')).toContain('Code');
    expect(validateRequired('  ', 'Field')).toContain('Field');
  });

  it('accepts non-empty values', () => {
    expect(validateRequired('Medicare', 'Payer')).toBeNull();
  });
});

describe('validateUsername', () => {
  it('rejects empty', () => {
    expect(validateUsername('')).toContain('required');
  });

  it('rejects too short', () => {
    expect(validateUsername('a')).toContain('at least 2');
  });

  it('rejects invalid characters', () => {
    expect(validateUsername('user name')).toContain('letters');
    expect(validateUsername('user@name')).toContain('letters');
  });

  it('accepts valid usernames', () => {
    expect(validateUsername('jordan')).toBeNull();
    expect(validateUsername('j.black')).toBeNull();
    expect(validateUsername('user-123')).toBeNull();
    expect(validateUsername('user_name')).toBeNull();
  });
});
