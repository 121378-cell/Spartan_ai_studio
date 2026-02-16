# SPARTAN HUB MONOREPO ARCHITECTURE DOCUMENTATION

## Overview

This document describes the monorepo architecture implementation for Spartan Hub, organized using npm workspaces with Turbo for task orchestration.

## Project Structure

```
spartan-hub/
├── packages/
│   ├── frontend/          # React frontend application
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── context/
│   │   │   ├── services/
│   │   │   ├── utils/
│   │   │   └── __tests__/
│   │   ├── public/
│   │   └── package.json
│   │
│   ├── backend/           # Express backend API
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   ├── models/
│   │   │   ├── routes/
│   │   │   ├── middleware/
│   │   │   ├── services/
│   │   │   ├── utils/
│   │   │   └── __tests__/
│   │   └── package.json
│   │
│   ├── shared/            # Shared types, utilities, constants
│   │   ├── src/
│   │   │   ├── types/
│   │   │   ├── utils/
│   │   │   ├── constants/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── ai/               # Python AI services
│       ├── governance/
│       ├── prompts/
│       └── package.json
│
├── scripts/              # Build and deployment scripts
│   ├── migrate-to-monorepo.sh
│   └── migrate-to-monorepo.ps1
│
├── docs/                 # Documentation
├── turbo.json           # Turbo build configuration
├── package.json         # Root workspace configuration
└── README.md
```

## Package Descriptions

### @spartan-hub/shared
**Purpose**: Contains shared types, utilities, and constants used across all packages
**Dependencies**: None (pure TypeScript)
**Exports**: 
- Common TypeScript interfaces and types
- Utility functions (validation, formatting, etc.)
- Application constants and configuration
- Error classes and HTTP status codes

### @spartan-hub/frontend
**Purpose**: React frontend application
**Dependencies**: 
- `@spartan-hub/shared` (local dependency)
- React ecosystem packages
- Material-UI components
- Axios for API calls
**Features**:
- Component-based architecture
- React hooks for state management
- Context API for global state
- TypeScript type safety
- Jest testing framework

### @spartan-hub/backend
**Purpose**: Express backend API server
**Dependencies**:
- `@spartan-hub/shared` (local dependency)
- Express framework
- Database drivers (PostgreSQL)
- Authentication libraries
- Validation schemas (Zod)
**Features**:
- RESTful API architecture
- Database integration with TypeORM
- Authentication and authorization
- Input validation and sanitization
- Comprehensive test coverage

### @spartan-hub/ai
**Purpose**: Python-based AI services and machine learning models
**Dependencies**: Python packages for AI/ML
**Features**:
- Governance engine for AI decision making
- Prompt templates for various specialists
- Model training and evaluation scripts
- Integration with Ollama for inference

## Development Workflow

### Setting Up the Environment

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Build shared package** (required for first setup):
   ```bash
   npm run build:shared
   ```

3. **Start development servers**:
   ```bash
   # All packages in development mode
   npm run dev
   
   # Individual package development
   npm run dev:frontend
   npm run dev:backend
   ```

### Available Scripts

#### Root Level Scripts
```bash
npm run build          # Build all packages
npm run build:frontend # Build only frontend
npm run build:backend  # Build only backend
npm run build:shared   # Build only shared package

npm run dev            # Start all development servers
npm run dev:frontend   # Start frontend dev server
npm run dev:backend    # Start backend dev server

npm test               # Run tests for all packages
npm run test:coverage  # Run tests with coverage report

npm run lint           # Lint all packages
npm run lint:fix       # Auto-fix linting issues

npm run type-check     # TypeScript type checking
npm run clean          # Clean build artifacts
```

#### Package-Level Scripts
Each package maintains its own scripts for package-specific operations.

## Turbo Configuration

Turbo manages task execution across the monorepo with intelligent caching and parallelization.

### Key Features:
- **Task Dependencies**: `build` depends on dependent package builds
- **Caching**: Smart caching of build outputs
- **Parallel Execution**: Run independent tasks simultaneously
- **Persistent Tasks**: Long-running dev servers

### Pipeline Configuration:
```json
{
  "build": {
    "dependsOn": ["^build"],  // Depends on dependencies' builds
    "outputs": ["dist/**"]    // Cache dist directory
  },
  "test": {
    "dependsOn": ["build"]    // Run after build
  },
  "dev": {
    "cache": false,           // Don't cache dev servers
    "persistent": true        // Keep running
  }
}
```

## Migration Process

### Automated Migration
Use the provided migration scripts to convert existing structure:

**Linux/Mac**:
```bash
./scripts/migrate-to-monorepo.sh
```

**Windows**:
```powershell
.\scripts\migrate-to-monorepo.ps1
```

### Manual Migration Steps
1. Backup original structure
2. Create packages directory structure
3. Move frontend files to `packages/frontend/`
4. Move backend files to `packages/backend/`
5. Move AI files to `packages/ai/`
6. Create shared package with common types
7. Update package.json files with workspace references
8. Install dependencies and validate build

## Best Practices

### Dependency Management
- Use `@spartan-hub/shared` for cross-package dependencies
- Keep package dependencies minimal and focused
- Use exact versions for critical dependencies
- Regular dependency updates with security auditing

### Code Organization
- **Shared Logic**: Place in `@spartan-hub/shared`
- **Frontend Components**: Organize by feature/domain
- **Backend Services**: Follow MVC pattern
- **Tests**: Co-locate with implementation files

### Version Control
- Semantic versioning for packages
- Changesets for coordinated releases
- Branch strategies for feature development
- Automated testing in CI/CD

### Testing Strategy
- Unit tests for individual functions
- Integration tests for API endpoints
- End-to-end tests for critical user flows
- Mock external dependencies appropriately

## Troubleshooting

### Common Issues

1. **Dependency Resolution Errors**
   ```bash
   # Clean and reinstall
   npm run clean:deps
   npm install
   ```

2. **Build Failures**
   ```bash
   # Rebuild shared package first
   npm run build:shared
   npm run build
   ```

3. **TypeScript Errors**
   ```bash
   # Check types across all packages
   npm run type-check
   ```

4. **Test Failures**
   ```bash
   # Run tests with verbose output
   npm test -- --verbose
   ```

### Rollback Procedure
If migration fails, restore from backup:
```bash
# Remove current structure
rm -rf packages/
mv ../spartan-hub-backup/* .
```

## Performance Optimization

### Build Performance
- Turbo caching reduces rebuild times
- Incremental builds for changed files only
- Parallel task execution where possible

### Development Experience
- Hot module replacement in development
- Fast refresh for React components
- Type checking without full rebuilds

### Runtime Performance
- Tree shaking for frontend bundles
- Code splitting for large applications
- Database query optimization

## Future Enhancements

### Planned Improvements
- Docker containerization for each package
- Kubernetes deployment configurations
- Automated release management
- Enhanced monitoring and observability
- Performance benchmarking suite

### Scaling Considerations
- Package boundaries for team autonomy
- CI/CD pipeline optimization
- Monorepo tooling upgrades
- Documentation automation

---

This monorepo structure provides a solid foundation for scalable development while maintaining code sharing and consistency across the Spartan Hub platform.