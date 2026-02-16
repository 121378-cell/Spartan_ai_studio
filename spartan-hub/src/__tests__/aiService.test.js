// Simple test to verify aiService functions exist and can be imported
describe('AI Service', () => {
  it('should be able to import aiService functions', () => {
    // This test simply verifies that the service can be imported without errors
    expect(() => {
      require('../services/aiService');
    }).not.toThrow();
  });

  it('should have callOllama function', () => {
    const aiService = require('../services/aiService');
    expect(typeof aiService.callOllama).toBe('function');
  });

  it('should have processUserCommand function', () => {
    const aiService = require('../services/aiService');
    expect(typeof aiService.processUserCommand).toBe('function');
  });
});