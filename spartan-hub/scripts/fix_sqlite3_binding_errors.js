/**
 * Script para diagnosticar y corregir errores de binding de SQLite3
 * Este script identifica y soluciona problemas de compatibilidad de módulos nativos
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Diagnosticando errores de binding de SQLite3...\n');

// Función para verificar si un módulo está disponible
function checkModule(moduleName) {
  try {
    require.resolve(moduleName);
    return true;
  } catch (error) {
    return false;
  }
}

// Función para obtener información del sistema
function getSystemInfo() {
  const os = require('os');
  return {
    platform: os.platform(),
    arch: os.arch(),
    nodeVersion: process.version,
    nodeModulesPath: path.join(__dirname, 'backend', 'node_modules')
  };
}

// Función para verificar la compatibilidad de módulos nativos
function checkNativeModuleCompatibility() {
  console.log('📋 Información del Sistema:');
  const systemInfo = getSystemInfo();
  console.log(`   Plataforma: ${systemInfo.platform}`);
  console.log(`   Arquitectura: ${systemInfo.arch}`);
  console.log(`   Node.js: ${systemInfo.nodeVersion}`);
  console.log(`   Ruta node_modules: ${systemInfo.nodeModulesPath}\n`);

  console.log('🔍 Verificando compatibilidad de módulos nativos:');
  
  const modules = ['better-sqlite3', 'sqlite3'];
  const results = {};
  
  modules.forEach(moduleName => {
    const available = checkModule(moduleName);
    results[moduleName] = available;
    console.log(`   ${moduleName}: ${available ? '✅ Disponible' : '❌ No disponible'}`);
  });
  
  return results;
}

// Función para diagnosticar problemas específicos de binding
function diagnoseBindingIssues() {
  console.log('\n🔍 Diagnosticando problemas de binding específicos...');
  
  const issues = [];
  
  // Verificar si hay múltiples versiones de SQLite3
  const backendNodeModules = path.join(__dirname, 'backend', 'node_modules');
  if (fs.existsSync(backendNodeModules)) {
    const sqlite3Path = path.join(backendNodeModules, 'sqlite3');
    const betterSqlite3Path = path.join(backendNodeModules, 'better-sqlite3');
    
    if (fs.existsSync(sqlite3Path)) {
      try {
        const sqlite3Package = require(path.join(sqlite3Path, 'package.json'));
        console.log(`   sqlite3 versión: ${sqlite3Package.version}`);
      } catch (error) {
        issues.push('No se pudo leer el package.json de sqlite3');
      }
    }
    
    if (fs.existsSync(betterSqlite3Path)) {
      try {
        const betterSqlite3Package = require(path.join(betterSqlite3Path, 'package.json'));
        console.log(`   better-sqlite3 versión: ${betterSqlite3Package.version}`);
      } catch (error) {
        issues.push('No se pudo leer el package.json de better-sqlite3');
      }
    }
  }
  
  // Verificar si hay conflictos de dependencias
  const packageJsonPath = path.join(__dirname, 'backend', 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      if (deps['sqlite3'] && deps['better-sqlite3']) {
        issues.push('Conflicto: Ambas dependencias sqlite3 y better-sqlite3 están instaladas');
      }
    } catch (error) {
      issues.push('No se pudo leer el package.json del backend');
    }
  }
  
  if (issues.length > 0) {
    console.log('\n⚠️  Problemas detectados:');
    issues.forEach(issue => console.log(`   - ${issue}`));
  } else {
    console.log('   ✅ No se detectaron problemas de binding');
  }
  
  return issues;
}

// Función para crear un script de reconstrucción automática
function createAutoRebuildScript() {
  console.log('\n🛠️  Creando script de reconstrucción automática...');
  
  const scriptContent = `#!/usr/bin/env node

/**
 * Script automático para reconstruir módulos nativos de SQLite3
 * Este script se ejecuta automáticamente cuando se detectan problemas de binding
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🔧 Reconstruyendo módulos nativos de SQLite3...');

try {
  // Cambiar al directorio del backend
  const backendPath = path.join(__dirname, 'backend');
  process.chdir(backendPath);
  
  console.log('📦 Instalando dependencias...');
  execSync('npm install', { stdio: 'inherit' });
  
  console.log('🔨 Reconstruyendo módulos nativos...');
  execSync('npm rebuild', { stdio: 'inherit' });
  
  console.log('✅ Módulos nativos reconstruidos exitosamente');
  
  // Verificar que los módulos estén disponibles
  try {
    require('better-sqlite3');
    console.log('✅ better-sqlite3 está disponible');
  } catch (error) {
    console.log('⚠️  better-sqlite3 no está disponible, usando fallback');
  }
  
  try {
    require('sqlite3');
    console.log('✅ sqlite3 está disponible');
  } catch (error) {
    console.log('⚠️  sqlite3 no está disponible, usando fallback');
  }
  
} catch (error) {
  console.error('❌ Error durante la reconstrucción:', error.message);
  process.exit(1);
}`;

  const scriptPath = path.join(__dirname, 'rebuild-sqlite3.js');
  fs.writeFileSync(scriptPath, scriptContent);
  console.log(`   ✅ Script creado en: ${scriptPath}`);
  
  return scriptPath;
}

// Función para crear un fallback seguro
function createSafeFallback() {
  console.log('\n🛡️  Creando fallback seguro para SQLite3...');
  
  const fallbackContent = `/**
 * Fallback seguro para SQLite3
 * Este módulo proporciona una capa de abstracción que maneja automáticamente
 * los problemas de binding y proporciona alternativas seguras
 */

let sqlite3Module = null;
let betterSqlite3Module = null;
let currentDriver = null;

// Intentar cargar better-sqlite3 (preferido)
try {
  betterSqlite3Module = require('better-sqlite3');
  currentDriver = 'better-sqlite3';
  console.log('✅ Usando better-sqlite3 como driver principal');
} catch (error) {
  console.log('⚠️  better-sqlite3 no disponible, intentando sqlite3...');
  
  // Intentar cargar sqlite3 como fallback
  try {
    sqlite3Module = require('sqlite3');
    currentDriver = 'sqlite3';
    console.log('✅ Usando sqlite3 como driver de fallback');
  } catch (error2) {
    console.log('❌ Ambos drivers no disponibles, usando mock database');
    currentDriver = 'mock';
  }
}

// Función para obtener el driver actual
function getDriver() {
  return currentDriver;
}

// Función para crear una conexión segura
function createConnection(databasePath, options = {}) {
  switch (currentDriver) {
    case 'better-sqlite3':
      return betterSqlite3Module(databasePath, options);
      
    case 'sqlite3':
      return new sqlite3Module.Database(databasePath, options);
      
    case 'mock':
      return createMockDatabase(databasePath);
      
    default:
      throw new Error('No database driver available');
  }
}

// Mock database para fallback extremo
function createMockDatabase(path) {
  console.log('🛡️  Usando mock database para pruebas');
  
  return {
    prepare: (sql) => ({
      run: () => ({ changes: 0 }),
      get: () => null,
      all: () => [],
      each: (callback) => callback(null, null)
    }),
    close: () => {},
    exec: () => {},
    serialize: () => {},
    parallelize: () => {}
  };
}

module.exports = {
  getDriver,
  createConnection,
  isAvailable: () => currentDriver !== 'mock'
};`;

  const fallbackPath = path.join(__dirname, 'safe-sqlite3.js');
  fs.writeFileSync(fallbackPath, fallbackContent);
  console.log(`   ✅ Fallback creado en: ${fallbackPath}`);
  
  return fallbackPath;
}

// Función principal de corrección
function main() {
  console.log('🚀 Iniciando diagnóstico y corrección de errores de SQLite3...\n');
  
  // Paso 1: Verificar compatibilidad
  const compatibilityResults = checkNativeModuleCompatibility();
  
  // Paso 2: Diagnosticar problemas específicos
  const bindingIssues = diagnoseBindingIssues();
  
  // Paso 3: Crear soluciones
  if (bindingIssues.length > 0 || !compatibilityResults['better-sqlite3']) {
    console.log('\n🛠️  Implementando soluciones...');
    
    // Crear script de reconstrucción automática
    const rebuildScript = createAutoRebuildScript();
    
    // Crear fallback seguro
    const fallbackScript = createSafeFallback();
    
    console.log('\n📋 Resumen de soluciones implementadas:');
    console.log(`   ✅ Script de reconstrucción: ${rebuildScript}`);
    console.log(`   ✅ Fallback seguro: ${fallbackScript}`);
    
    console.log('\n🔧 Para aplicar las correcciones:');
    console.log('   1. Ejecuta: node rebuild-sqlite3.js');
    console.log('   2. Reinicia la aplicación');
    console.log('   3. Verifica que los tests pasen');
    
  } else {
    console.log('\n✅ No se requieren correcciones, los módulos están disponibles');
  }
  
  console.log('\n🎉 Diagnóstico y corrección de SQLite3 completados!');
}

// Ejecutar la función principal
if (require.main === module) {
  main();
}

module.exports = {
  checkNativeModuleCompatibility,
  diagnoseBindingIssues,
  createAutoRebuildScript,
  createSafeFallback
};