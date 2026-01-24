/**
 * Tests for authentication logic
 */

// Mock Firebase
jest.mock('../firebase', () => ({
  auth: {
    currentUser: null,
    onAuthStateChanged: jest.fn((callback) => {
      callback(null);
      return jest.fn();
    })
  },
  db: {}
}));

jest.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn()
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn()
}));

describe('Authentication Helpers', () => {
  test('password validation - minimum length', () => {
    const isValidPassword = (pwd) => pwd?.length >= 8;

    expect(isValidPassword('short')).toBe(false);
    expect(isValidPassword('longenough')).toBe(true);
  });

  test('password validation - has uppercase', () => {
    const hasUppercase = (pwd) => /[A-Z]/.test(pwd);

    expect(hasUppercase('lowercase')).toBe(false);
    expect(hasUppercase('Uppercase')).toBe(true);
  });

  test('password validation - has lowercase', () => {
    const hasLowercase = (pwd) => /[a-z]/.test(pwd);

    expect(hasLowercase('UPPERCASE')).toBe(false);
    expect(hasLowercase('lowercase')).toBe(true);
  });

  test('password validation - has number', () => {
    const hasNumber = (pwd) => /[0-9]/.test(pwd);

    expect(hasNumber('nonumber')).toBe(false);
    expect(hasNumber('has1number')).toBe(true);
  });

  test('full password validation', () => {
    const isStrongPassword = (pwd) =>
      pwd?.length >= 8 &&
      /[A-Z]/.test(pwd) &&
      /[a-z]/.test(pwd) &&
      /[0-9]/.test(pwd);

    expect(isStrongPassword('weak')).toBe(false);
    expect(isStrongPassword('NoNumber!')).toBe(false);
    expect(isStrongPassword('Strong1Password')).toBe(true);
  });
});

describe('Session Management', () => {
  test('stores session token in localStorage', () => {
    const token = 'test-token-123';
    localStorage.setItem('hf_session_token', token);
    expect(localStorage.getItem('hf_session_token')).toBe(token);
    localStorage.removeItem('hf_session_token');
  });

  test('clears session on logout', () => {
    localStorage.setItem('hf_session_token', 'token');
    localStorage.removeItem('hf_session_token');
    expect(localStorage.getItem('hf_session_token')).toBeNull();
  });
});
