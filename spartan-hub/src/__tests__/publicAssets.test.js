const fs = require('fs');
const path = require('path');

// Simple test to verify public assets exist
describe('Public Assets', () => {
  it('should have vite.svg file in public directory', () => {
    const viteSvgPath = path.join(__dirname, '../../public/vite.svg');
    expect(fs.existsSync(viteSvgPath)).toBe(true);
  });

  it('should have favicon.ico file in public directory', () => {
    const faviconPath = path.join(__dirname, '../../public/favicon.ico');
    expect(fs.existsSync(faviconPath)).toBe(true);
  });
});