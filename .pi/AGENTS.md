# Project: [Name]

## Architecture
[Brief description of architecture and key patterns]

## Conventions
- TypeScript strict mode
- Zod for runtime validation
- Repository pattern for data access
- Structured logging with correlation IDs
- All errors must extend AppError

## Before Making Changes
1. Read the relevant files first
2. Understand the existing patterns
3. Check for related tests
4. Verify no breaking API changes

## After Making Changes
1. Run `npm run typecheck`
2. Run `npm run lint`
3. Run `npm run test`
4. Update documentation if behavior changed
5. Update migrations if schema changed

## Never
- Hardcode secrets
- Remove tests to make them pass
- Disable security controls
- Modify production infrastructure
- Make breaking API changes without approval

## Risk Levels

### Low-Risk (Pi may auto-execute)
- Reading files
- Running tests, lint, typecheck
- Creating new files in src/ or tests/

### Medium-Risk (Pi must explain and verify)
- Editing existing files
- Running git commit
- Adding dependencies (must justify)
- Creating migrations

### High-Risk (Pi must propose plan, wait for approval)
- Changing public APIs
- Changing database schema
- Modifying authentication/authorization
- Modifying CI/CD pipelines

### Critical (Human must execute)
- Running terraform apply
- Modifying production infrastructure
- Changing secrets
- Deploying to production