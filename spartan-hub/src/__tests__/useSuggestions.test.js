// Test for the useSuggestions hook
describe('useSuggestions Hook', () => {
  it('should be able to import useSuggestions hook', () => {
    // This test simply verifies that the hook can be imported without errors
    expect(() => {
      require('../hooks/useSuggestions');
    }).not.toThrow();
  });
});