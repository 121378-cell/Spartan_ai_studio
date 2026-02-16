/**
 * Foreign Key Constraint Fix Script
 * Diagnóstico y corrección de errores de Foreign Key constraint
 */

const fs = require('fs');
const path = require('path');

// Archivos de tests que necesitan corrección
const testFiles = [
  'backend/src/__tests__/auth.test.ts',
  'backend/src/__tests__/auth.security.test.ts', 
  'backend/src/__tests__/security.middleware.test.ts'
];

// Patrones de búsqueda para errores comunes
const patterns = {
  // Mock incorrecto de UUID
  uuidMock: /jest\.mock\(['"]uuid['"]/,
  
  // Creación de sesiones sin validar usuario
  sessionWithoutUser: /SessionModel\.create\(\s*{[\s\S]*?userId:\s*['"]\w+['"][\s\S]*?}\s*\)/,
  
  // Uso de IDs falsos
  fakeUserId: /userId:\s*['"]\w{9}['"]/,
  
  // Falta de validación de relaciones
  missingValidation: /await SessionModel\.create\(\s*{[\s\S]*?userId:\s*[^,]+[\s\S]*?}\s*\)/
};

/**
 * Diagnóstico de errores de Foreign Key constraint
 */
function diagnoseForeignKeyErrors() {
  console.log('🔍 Diagnosticando errores de Foreign Key constraint...\n');
  
  const results = [];
  
  testFiles.forEach(filePath => {
    const fullPath = path.join(__dirname, filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`❌ Archivo no encontrado: ${filePath}`);
      return;
    }
    
    const content = fs.readFileSync(fullPath, 'utf8');
    const fileResults = { file: filePath, errors: [] };
    
    // Verificar mock incorrecto de UUID
    if (patterns.uuidMock.test(content)) {
      fileResults.errors.push({
        type: 'UUID_MOCK_ERROR',
        description: 'Mock incorrecto de UUID en tests con base de datos real',
        pattern: 'jest.mock(\'uuid\')',
        solution: 'Cambiar a jest.unmock(\'uuid\') para tests con base de datos real'
      });
    }
    
    // Verificar creación de sesiones sin validar usuario
    const sessionMatches = content.match(patterns.sessionWithoutUser);
    if (sessionMatches) {
      fileResults.errors.push({
        type: 'SESSION_WITHOUT_USER',
        description: 'Creación de sesiones sin validar existencia de usuario',
        pattern: 'SessionModel.create({ userId: "..." })',
        solution: 'Validar existencia de usuario antes de crear sesión'
      });
    }
    
    // Verificar uso de IDs falsos
    const fakeIdMatches = content.match(patterns.fakeUserId);
    if (fakeIdMatches) {
      fileResults.errors.push({
        type: 'FAKE_USER_ID',
        description: 'Uso de IDs de usuario falsos en lugar de IDs reales',
        pattern: 'userId: "..."',
        solution: 'Usar IDs reales de usuarios creados en la base de datos'
      });
    }
    
    results.push(fileResults);
  });
  
  return results;
}

/**
 * Generar correcciones para los errores encontrados
 */
function generateCorrections(results) {
  console.log('🔧 Generando correcciones...\n');
  
  const corrections = [];
  
  results.forEach(result => {
    if (result.errors.length === 0) {
      console.log(`✅ ${result.file}: No se encontraron errores`);
      return;
    }
    
    console.log(`📝 ${result.file}:`);
    
    result.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error.type}: ${error.description}`);
      console.log(`     Solución: ${error.solution}\n`);
      
      corrections.push({
        file: result.file,
        error: error,
        correction: generateSpecificCorrection(error, result.file)
      });
    });
  });
  
  return corrections;
}

/**
 * Generar corrección específica para cada tipo de error
 */
function generateSpecificCorrection(error, filePath) {
  switch (error.type) {
    case 'UUID_MOCK_ERROR':
      return {
        search: "jest.mock('uuid');",
        replace: "jest.unmock('uuid');",
        description: 'Corregir mock de UUID para tests con base de datos real'
      };
      
    case 'SESSION_WITHOUT_USER':
      return {
        search: 'SessionModel.create({',
        replace: `// Validar existencia de usuario antes de crear sesión
const userExists = await UserModel.findById(sessionData.userId);
if (!userExists) {
  throw new Error(\`User with ID \${sessionData.userId} does not exist\`);
}

SessionModel.create({`,
        description: 'Añadir validación de existencia de usuario'
      };
      
    case 'FAKE_USER_ID':
      return {
        search: 'userId: "fake-user-id"',
        replace: 'userId: realUserId',
        description: 'Reemplazar IDs falsos por IDs reales de la base de datos'
      };
      
    default:
      return {
        search: '',
        replace: '',
        description: 'Corrección manual requerida'
      };
  }
}

/**
 * Aplicar correcciones a los archivos
 */
function applyCorrections(corrections) {
  console.log('⚡ Aplicando correcciones...\n');
  
  corrections.forEach(correction => {
    const filePath = path.join(__dirname, correction.file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    if (correction.search && correction.replace) {
      const newContent = content.replace(correction.search, correction.replace);
      
      if (newContent !== content) {
        fs.writeFileSync(filePath, newContent);
        console.log(`✅ Corregido: ${correction.file}`);
        console.log(`   ${correction.description}\n`);
      } else {
        console.log(`⚠️  No se pudo aplicar corrección: ${correction.file}\n`);
      }
    }
  });
}

/**
 * Crear tests de validación para relaciones
 */
function createValidationTests() {
  console.log('🧪 Creando tests de validación...\n');
  
  const testContent = `import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { UserModel, SessionModel } from '../../models';
import { createTestUserWithSession } from '../helpers/testHelpers';

describe('Foreign Key Constraint Validation', () => {
  beforeEach(async () => {
    // Limpiar datos de prueba
    await UserModel.clear();
    await SessionModel.clear();
  });

  afterEach(async () => {
    // Limpiar datos de prueba
    await UserModel.clear();
    await SessionModel.clear();
  });

  describe('User-Session Relationships', () => {
    it('should create session only with valid user ID', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      };

      // Crear usuario primero
      const user = await UserModel.create(userData);
      
      // Crear sesión con ID de usuario válido
      const sessionData = {
        userId: user.id,
        token: 'test-token',
        userAgent: 'test-agent',
        ipAddress: '127.0.0.1'
      };

      const session = await SessionModel.create(sessionData);
      
      expect(session).toBeDefined();
      expect(session.userId).toBe(user.id);
    });

    it('should reject session creation with invalid user ID', async () => {
      const sessionData = {
        userId: 'invalid-user-id',
        token: 'test-token',
        userAgent: 'test-agent',
        ipAddress: '127.0.0.1'
      };

      await expect(SessionModel.create(sessionData)).rejects.toThrow();
    });

    it('should validate user existence before creating session', async () => {
      const fakeUserId = 'fake-user-id-123';
      
      // Intentar crear sesión con ID de usuario que no existe
      const sessionData = {
        userId: fakeUserId,
        token: 'test-token',
        userAgent: 'test-agent',
        ipAddress: '127.0.0.1'
      };

      // La validación debería fallar
      const userExists = await UserModel.findById(fakeUserId);
      expect(userExists).toBeNull();
    });
  });

  describe('Transaction Management', () => {
    it('should handle user and session creation in transaction', async () => {
      const userData = {
        name: 'Transaction User',
        email: 'transaction@example.com',
        password: 'password123'
      };

      const sessionData = {
        token: 'transaction-token',
        userAgent: 'transaction-agent',
        ipAddress: '127.0.0.1'
      };

      // Crear usuario y sesión en una transacción
      const result = await createTestUserWithSession(userData, sessionData);
      
      expect(result.user).toBeDefined();
      expect(result.session).toBeDefined();
      expect(result.session.userId).toBe(result.user.id);
    });
  });
});
`;

  const testPath = path.join(__dirname, 'backend/src/__tests__/foreign-key-validation.test.js');
  fs.writeFileSync(testPath, testContent);
  console.log(`✅ Test de validación creado: ${testPath}`);
}

/**
 * Crear helper para tests consistentes
 */
function createTestHelpers() {
  console.log('🛠️  Creando helpers de tests...\n');
  
  const helperContent = `import { UserModel, SessionModel } from '../models';

/**
 * Crear usuario y sesión de prueba con relaciones válidas
 */
export const createTestUserWithSession = async (userData, sessionData) => {
  // Crear usuario primero
  const user = await UserModel.create(userData);
  
  // Crear sesión con ID de usuario válido
  const session = await SessionModel.create({
    ...sessionData,
    userId: user.id
  });
  
  return { user, session };
};

/**
 * Validar existencia de usuario antes de operaciones
 */
export const validateUserExists = async (userId) => {
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new Error(\`User with ID \${userId} does not exist\`);
  }
  return user;
};

/**
 * Limpiar datos de prueba
 */
export const clearTestData = async () => {
  await UserModel.clear();
  await SessionModel.clear();
};
`;

  const helperPath = path.join(__dirname, 'backend/src/__tests__/helpers/testHelpers.js');
  fs.writeFileSync(helperPath, helperContent);
  console.log(`✅ Helper de tests creado: ${helperPath}`);
}

/**
 * Función principal
 */
function main() {
  console.log('🚀 Iniciando corrección de Foreign Key constraint...\n');
  
  // 1. Diagnosticar errores
  const results = diagnoseForeignKeyErrors();
  
  // 2. Generar correcciones
  const corrections = generateCorrections(results);
  
  // 3. Aplicar correcciones
  applyCorrections(corrections);
  
  // 4. Crear tests de validación
  createValidationTests();
  
  // 5. Crear helpers de tests
  createTestHelpers();
  
  console.log('✅ Corrección de Foreign Key constraint completada');
  console.log('\n📋 Resumen:');
  console.log(`   - Archivos analizados: ${testFiles.length}`);
  console.log(`   - Errores encontrados: ${results.reduce((acc, r) => acc + r.errors.length, 0)}`);
  console.log(`   - Correcciones aplicadas: ${corrections.length}`);
  console.log(`   - Tests de validación creados: 1`);
  console.log(`   - Helpers creados: 1`);
}

// Ejecutar script
if (require.main === module) {
  main();
}

module.exports = {
  diagnoseForeignKeyErrors,
  generateCorrections,
  applyCorrections,
  createValidationTests,
  createTestHelpers
};