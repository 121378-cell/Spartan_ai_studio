const fs = require('fs');
const path = require('path');

// For this utility script, we'll create a simple structured logger
const logger = {
  info: (message, metadata = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      service: 'ui-improvements',
      metadata
    };
    console.info(JSON.stringify(logEntry));
  },
  error: (message, metadata = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      service: 'ui-improvements',
      metadata
    };
    console.error(JSON.stringify(logEntry));
  },
  warn: (message, metadata = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      service: 'ui-improvements',
      metadata
    };
    console.warn(JSON.stringify(logEntry));
  }
};

logger.info('🚀 Applying UI Improvements to Spartan Hub');
logger.info('========================================');

// Function to copy file
function copyFile(source, destination) {
    try {
        fs.copyFileSync(source, destination);
        logger.info(`✅ Copied ${path.basename(source)} to ${path.basename(destination)}`);
        return true;
    } catch (error) {
        logger.error(`❌ Error copying ${source}:`, { errorMessage: error.message });
        return false;
    }
}

// Function to backup original file
function backupFile(filePath) {
    const backupPath = filePath + '.backup';
    try {
        if (fs.existsSync(filePath) && !fs.existsSync(backupPath)) {
            fs.copyFileSync(filePath, backupPath);
            logger.info(`✅ Backed up ${path.basename(filePath)}`);
        }
        return true;
    } catch (error) {
        logger.error(`❌ Error backing up ${filePath}:`, { errorMessage: error.message });
        return false;
    }
}

// Function to check if file exists
function fileExists(filePath) {
    return fs.existsSync(filePath);
}

// Main execution
async function main() {
    try {
        // Check if required files exist
        const requiredFiles = [
            'index-updated.html',
            'index.css',
            'App-improved.tsx',
            'components/Dashboard-improved.tsx'
        ];
        
        for (const file of requiredFiles) {
            if (!fileExists(file)) {
                logger.error(`❌ Required file not found: ${file}`);
                process.exit(1);
            }
        }
        
        logger.info('✅ All required files found');
        
        // Backup original files
        logger.info('\n📂 Creating backups...');
        await backupFile('index.html');
        await backupFile('App.tsx');
        await backupFile('components/Dashboard.tsx');
        
        // Apply improvements
        logger.info('\n✨ Applying improvements...');
        
        // Replace index.html with updated version
        if (copyFile('index-updated.html', 'index.html')) {
            logger.info('✅ Updated index.html with enhanced styling');
        }
        
        // Replace App.tsx with improved version
        if (copyFile('App-improved.tsx', 'App.tsx')) {
            logger.info('✅ Updated App.tsx with improved layout');
        }
        
        // Replace Dashboard.tsx with improved version
        if (copyFile('components/Dashboard-improved.tsx', 'components/Dashboard.tsx')) {
            logger.info('✅ Updated Dashboard.tsx with enhanced UI');
        }
        
        // Ensure index.css is in place
        if (fileExists('index.css')) {
            logger.info('✅ Enhanced CSS styling is ready');
        }
        
        logger.info('\n🎉 UI Improvements Applied Successfully!');
        logger.info('\n📋 What was improved:');
        logger.info('  • Enhanced color scheme with better gradients');
        logger.info('  • Improved typography with Google Fonts');
        logger.info('  • Better card components with 3D effects');
        logger.info('  • Enhanced dashboard with statistics overview');
        logger.info('  • Improved responsive design');
        logger.info('  • Better visual feedback and animations');
        logger.info('  • Enhanced alert system with icons');
        
        logger.info('\n💡 To see the changes:');
        logger.info('  1. Make sure the backend is running (node spartan-hub-launcher.js)');
        logger.info('  2. Start the frontend: npx vite');
        logger.info('  3. Visit http://localhost:3000 in your browser');
        
        logger.info('\n📝 Note: Backup files have been created with .backup extension');
        logger.info('   if you need to revert the changes.');
        
    } catch (error) {
        logger.error('❌ Error applying UI improvements:', { errorMessage: error.message });
        process.exit(1);
    }
}

main();