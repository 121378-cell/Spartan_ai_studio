const path = require('path');
const fs = require('fs');

console.log('__dirname:', __dirname);
console.log('process.cwd():', process.cwd());

// Test the path resolution
const distPath = path.resolve(__dirname, '../dist');
console.log('Calculated distPath:', distPath);
console.log('distPath exists:', fs.existsSync(distPath));

// List files in the directory if it exists
if (fs.existsSync(distPath)) {
  console.log('Files in dist directory:', fs.readdirSync(distPath));
}