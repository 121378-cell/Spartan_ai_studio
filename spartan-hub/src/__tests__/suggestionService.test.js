// Test for the suggestion service
describe('Suggestion Service', () => {
  it('should be able to import the suggestion service', () => {
    // This test simply verifies that the service can be imported without errors
    expect(() => {
      require('../services/suggestionService');
    }).not.toThrow();
  });

  it('should have SuggestionService class', () => {
    const suggestionService = require('../services/suggestionService');
    expect(typeof suggestionService.SuggestionService).toBe('function');
  });

  it('should have getAutomaticSuggestions method', () => {
    const suggestionService = require('../services/suggestionService');
    expect(typeof suggestionService.SuggestionService.getAutomaticSuggestions).toBe('function');
  });

  it('should have getSuggestionsForAiError method', () => {
    const suggestionService = require('../services/suggestionService');
    expect(typeof suggestionService.SuggestionService.getSuggestionsForAiError).toBe('function');
  });

  it('should have getSetupSuggestions method', () => {
    const suggestionService = require('../services/suggestionService');
    expect(typeof suggestionService.SuggestionService.getSetupSuggestions).toBe('function');
  });
});