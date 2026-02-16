const fs = require('fs');
const path = require('path');

console.log('API Keys Update Script');
console.log('====================');

// Function to update a specific API key in the .env file
function updateApiKey(keyName, keyValue) {
  const envPath = path.join(__dirname, '.env');
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Create a regex to find the key
  const keyRegex = new RegExp(`^${keyName}=.*`, 'm');
  
  if (keyRegex.test(envContent)) {
    // Key exists, update it
    envContent = envContent.replace(keyRegex, `${keyName}=${keyValue}`);
    console.log(`✅ Updated ${keyName}`);
  } else {
    // Key doesn't exist, add it
    envContent += `\n${keyName}=${keyValue}`;
    console.log(`✅ Added ${keyName}`);
  }
  
  // Write back to file
  fs.writeFileSync(envPath, envContent);
}

// API keys to update
const apiKeys = [
  { name: 'API_NINJAS_KEY', label: 'API Ninjas Key' },
  { name: 'EDAMAM_APP_ID', label: 'Edamam App ID' },
  { name: 'EDAMAM_APP_KEY', label: 'Edamam App Key' },
  { name: 'FATSECRET_KEY', label: 'FatSecret Key' },
  { name: 'FATSECRET_SECRET', label: 'FatSecret Secret' },
  { name: 'EXERCISEDB_KEY', label: 'ExerciseDB Key' }
];

console.log('\nEnter your API keys (press Enter to skip):');

// Process each API key
apiKeys.forEach(key => {
  const value = require('readline-sync').question(`${key.label}: `);
  if (value.trim() !== '') {
    updateApiKey(key.name, value.trim());
  } else {
    console.log(`⚠ Skipped ${key.label}`);
  }
});

console.log('\n✅ API keys update completed!');
console.log('\nTo test your configuration, run: npm run test:env');