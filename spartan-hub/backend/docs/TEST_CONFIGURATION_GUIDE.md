# Spartan Hub Test Configuration Guide

## Overview

This guide documents the test database configuration and coverage requirements for the Spartan Hub project. The test suite has been configured to ensure proper database isolation, security, and comprehensive coverage testing.

## Test Database Configuration

### Database Isolation

The test environment uses a completely isolated SQLite database to ensure tests don't interfere with production data:

- **Test Database Location**: `data/test_spartan.db`
- **Production Database Location**: `data/spartan.db`
- **Database Type**: SQLite (for test environment)
- **Schema**: Automatically initialized with all required tables

### Key Features

1. **Automatic Setup/Teardown**: Tests automatically create and clean up the test database
2. **Complete Isolation**: Each test run uses a fresh database instance
3. **Foreign Key Constraints**: Enabled to ensure data integrity
4. **WAL Mode**: Enabled for better concurrency during testing

### Environment Configuration

Test environment variables are automatically set in `src/__tests__/setup.ts`:

```typescript
process.env.JWT_SECRET = 'test_secret_32_characters_long_minimum_requirement';
process.env.JWT_ALGO = 'HS256';
process.env.SESSION_SECRET = 'test_session_secret_32_characters_long';
process.env.DATABASE_TYPE = 'sqlite';
process.env.NODE_ENV = 'test';
```

## Jest Configuration

### Test Settings

Located in `jest.config.js`:

- **Test Timeout**: 30 seconds
- **Max Workers**: 2 (to avoid resource conflicts)
- **Test Environment**: Node.js
- **Coverage Reports**: HTML, LCOV, text summary
- **Mock Reset**: Enabled for clean test state

### Coverage Thresholds

The following files have specific coverage requirements:

```javascript
coverageThreshold: {
  './src/routes/authRoutes.ts': { branches: 80, functions: 80, lines: 80, statements: 80 },
  './src/routes/tokenRoutes.ts': { branches: 80, functions: 80, lines: 80, statements: 80 },
  './src/middleware/auth.ts': { branches: 85, functions: 85, lines: 85, statements: 85 },
  './src/services/tokenService.ts': { branches: 85, functions: 85, lines: 85, statements: 85 },
  './src/controllers/tokenController.ts': { branches: 80, functions: 80, lines: 80, statements: 80 }
}
```

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- --testPathPatterns="filename.test.ts"

# Run tests with longer timeout
npm test -- --testTimeout=30000

# Run security-specific tests
npm run test:security
```

### Backend-Specific Commands

```bash
cd backend

# Run backend tests
npm test

# Run backend tests with coverage
npm run test:coverage

# Run security middleware tests
npm run test:coverage:security
```

## Test Structure

### Test Files Organization

```
backend/src/__tests__/
├── setup.ts                           # Global test setup
├── testDatabaseManager.ts             # Test database management
├── auth.middleware.comprehensive.test.ts    # Auth middleware tests
├── database.service.comprehensive.test.ts   # Database service tests
├── security.middleware.test.ts        # Security middleware tests
├── tokenService.test.ts               # Token service tests
├── [other test files]...
```

### Test Database Manager

The `TestDatabaseManager` class provides:

- `setupTestDatabase()`: Creates isolated test database
- `cleanupTestDatabase()`: Removes test database
- `setTestEnvironment()`: Configures environment for tests
- `restoreOriginalEnvironment()`: Restores original environment

## Coverage Requirements

### Target Coverage: 80%+

To achieve 80%+ code coverage:

1. **Focus Areas**:
   - Authentication middleware (85% threshold)
   - Token service (85% threshold)
   - Authorization routes (80% threshold)
   - Database services (80% threshold)

2. **Coverage Types**:
   - **Lines**: Percentage of lines executed
   - **Functions**: Percentage of functions called
   - **Branches**: Percentage of branches taken
   - **Statements**: Percentage of statements executed

### Coverage Reports

Coverage reports are generated in multiple formats:

- **HTML**: `backend/coverage/index.html`
- **LCOV**: `backend/coverage/lcov.info`
- **Console**: Displayed in terminal
- **Summary**: Text summary in terminal

## Best Practices

### Writing Tests

1. **Use Descriptive Test Names**: Clearly describe what is being tested
2. **Follow AAA Pattern**: Arrange, Act, Assert
3. **Mock External Dependencies**: Use Jest mocks for external services
4. **Clean Up After Tests**: Use `beforeEach` and `afterEach` hooks
5. **Test Edge Cases**: Include error conditions and boundary values

### Database Testing

1. **Isolate Tests**: Each test should be independent
2. **Use Transactions**: For complex operations, use database transactions
3. **Clean Data**: Clear test data between tests
4. **Test Relationships**: Verify foreign key constraints work correctly

### Security Testing

1. **Test Authentication**: Verify JWT token validation
2. **Test Authorization**: Verify role-based access control
3. **Test Input Validation**: Verify schema validation
4. **Test Error Handling**: Verify secure error responses

## Troubleshooting

### Common Issues

1. **Database Connection Errors**:
   - Ensure test database path is correct
   - Check file permissions for data directory

2. **JWT Secret Errors**:
   - Ensure JWT_SECRET is at least 32 characters
   - Check environment variable configuration

3. **Timeout Errors**:
   - Increase test timeout for long-running tests
   - Check for infinite loops or blocking operations

4. **Coverage Gaps**:
   - Identify uncovered files using coverage report
   - Add tests for missing code paths
   - Focus on critical security components

### Debug Commands

```bash
# Run single test with verbose output
npm test -- --testNamePattern="test name" --verbose

# Run tests without parallelization
npm test -- --runInBand

# Generate coverage report only
npm run test:coverage -- --collectCoverageOnly
```

## Security Considerations

### Test Data Security

1. **No Production Data**: Never use production data in tests
2. **Secure Defaults**: Use secure default values for tests
3. **Environment Isolation**: Ensure test environment is completely isolated
4. **Clean Secrets**: Use test-specific secrets and keys

### Test Database Security

1. **Separate Database**: Use completely separate test database
2. **No Persistence**: Test database is cleaned after each run
3. **Secure Configuration**: Use secure defaults for test database
4. **Access Control**: Ensure test database has appropriate permissions

## Maintenance

### Regular Tasks

1. **Update Dependencies**: Keep testing dependencies up to date
2. **Review Coverage**: Regularly review and improve coverage
3. **Clean Up Tests**: Remove obsolete or redundant tests
4. **Performance Monitoring**: Monitor test execution time

### Adding New Tests

1. **Follow Naming Conventions**: Use descriptive test file names
2. **Update Documentation**: Update this guide when adding new test patterns
3. **Maintain Coverage**: Ensure new code has corresponding tests
4. **Security Review**: Review security-related tests for completeness

## Support

For issues or questions about test configuration:

1. Check this documentation first
2. Review existing test patterns
3. Check Jest and testing library documentation
4. Contact the development team

---

**Last Updated**: 2025-12-31
**Version**: 1.0.0
**Maintainer**: Spartan Hub Development Team