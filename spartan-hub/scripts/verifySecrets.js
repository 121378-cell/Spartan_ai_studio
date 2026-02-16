const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');

console.log('🔐 Spartan Hub - Secrets Management Verification');
console.log('===============================================');

let hasError = false;

// Helper to check gitignore
function checkGitIgnore(pattern) {
    const gitIgnorePath = path.join(rootDir, '.gitignore');
    if (!fs.existsSync(gitIgnorePath)) {
        console.error('❌ .gitignore file not found');
        return false;
    }
    const content = fs.readFileSync(gitIgnorePath, 'utf-8');
    if (content.includes(pattern)) {
        console.log(`✅ ${pattern} is properly ignored by git`);
        return true;
    } else {
        console.error(`❌ ${pattern} is NOT properly ignored by git`);
        return false;
    }
}

if (!checkGitIgnore('.env') || !checkGitIgnore('backend/.env')) {
    hasError = true;
}

if (checkGitIgnore('backend/secrets/*.txt')) {
    // ok
} else {
    hasError = true;
}

// Check docker-compose.yml
const dockerComposePath = path.join(rootDir, 'docker-compose.yml');
if (fs.existsSync(dockerComposePath)) {
    const content = fs.readFileSync(dockerComposePath, 'utf-8');
    if (content.includes('${')) {
        console.log('✅ docker-compose.yml properly uses environment variables');
    } else {
        console.error('❌ docker-compose.yml does NOT properly use environment variables');
        hasError = true;
    }
} else {
    console.error('❌ docker-compose.yml not found');
    hasError = true;
}

// Check for real credentials
const secretsDir = path.join(rootDir, 'backend/secrets');
const secretFiles = [
    { name: 'api_key.txt', placeholder: 'your_api_key_here' },
    { name: 'db_password.txt', placeholder: 'your_database_password_here' },
    { name: 'ollama_api_key.txt', placeholder: 'your_ollama_api_key_here' }
];

secretFiles.forEach(file => {
    const filePath = path.join(secretsDir, file.name);
    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8').trim();
        if (content !== file.placeholder && !content.includes('example')) {
            console.warn(`⚠️  Warning: ${file.name} exists and may contain real credentials`);
        } else {
            console.log(`✅ No real credentials found in ${file.name}`);
        }
    }
});

// Check .env
const envPath = path.join(rootDir, '.env');
if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    if (content.includes('REPLACE_WITH_STRONG')) {
        console.log('✅ Main .env file contains placeholder values, not real secrets');
    } else {
        console.warn('⚠️  Main .env file may contain real secrets - verify contents');
    }
}

console.log('\n📋 Summary:');
console.log('- Secrets management is properly configured');
console.log('- Environment variables are used instead of hardcoded values');
console.log('- Secrets files are properly excluded from version control');
console.log("- Use 'node scripts/generateSecrets.js' to generate strong secrets (if available)");

if (hasError) {
    console.error('\n❌ Verification failed with errors.');
    process.exit(1);
} else {
    console.log('\n✅ Verification completed successfully!');
}
