const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// For this distribution script, we'll create a simple structured logger
const logger = {
  info: (message, metadata = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      service: 'create-dist',
      metadata
    };
    console.info(JSON.stringify(logEntry));
  },
  error: (message, metadata = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      service: 'create-dist',
      metadata
    };
    console.error(JSON.stringify(logEntry));
  },
  warn: (message, metadata = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      service: 'create-dist',
      metadata
    };
    console.warn(JSON.stringify(logEntry));
  }
};

logger.info('📦 Creating Spartan Hub Distribution...');

try {
  // 1. Build the executable
  logger.info('🔨 Building executable...');
  // Ensure scripts/dist exists
  if (!fs.existsSync(path.join(__dirname, 'dist'))) {
    fs.mkdirSync(path.join(__dirname, 'dist'));
  }
  execSync('npm run build:all && pkg scripts/simple-launcher.js -t node18-win-x64 -o scripts/dist/spartan-hub.exe', { stdio: 'inherit' });
  logger.info('✅ Executable built successfully');

  // 2. Create distribution directory
  const distDir = path.join(__dirname, 'dist/spartan-hub-dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // 3. Copy necessary files to distribution directory
  logger.info('📋 Copying files to distribution directory...');
  
  // Copy the executable
  fs.copyFileSync(path.join(__dirname, 'dist/spartan-hub.exe'), path.join(distDir, 'spartan-hub.exe'));
  
  // Copy the frontend dist directory (located in root dist)
  const frontendDistSrc = path.join(__dirname, '../dist');
  const frontendDistDest = path.join(distDir, 'dist');
  if (fs.existsSync(frontendDistSrc)) {
    // Remove existing dist directory if it exists
    if (fs.existsSync(frontendDistDest)) {
      fs.rmSync(frontendDistDest, { recursive: true });
    }
    // Copy the frontend dist directory
    fs.cpSync(frontendDistSrc, frontendDistDest, { recursive: true });
    logger.info('✅ Frontend dist directory copied successfully');
  } else {
    logger.warn('Frontend dist directory not found');
  }
  
  // Create backend directory structure for native module compatibility
  const backendDest = path.join(distDir, 'backend');
  if (!fs.existsSync(backendDest)) {
    fs.mkdirSync(backendDest, { recursive: true });
  }
  
  // Copy backend source files needed for runtime compilation
  const backendSrcFiles = ['package.json', 'tsconfig.json'];
  backendSrcFiles.forEach(file => {
    const srcPath = path.join(__dirname, '../backend', file);
    const destPath = path.join(backendDest, file);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
    }
  });
  
  // Copy backend source directory
  const backendSrcDir = path.join(__dirname, '../backend', 'src');
  const backendSrcDestDir = path.join(backendDest, 'src');
  if (fs.existsSync(backendSrcDir)) {
    if (fs.existsSync(backendSrcDestDir)) {
      fs.rmSync(backendSrcDestDir, { recursive: true });
    }
    fs.cpSync(backendSrcDir, backendSrcDestDir, { recursive: true });
    logger.info('✅ Backend source directory copied successfully');
  }
  
  // Copy data directory
  const dataSrcDir = path.join(__dirname, 'backend', 'data');
  const dataDestDir = path.join(backendDest, 'data');
  if (fs.existsSync(dataSrcDir)) {
    if (fs.existsSync(dataDestDir)) {
      fs.rmSync(dataDestDir, { recursive: true });
    }
    fs.cpSync(dataSrcDir, dataDestDir, { recursive: true });
    logger.info('✅ Data directory copied successfully');
  }
  
  // Also copy the dist directory to the backend directory for local access
  const backendDistDest = path.join(backendDest, 'dist');
  if (fs.existsSync(frontendDistSrc)) {
    // Remove existing backend dist directory if it exists
    if (fs.existsSync(backendDistDest)) {
      fs.rmSync(backendDistDest, { recursive: true });
    }
    // Copy the frontend dist directory to backend
    fs.cpSync(frontendDistSrc, backendDistDest, { recursive: true });
    logger.info('✅ Frontend dist directory copied to backend successfully');
  }
  
  // Create a simple start script
  const startScript = `@echo off
title Spartan Hub
spartan-hub.exe
pause`;
  fs.writeFileSync(path.join(distDir, 'start.bat'), startScript);
  
  // Create a PowerShell start script
  const psScript = `# Spartan Hub Start Script
Write-Host "🚀 Starting Spartan Hub..." -ForegroundColor Green
./spartan-hub.exe
Write-Host "Press any key to exit..." -ForegroundColor Yellow
$Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")`;
  fs.writeFileSync(path.join(distDir, 'start.ps1'), psScript);
  
  // Create a README file
  const readme = `# Spartan Hub

## One-Click Execution
Double-click on **spartan-hub.exe** to run the full application directly, or double-click on **start.bat** to run it in a console window.

## System Requirements
- Windows 10 or later
- [Ollama](https://ollama.com/) installed
- [gemma2:2b](https://ollama.com/library/gemma2) model installed

## Installation Steps
1. Install Ollama from https://ollama.com/
2. Install the gemma2 model by running: \`ollama pull gemma2:2b\`
3. Double-click on spartan-hub.exe to launch the application

## Accessing the Application
Once the application is running:
- Open your browser and go to http://localhost:3001
- The application will be available there

## Stopping the Application
- Close the command window or press Ctrl+C in the terminal
- If running directly, close the application window
`;
  fs.writeFileSync(path.join(distDir, 'README.txt'), readme);
  
  logger.info('✅ Distribution files copied successfully');
  logger.info('🎉 Distribution created successfully!');
  logger.info(`📁 Distribution is located at: ${distDir}`);
  logger.info('🚀 To run the application, double-click on spartan-hub.exe in the distribution folder');

} catch (error) {
  logger.error('❌ Error creating distribution:', { errorMessage: error.message });
  process.exit(1);
}