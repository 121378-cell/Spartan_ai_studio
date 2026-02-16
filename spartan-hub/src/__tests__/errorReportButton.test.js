// Test for the error report button component
describe('Error Report Button Component', () => {
  it('should be able to import ErrorReportButton component', () => {
    // This test simply verifies that the component can be imported without errors
    expect(() => {
      require('../components/ErrorReportButton');
    }).not.toThrow();
  });
});