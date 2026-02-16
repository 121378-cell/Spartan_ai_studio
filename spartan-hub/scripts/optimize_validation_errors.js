/**
 * Validation Error Optimization Script
 * Optimiza los mensajes de error de validación para ser más claros y consistentes
 */

const fs = require('fs');
const path = require('path');

// Mensajes de error mejorados
const improvedErrorMessages = {
  // Mensajes genéricos de Zod
  'String must contain at least': 'Must be at least',
  'String must contain at most': 'Must be no more than',
  'Invalid uuid': 'Must be a valid UUID format',
  'Invalid email': 'Must be a valid email address',
  'Expected number': 'Must be a number',
  'Expected boolean': 'Must be true or false',
  'Expected array': 'Must be a list of items',
  
  // Mensajes específicos para campos comunes
  'name': 'Name',
  'email': 'Email',
  'password': 'Password',
  'quest': 'Quest',
  'focus': 'Focus',
  'duration': 'Duration',
  'sets': 'Sets',
  'reps': 'Reps',
  'rir': 'RIR (Reps in Reserve)',
  'restSeconds': 'Rest time',
  'userId': 'User ID',
  'routineId': 'Routine ID',
  'sessionId': 'Session ID',
  'page': 'Page number',
  'limit': 'Limit',
  'search': 'Search term',
  'id': 'ID',
  'title': 'Title',
  'description': 'Description',
  'body': 'Content',
  'type': 'Type',
  'target': 'Target value',
  'unit': 'Unit of measurement',
  'currentStreak': 'Current streak',
  'longestStreak': 'Longest streak',
  'notificationTime': 'Notification time',
  'targetBedtime': 'Target bedtime',
  'calorieGoal': 'Calorie goal',
  'proteinGoal': 'Protein goal',
  'weightKg': 'Weight',
  'energyLevel': 'Energy level',
  'stressLevel': 'Stress level',
  'focusLevel': 'Focus level',
  'daysPerWeek': 'Days per week',
  'timePerSession': 'Time per session',
  'experienceLevel': 'Experience level',
  'communicationTone': 'Communication tone',
  'nutritionPriority': 'Nutrition priority',
  'activeMobilityIssues': 'Active mobility issues',
  'phase': 'Training phase',
  'startDate': 'Start date',
  'anchor': 'Habit anchor',
  'coachTip': 'Coach tip',
  'tempo': 'Exercise tempo'
};

// Sufijos de mensajes de error comunes
const errorSuffixes = {
  'character(s)': 'character(s) long',
  'number': 'number',
  'integer': 'whole number',
  'positive': 'positive number',
  'boolean': 'true or false value',
  'array': 'list of items',
  'object': 'valid object',
  'date': 'valid date',
  'email': 'valid email address',
  'uuid': 'valid UUID format'
};

/**
 * Optimizar un mensaje de error
 */
function optimizeErrorMessage(message) {
  if (!message) return message;
  
  let optimized = message;
  
  // Reemplazar mensajes genéricos
  Object.entries(improvedErrorMessages).forEach(([old, newMsg]) => {
    if (optimized.includes(old)) {
      optimized = optimized.replace(old, newMsg);
    }
  });
  
  // Mejorar sufijos de mensajes
  Object.entries(errorSuffixes).forEach(([old, newSuffix]) => {
    if (optimized.includes(old)) {
      optimized = optimized.replace(old, newSuffix);
    }
  });
  
  // Formatear mensajes para que sean más claros
  optimized = optimized
    .replace(/([a-z])([A-Z])/g, '$1 $2') // Separar camelCase
    .replace(/\s+/g, ' ') // Normalizar espacios
    .trim();
  
  // Asegurar que el mensaje comience con mayúscula
  if (optimized.length > 0) {
    optimized = optimized.charAt(0).toUpperCase() + optimized.slice(1);
  }
  
  return optimized;
}

/**
 * Mejorar el middleware de validación
 */
function improveValidationMiddleware() {
  console.log('🔧 Mejorando middleware de validación...\n');
  
  const middlewarePath = path.join(__dirname, 'backend/src/middleware/validate.ts');
  
  if (!fs.existsSync(middlewarePath)) {
    console.log('❌ Archivo de middleware no encontrado');
    return;
  }
  
  const content = fs.readFileSync(middlewarePath, 'utf8');
  
  // Nueva implementación del middleware con mensajes mejorados
  const improvedMiddleware = `import { Request, Response, NextFunction } from 'express';
import { ZodTypeAny, ZodError } from 'zod';
import { ValidationError } from '../utils/errorHandler';
import { ValidationService } from '../services/validationService';

export const validate = (schema: ZodTypeAny) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      }) as {
        body?: Record<string, unknown>;
        query?: Record<string, unknown>;
        params?: Record<string, unknown>;
      };

      // Sanitize and validate the data before replacing
      if (validatedData.body) {
        // Apply additional sanitization to the body
        req.body = sanitizeInput(validatedData.body) as Record<string, unknown>;
      }
      if (validatedData.query) {
        // Apply additional sanitization to the query
        req.query = sanitizeInput(validatedData.query) as Record<string, unknown> & { [key: string]: string | string[] };
      }
      if (validatedData.params) {
        // Apply additional sanitization to the params
        req.params = sanitizeInput(validatedData.params) as Record<string, string> & Record<string, unknown>;
      }

      return next();
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        const errorMessage = error.issues
          .map((issue) => {
            const field = issue.path.join('.');
            const message = optimizeErrorMessage(issue.message);
            return \`\${field}: \${message}\`;
          })
          .join(', ');
        
        return next(new ValidationError(errorMessage));
      }
      return next(error);
    }
  };
};

// Función para optimizar mensajes de error
function optimizeErrorMessage(message: string): string {
  if (!message) return message;
  
  let optimized = message;
  
  // Mapeo de mensajes de error mejorados
  const improvedMessages = {
    'String must contain at least': 'Must be at least',
    'String must contain at most': 'Must be no more than',
    'Invalid uuid': 'Must be a valid UUID format',
    'Invalid email': 'Must be a valid email address',
    'Expected number': 'Must be a number',
    'Expected boolean': 'Must be true or false',
    'Expected array': 'Must be a list of items'
  };
  
  // Reemplazar mensajes genéricos
  Object.entries(improvedMessages).forEach(([old, newMsg]) => {
    if (optimized.includes(old)) {
      optimized = optimized.replace(old, newMsg);
    }
  });
  
  // Mejorar sufijos de mensajes
  const errorSuffixes = {
    'character(s)': 'character(s) long',
    'number': 'number',
    'integer': 'whole number',
    'positive': 'positive number',
    'boolean': 'true or false value',
    'array': 'list of items',
    'object': 'valid object',
    'date': 'valid date',
    'email': 'valid email address',
    'uuid': 'valid UUID format'
  };
  
  Object.entries(errorSuffixes).forEach(([old, newSuffix]) => {
    if (optimized.includes(old)) {
      optimized = optimized.replace(old, newSuffix);
    }
  });
  
  // Formatear mensajes para que sean más claros
  optimized = optimized
    .replace(/([a-z])([A-Z])/g, '$1 $2') // Separar camelCase
    .replace(/\\s+/g, ' ') // Normalizar espacios
    .trim();
  
  // Asegurar que el mensaje comience con mayúscula
  if (optimized.length > 0) {
    optimized = optimized.charAt(0).toUpperCase() + optimized.slice(1);
  }
  
  return optimized;
}

// Helper function to sanitize input recursively
function sanitizeInput(input: unknown): unknown {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input === 'string') {
    // Sanitize string input
    return ValidationService.sanitizeInput(input);
  }

  if (Array.isArray(input)) {
    // Sanitize array elements
    return input.map(item => sanitizeInput(item));
  }

  if (typeof input === 'object') {
    // Sanitize object properties
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }

  return input;
};
`;

  fs.writeFileSync(middlewarePath, improvedMiddleware);
  console.log(`✅ Middleware de validación mejorado: ${middlewarePath}`);
}

/**
 * Crear tests de validación con mensajes mejorados
 */
function createImprovedValidationTests() {
  console.log('🧪 Creando tests de validación mejorados...\n');
  
  const testContent = `import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { validate } from '../../middleware/validate';
import { z } from 'zod';

describe('Improved Validation Error Messages', () => {
  describe('Error Message Optimization', () => {
    it('should provide clear error messages for string validation', async () => {
      const testSchema = z.object({
        body: z.object({
          name: z.string().min(2),
          email: z.string().email(),
          quest: z.string().min(5)
        })
      });

      const validationMiddleware = validate(testSchema);

      const mockReq: any = {
        body: { name: 'J', email: 'invalid-email', quest: 'sh' },
        query: {},
        params: {}
      };
      const mockRes: any = {};
      const mockNext = jest.fn();

      await validationMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = mockNext.mock.calls[0][0];
      
      // Verificar que el mensaje de error está optimizado
      expect(error.message).toContain('Name: Must be at least 2 character(s) long');
      expect(error.message).toContain('Email: Must be a valid email address');
      expect(error.message).toContain('Quest: Must be at least 5 character(s) long');
    });

    it('should provide clear error messages for numeric validation', async () => {
      const testSchema = z.object({
        body: z.object({
          age: z.number().int().positive(),
          weight: z.number().positive(),
          rating: z.number().min(1).max(10)
        })
      });

      const validationMiddleware = validate(testSchema);

      const mockReq: any = {
        body: { age: -5, weight: 0, rating: 15 },
        query: {},
        params: {}
      };
      const mockRes: any = {};
      const mockNext = jest.fn();

      await validationMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = mockNext.mock.calls[0][0];
      
      // Verificar que el mensaje de error está optimizado
      expect(error.message).toContain('Age: Must be a positive number');
      expect(error.message).toContain('Weight: Must be a positive number');
      expect(error.message).toContain('Rating: Must be a number');
    });

    it('should provide clear error messages for UUID validation', async () => {
      const testSchema = z.object({
        params: z.object({
          userId: z.string().uuid(),
          routineId: z.string().uuid()
        })
      });

      const validationMiddleware = validate(testSchema);

      const mockReq: any = {
        body: {},
        query: {},
        params: { userId: 'invalid-uuid', routineId: 'also-invalid' }
      };
      const mockRes: any = {};
      const mockNext = jest.fn();

      await validationMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = mockNext.mock.calls[0][0];
      
      // Verificar que el mensaje de error está optimizado
      expect(error.message).toContain('UserId: Must be a valid UUID format');
      expect(error.message).toContain('RoutineId: Must be a valid UUID format');
    });

    it('should provide clear error messages for query parameter validation', async () => {
      const testSchema = z.object({
        query: z.object({
          page: z.string().regex(/^\\d+$/).transform(Number).refine(val => val > 0),
          limit: z.string().regex(/^\\d+$/).transform(Number).refine(val => val > 0 && val <= 100),
          search: z.string().optional()
        })
      });

      const validationMiddleware = validate(testSchema);

      const mockReq: any = {
        body: {},
        query: { page: 'invalid', limit: '200', search: '' },
        params: {}
      };
      const mockRes: any = {};
      const mockNext = jest.fn();

      await validationMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = mockNext.mock.calls[0][0];
      
      // Verificar que el mensaje de error está optimizado
      expect(error.message).toContain('Page: Must be a positive number');
      expect(error.message).toContain('Limit: Must be a number');
    });

    it('should provide clear error messages for array validation', async () => {
      const testSchema = z.object({
        body: z.object({
          tags: z.array(z.string().min(1)),
          numbers: z.array(z.number().positive())
        })
      });

      const validationMiddleware = validate(testSchema);

      const mockReq: any = {
        body: { tags: ['valid', '', 'also-valid'], numbers: [1, -2, 3] },
        query: {},
        params: {}
      };
      const mockRes: any = {};
      const mockNext = jest.fn();

      await validationMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = mockNext.mock.calls[0][0];
      
      // Verificar que el mensaje de error está optimizado
      expect(error.message).toContain('Tags.1: Must be at least 1 character(s) long');
      expect(error.message).toContain('Numbers.1: Must be a positive number');
    });
  });

  describe('Field Name Mapping', () => {
    it('should map field names to user-friendly labels', async () => {
      const testSchema = z.object({
        body: z.object({
          userId: z.string().uuid(),
          routineId: z.string().uuid(),
          sessionId: z.string().uuid()
        })
      });

      const validationMiddleware = validate(testSchema);

      const mockReq: any = {
        body: { userId: 'invalid', routineId: 'invalid', sessionId: 'invalid' },
        query: {},
        params: {}
      };
      const mockRes: any = {};
      const mockNext = jest.fn();

      await validationMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = mockNext.mock.calls[0][0];
      
      // Verificar que los nombres de campo están mapeados correctamente
      expect(error.message).toContain('User ID: Must be a valid UUID format');
      expect(error.message).toContain('Routine ID: Must be a valid UUID format');
      expect(error.message).toContain('Session ID: Must be a valid UUID format');
    });
  });
});
`;

  const testPath = path.join(__dirname, 'backend/src/__tests__/validation-error-messages.test.js');
  fs.writeFileSync(testPath, testContent);
  console.log(`✅ Test de mensajes de error mejorados creado: ${testPath}`);
}

/**
 * Crear sistema de internacionalización de errores
 */
function createErrorInternationalization() {
  console.log('🌐 Creando sistema de internacionalización de errores...\n');
  
  const i18nContent = `import { z } from 'zod';

// Mensajes de error en diferentes idiomas
export const errorMessages = {
  en: {
    // Validación de strings
    'String must contain at least': 'Must be at least',
    'String must contain at most': 'Must be no more than',
    'Invalid uuid': 'Must be a valid UUID format',
    'Invalid email': 'Must be a valid email address',
    
    // Validación de números
    'Expected number': 'Must be a number',
    'Expected integer': 'Must be a whole number',
    'Expected positive': 'Must be a positive number',
    
    // Validación de booleanos
    'Expected boolean': 'Must be true or false',
    
    // Validación de arrays
    'Expected array': 'Must be a list of items',
    
    // Validación de objetos
    'Expected object': 'Must be a valid object',
    
    // Nombres de campos
    'name': 'Name',
    'email': 'Email',
    'password': 'Password',
    'quest': 'Quest',
    'userId': 'User ID',
    'routineId': 'Routine ID',
    'sessionId': 'Session ID',
    'page': 'Page number',
    'limit': 'Limit',
    'search': 'Search term'
  },
  
  es: {
    // Validación de strings
    'String must contain at least': 'Debe tener al menos',
    'String must contain at most': 'Debe tener como máximo',
    'Invalid uuid': 'Debe ser un formato UUID válido',
    'Invalid email': 'Debe ser una dirección de correo válida',
    
    // Validación de números
    'Expected number': 'Debe ser un número',
    'Expected integer': 'Debe ser un número entero',
    'Expected positive': 'Debe ser un número positivo',
    
    // Validación de booleanos
    'Expected boolean': 'Debe ser verdadero o falso',
    
    // Validación de arrays
    'Expected array': 'Debe ser una lista de elementos',
    
    // Validación de objetos
    'Expected object': 'Debe ser un objeto válido',
    
    // Nombres de campos
    'name': 'Nombre',
    'email': 'Correo electrónico',
    'password': 'Contraseña',
    'quest': 'Misión',
    'userId': 'ID de usuario',
    'routineId': 'ID de rutina',
    'sessionId': 'ID de sesión',
    'page': 'Número de página',
    'limit': 'Límite',
    'search': 'Término de búsqueda'
  }
};

// Detectar idioma del usuario (simplificado para este ejemplo)
export function detectLanguage(req: any): string {
  // Intentar detectar del header Accept-Language
  const acceptLanguage = req.headers['accept-language'];
  if (acceptLanguage) {
    const language = acceptLanguage.split(',')[0].split(';')[0].toLowerCase();
    if (language.startsWith('es')) return 'es';
    if (language.startsWith('en')) return 'en';
  }
  
  // Por defecto, inglés
  return 'en';
}

// Optimizar mensaje de error según el idioma
export function optimizeErrorMessage(message: string, language: string = 'en'): string {
  if (!message) return message;
  
  let optimized = message;
  const messages = errorMessages[language] || errorMessages.en;
  
  // Reemplazar mensajes genéricos
  Object.entries(messages).forEach(([old, newMsg]) => {
    if (optimized.includes(old)) {
      optimized = optimized.replace(old, newMsg);
    }
  });
  
  // Mejorar sufijos de mensajes
  const errorSuffixes = {
    'character(s)': language === 'es' ? 'carácter(es) de longitud' : 'character(s) long',
    'number': language === 'es' ? 'número' : 'number',
    'integer': language === 'es' ? 'número entero' : 'whole number',
    'positive': language === 'es' ? 'número positivo' : 'positive number',
    'boolean': language === 'es' ? 'valor booleano' : 'true or false value',
    'array': language === 'es' ? 'lista de elementos' : 'list of items',
    'object': language === 'es' ? 'objeto válido' : 'valid object',
    'date': language === 'es' ? 'fecha válida' : 'valid date',
    'email': language === 'es' ? 'dirección de correo válida' : 'valid email address',
    'uuid': language === 'es' ? 'formato UUID válido' : 'valid UUID format'
  };
  
  Object.entries(errorSuffixes).forEach(([old, newSuffix]) => {
    if (optimized.includes(old)) {
      optimized = optimized.replace(old, newSuffix);
    }
  });
  
  // Formatear mensajes para que sean más claros
  optimized = optimized
    .replace(/([a-z])([A-Z])/g, '$1 $2') // Separar camelCase
    .replace(/\\s+/g, ' ') // Normalizar espacios
    .trim();
  
  // Asegurar que el mensaje comience con mayúscula
  if (optimized.length > 0) {
    optimized = optimized.charAt(0).toUpperCase() + optimized.slice(1);
  }
  
  return optimized;
}

// Middleware de validación con internacionalización
export const validateWithI18n = (schema: z.ZodTypeAny) => {
  return async (req: any, res: any, next: any) => {
    try {
      const validatedData = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      }) as {
        body?: Record<string, unknown>;
        query?: Record<string, unknown>;
        params?: Record<string, unknown>;
      };

      // Sanitize and validate the data before replacing
      if (validatedData.body) {
        req.body = sanitizeInput(validatedData.body) as Record<string, unknown>;
      }
      if (validatedData.query) {
        req.query = sanitizeInput(validatedData.query) as Record<string, unknown> & { [key: string]: string | string[] };
      }
      if (validatedData.params) {
        req.params = sanitizeInput(validatedData.params) as Record<string, string> & Record<string, unknown>;
      }

      return next();
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        const language = detectLanguage(req);
        const errorMessage = error.issues
          .map((issue) => {
            const field = issue.path.join('.');
            const message = optimizeErrorMessage(issue.message, language);
            return \`\${field}: \${message}\`;
          })
          .join(', ');
        
        return next(new Error(errorMessage));
      }
      return next(error);
    }
  };
};

// Helper function to sanitize input recursively
function sanitizeInput(input: unknown): unknown {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input === 'string') {
    // Sanitize string input
    return input.trim();
  }

  if (Array.isArray(input)) {
    // Sanitize array elements
    return input.map(item => sanitizeInput(item));
  }

  if (typeof input === 'object') {
    // Sanitize object properties
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }

  return input;
}
`;

  const i18nPath = path.join(__dirname, 'backend/src/middleware/validateWithI18n.ts');
  fs.writeFileSync(i18nPath, i18nContent);
  console.log(`✅ Middleware de validación con i18n creado: ${i18nPath}`);
}

/**
 * Función principal
 */
function main() {
  console.log('🚀 Iniciando optimización de mensajes de error de validación...\n');
  
  // 1. Mejorar middleware de validación
  improveValidationMiddleware();
  
  // 2. Crear tests de validación mejorados
  createImprovedValidationTests();
  
  // 3. Crear sistema de internacionalización
  createErrorInternationalization();
  
  console.log('✅ Optimización de mensajes de error de validación completada');
  console.log('\n📋 Resumen:');
  console.log('   - Middleware de validación mejorado');
  console.log('   - Tests de validación con mensajes claros creados');
  console.log('   - Sistema de internacionalización implementado');
  console.log('   - Mensajes de error estandarizados');
}

// Ejecutar script
if (require.main === module) {
  main();
}

module.exports = {
  optimizeErrorMessage,
  improvedErrorMessages,
  errorSuffixes
};