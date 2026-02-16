/**
 * Custom hook for input validation and sanitization
 * Provides reusable validation logic for form inputs
 */

import { useState, useCallback } from 'react';
import { 
  sanitizeInput, 
  validateAndSanitizeString, 
  sanitizeNumericInput,
  sanitizeUrlInput,
  sanitizeEmailInput
} from '../utils/inputSanitizer';

interface ValidationResult {
  value: string | number;
  isValid: boolean;
  error?: string;
}

interface ValidationRules {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  type?: 'string' | 'number' | 'email' | 'url';
}

export const useInputValidation = (initialValue: string | number = '', rules: ValidationRules = {}) => {
  const [value, setValue] = useState<string | number>(initialValue);
  const [error, setError] = useState<string>('');

  const validate = useCallback((inputValue: string | number): ValidationResult => {
    // Handle required fields
    if (rules.required && (!inputValue || (typeof inputValue === 'string' && inputValue.trim() === ''))) {
      return {
        value: '',
        isValid: false,
        error: 'This field is required'
      };
    }

    // Skip validation for empty non-required fields
    if (!rules.required && (!inputValue || (typeof inputValue === 'string' && inputValue.trim() === ''))) {
      return {
        value: inputValue,
        isValid: true
      };
    }

    // Type-specific validation
    if (rules.type === 'email') {
      const result = sanitizeEmailInput(String(inputValue));
      return {
        value: result.value,
        isValid: result.isValid,
        error: result.error
      };
    }

    if (rules.type === 'url') {
      const result = sanitizeUrlInput(String(inputValue));
      return {
        value: result.value,
        isValid: result.isValid,
        error: result.error
      };
    }

    if (rules.type === 'number') {
      const result = sanitizeNumericInput(inputValue, rules.min, rules.max);
      return {
        value: result.value,
        isValid: result.isValid,
        error: result.error
      };
    }

    // String validation
    const stringResult = validateAndSanitizeString(
      String(inputValue), 
      rules.minLength || 0, 
      rules.maxLength || 1000
    );

    // Pattern validation
    if (stringResult.isValid && rules.pattern && !rules.pattern.test(stringResult.value)) {
      return {
        value: stringResult.value,
        isValid: false,
        error: 'Input does not match the required pattern'
      };
    }

    return {
      value: stringResult.value,
      isValid: stringResult.isValid,
      error: stringResult.error
    };
  }, [rules]);

  const handleChange = useCallback((newValue: string | number) => {
    setValue(newValue);
    const result = validate(newValue);
    setError(result.error || '');
    return result;
  }, [validate]);

  const reset = useCallback(() => {
    setValue(initialValue);
    setError('');
  }, [initialValue]);

  return {
    value,
    error,
    isValid: !error,
    handleChange,
    validate,
    reset
  };
};

export default useInputValidation;
