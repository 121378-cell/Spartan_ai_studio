import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

/**
 * Hashes a plain text password
 * @param password The plain text password to hash
 * @returns The hashed password
 */
export const hashPassword = (password: string): Promise<string> => bcrypt.hash(password, SALT_ROUNDS);

/**
 * Compares a plain text password with a hashed password
 * @param password The plain text password
 * @param hashedPassword The hashed password to compare against
 * @returns True if the passwords match, false otherwise
 */
export const comparePasswords = (
  password: string,
  hashedPassword: string
): Promise<boolean> => bcrypt.compare(password, hashedPassword);

/**
 * Validates password strength
 * @param password The password to validate
 * @returns True if the password meets strength requirements, false otherwise
 */
export const validatePasswordStrength = (password: string): boolean => {
  // Minimum 8 characters, at least one uppercase letter, one lowercase letter, and one number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};
