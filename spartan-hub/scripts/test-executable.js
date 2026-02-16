const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🧪 Testing Spartan Hub Executable');
console.log('================================');

// Check if executable exists
const exePath = path.join(__dirname, 'spartan-hub.exe');
if (!fs.existsSync(exePath)) {
  console.error('❌ Executable not found:', exePath);
  process.exit(1);
}

console.log('✅ Executable found');

// Test that it starts without errors
console.log('🚀 Starting executable...');
const exe = spawn(exePath);

let output = '';
let errorOutput = '';

exe.stdout.on('data', (data) => {
  output += data.toString();
});

exe.stderr.on('data', (data) => {
  errorOutput += data.toString();
});

exe.on('close', (code) => {
  console.log('📋 Executable output:');
  console.log(output);
  
  if (errorOutput) {
    console.log('❌ Error output:');
    console.log(errorOutput);
  }
  
  console.log(`🔄 Executable exited with code ${code}`);
  
  if (code === 0) {
    console.log('✅ Executable test passed');
  } else {
    console.log('❌ Executable test failed');
  }
});

// Give it a few seconds to start, then kill it
setTimeout(() => {
  exe.kill();
}, 5000);