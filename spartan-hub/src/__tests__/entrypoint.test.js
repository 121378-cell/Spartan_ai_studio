const fs = require('fs');
const path = require('path');

describe('Entry Point Validation', () => {
  const projectRoot = path.resolve(__dirname, '../../');
  const indexHtmlPath = path.join(projectRoot, 'index.html');
  
  test('index.html exists', () => {
    expect(fs.existsSync(indexHtmlPath)).toBe(true);
  });

  test('index.html references src/index.tsx or src/main.tsx', () => {
    const htmlContent = fs.readFileSync(indexHtmlPath, 'utf-8');
    const hasIndexTsx = htmlContent.includes('src="/src/index.tsx"');
    const hasMainTsx = htmlContent.includes('src="/src/main.tsx"');
    
    expect(hasIndexTsx || hasMainTsx).toBe(true);
    
    const entryFile = hasIndexTsx ? 'src/index.tsx' : 'src/main.tsx';
    const entryPath = path.join(projectRoot, entryFile);
    
    expect(fs.existsSync(entryPath)).toBe(true);
  });
});
