import dotenv from 'dotenv';
import path from 'path';

// Load .env.test from backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

// Safe defaults to avoid order-dependent failures when a suite mutates process.env
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'test_jwt_secret_minimum_32_characters_long_for_tests_only';
process.env.SESSION_SECRET =
  process.env.SESSION_SECRET || 'test_session_secret_minimum_32_chars_for_tests_only';
process.env.JWT_ALGO = process.env.JWT_ALGO || 'HS256';
process.env.DATABASE_TYPE = process.env.DATABASE_TYPE || 'sqlite';
