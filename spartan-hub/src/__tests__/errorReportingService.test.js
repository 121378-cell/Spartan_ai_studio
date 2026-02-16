// Test for the error reporting service
describe('Error Reporting Service', () => {
  it('should be able to import the error reporting service', () => {
    // This test simply verifies that the service can be imported without errors
    expect(() => {
      require('../services/errorReportingService');
    }).not.toThrow();
  });

  it('should have ErrorReportingService class', () => {
    const errorReportingService = require('../services/errorReportingService');
    expect(typeof errorReportingService.ErrorReportingService).toBe('function');
  });

  it('should have reportError method', () => {
    const errorReportingService = require('../services/errorReportingService');
    expect(typeof errorReportingService.ErrorReportingService.reportError).toBe('function');
  });

  it('should have getReports method', () => {
    const errorReportingService = require('../services/errorReportingService');
    expect(typeof errorReportingService.ErrorReportingService.getReports).toBe('function');
  });

  it('should be able to report an error', () => {
    const { ErrorReportingService } = require('../services/errorReportingService');
    
    // Clear any existing reports
    ErrorReportingService.clearReports();
    
    // Report an error
    const report = ErrorReportingService.reportError(
      'Test error message',
      'TestComponent',
      { testContext: 'testValue' },
      { name: 'Test User' },
      'medium',
      true
    );
    
    // Verify the report was created correctly
    expect(report).toBeDefined();
    expect(report.error).toBe('Test error message');
    expect(report.component).toBe('TestComponent');
    expect(report.context).toEqual({ testContext: 'testValue' });
    expect(report.userProfile).toEqual({ name: 'Test User' });
    expect(report.severity).toBe('medium');
    expect(report.reportedByUser).toBe(true);
    
    // Verify it was added to the reports
    const reports = ErrorReportingService.getReports();
    expect(reports.length).toBe(1);
    expect(reports[0]).toEqual(report);
  });
});