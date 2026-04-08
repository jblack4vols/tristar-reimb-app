/**
 * Input validation utilities for form boundaries.
 */

export function validatePatientName(name) {
  if (!name || !name.trim()) return 'Patient name is required.';
  if (name.trim().length < 2) return 'Patient name must be at least 2 characters.';
  if (name.trim().length > 100) return 'Patient name is too long.';
  return null;
}

export function validatePassword(password) {
  if (!password) return 'Password is required.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (password.length > 128) return 'Password is too long.';
  return null;
}

export function validateRate(value) {
  const num = parseFloat(value);
  if (isNaN(num)) return 'Must be a number.';
  if (num < 0) return 'Rate cannot be negative.';
  if (num > 10000) return 'Rate seems too high. Please verify.';
  return null;
}

export function validateRequired(value, fieldName) {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return `${fieldName} is required.`;
  }
  return null;
}

export function validateUsername(username) {
  if (!username || !username.trim()) return 'Username is required.';
  if (username.trim().length < 2) return 'Username must be at least 2 characters.';
  if (!/^[a-zA-Z0-9._-]+$/.test(username.trim())) return 'Username can only contain letters, numbers, dots, hyphens, and underscores.';
  return null;
}
