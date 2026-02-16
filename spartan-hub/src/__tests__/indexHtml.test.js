const fs = require('fs');
const path = require('path');

// Simple test to verify index.html has the correct structure
describe('Index HTML', () => {
  it('should contain the favicon link', () => {
    const indexPath = path.join(__dirname, '../../index.html');
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    
    expect(indexContent).toContain('href="/vite.svg"');
  });

  it('should contain Tailwind CSS CDN link', () => {
    const indexPath = path.join(__dirname, '../../index.html');
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    
    expect(indexContent).toContain('cdn.tailwindcss.com');
  });

  it('should not contain the problematic import map', () => {
    const indexPath = path.join(__dirname, '../../index.html');
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    
    expect(indexContent).not.toContain('aistudiocdn.com');
  });
});