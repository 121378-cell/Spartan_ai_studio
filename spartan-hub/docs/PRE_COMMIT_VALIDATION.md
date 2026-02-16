# Pre-Commit Validation System

## Overview

The Spartan Hub project uses a comprehensive pre-commit validation system to ensure code quality, security, and consistency before any changes are committed to the repository.

## Components

### 1. Husky Git Hooks

- **Location**: `.husky/pre-commit`
- **Purpose**: Automatically runs validation checks before each commit
- **Blocking**: Prevents commits that don't meet quality standards

### 2. ESLint Configuration

- **Location**: `.eslintrc.json`
- **Features**:
  - Security-focused rules (eslint-plugin-security)
  - TypeScript strict type checking
  - Code quality enforcement
  - Consistent formatting standards

### 3. TypeScript Type Checking

- **Configuration**: `tsconfig.json` with strict mode enabled
- **Enforcement**: Blocks commits with type errors or unsafe 'any' types
- **Verification**: Ensures all interfaces and type definitions are properly implemented

### 4. Jest Unit Testing

- **Configuration**: `jest.config.js`
- **Requirements**: All unit tests must pass before commit
- **Coverage**: Minimum 80% coverage for security components

### 5. Security Auditing

- **Process**: Runs `npm audit` with critical level checking
- **Blocking**: Prevents commits with critical security vulnerabilities

### 6. Lint-Staged Integration

- **Location**: `.lintstagedrc.json`
- **Optimization**: Only processes staged files for faster validation
- **Automatic Fixing**: Applies auto-fixable ESLint issues

## Validation Pipeline

The pre-commit hook executes the following checks in order:

1. **Lint-Staged Processing** - Fast validation of staged files only
2. **Generated File Detection** - Blocks coverage reports and build artifacts
3. **Security Audit** - Checks for critical npm vulnerabilities
4. **Type Checking** - Comprehensive TypeScript validation
5. **Unit Tests** - Full test suite execution
6. **Final ESLint Check** - Additional verification of staged files

## Configuration Files

### Package.json Scripts

```json
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx,.js,.jsx",
    "lint:fix": "eslint . --ext .ts,.tsx,.js,.jsx --fix",
    "type-check": "tsc --noEmit",
    "security-audit": "npm audit --audit-level=critical",
    "pre-commit-check": "npm run lint && npm run type-check && npm run test && npm run security-audit"
  }
}
```

### ESLint Rules (Blocking)

- `security/detect-object-injection`: "error"
- `security/detect-non-literal-regexp`: "error"
- `security/detect-eval-with-expression`: "error"
- `@typescript-eslint/no-explicit-any`: "error"
- `prefer-const`: "error"
- `no-var`: "error"
- `no-duplicate-imports`: "error"

## Usage

### Automatic Validation

The system runs automatically when you commit changes:

```bash
git add .
git commit -m "feat: add new feature"
```

### Manual Validation

Run individual checks manually:

```bash
# Run all pre-commit checks
npm run pre-commit-check

# Run type checking only
npm run type-check

# Run linting only
npm run lint

# Run security audit only
npm run security-audit
```

## Troubleshooting

### Common Issues

1. **TypeScript Errors**
   - Fix all type errors before committing
   - Use `npm run type-check` to see specific errors
   - Ensure strict mode compliance

2. **Linting Failures**
   - Run `npm run lint:fix` to auto-fix issues
   - Review remaining errors manually
   - Check ESLint configuration for rule specifics

3. **Test Failures**
   - Run failing tests individually
   - Ensure all tests pass with `npm test`
   - Check test coverage requirements

4. **Security Vulnerabilities**
   - Run `npm audit` to see vulnerability details
   - Update vulnerable dependencies
   - Contact security team for critical issues

### Bypassing Validation (Not Recommended)

In emergency situations, you can bypass validation:

```bash
git commit -m "emergency fix" --no-verify
```

⚠️ **Warning**: This should only be used for critical hotfixes and requires immediate follow-up to address validation issues.

## Best Practices

1. **Run validation locally** before pushing changes
2. **Fix issues incrementally** rather than batching them
3. **Write tests** for new functionality
4. **Keep dependencies updated** to avoid security issues
5. **Review ESLint warnings** even if they don't block commits
6. **Maintain type safety** by avoiding `any` types

## Continuous Improvement

The pre-commit validation system is regularly reviewed and enhanced based on:

- New security threats and vulnerabilities
- TypeScript and ESLint rule updates
- Team feedback and pain points
- Industry best practices evolution

## Support

For issues with the pre-commit validation system:

1. Check this documentation first
2. Review error messages carefully
3. Consult team leads for complex issues
4. Submit improvement suggestions through GitHub issues
