const fs = require('fs');
const path = require('path');

describe('NPM Scripts Optimization', () => {
  const packageJsonPath = path.join(__dirname, '../../package.json');
  let packageJson;

  beforeAll(() => {
    packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  });

  test('docker:up script exists', () => {
    expect(packageJson.scripts['docker:up']).toBe('docker-compose up -d --build');
  });

  test('docker:down script exists', () => {
    expect(packageJson.scripts['docker:down']).toBe('docker-compose down');
  });

  test('test:backend-suite script exists', () => {
    expect(packageJson.scripts['test:backend-suite']).toContain('node dist/test.js');
  });

  test('dist script exists', () => {
    expect(packageJson.scripts['dist']).toBe('node scripts/createDist.js');
  });

  test('Legacy batch files are removed', () => {
    const rootDir = path.join(__dirname, '../../');
    const legacyFiles = [
      'start.bat',
      'stop.bat',
      'run_all_tests.bat',
      'create-dist.bat'
    ];

    legacyFiles.forEach(file => {
      expect(fs.existsSync(path.join(rootDir, file))).toBe(false);
    });
  });
});
