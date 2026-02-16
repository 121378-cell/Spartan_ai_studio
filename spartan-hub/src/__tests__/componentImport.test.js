// Simple test to verify components can be imported without errors
describe('Component Imports', () => {
  it('should be able to import AiErrorScreen component', () => {
    // This test simply verifies that the component can be imported without errors
    expect(() => {
      require('../components/AiErrorScreen');
    }).not.toThrow();
  });

  it('should be able to import RefreshIcon component', () => {
    // This test simply verifies that the component can be imported without errors
    expect(() => {
      require('../components/icons/RefreshIcon');
    }).not.toThrow();
  });
});