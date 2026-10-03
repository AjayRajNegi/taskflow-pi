# Project: TaskFlow

## Architecture
Task management API for teams with multi-tenant support,
background notifications, and file attachments.

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
1. Update documentation if behavior changed
2. Update migrations if schema changed

## Never
- Hardcode secrets
- Remove tests to make them pass
- Disable security controls
- Modify production infrastructure
- Make breaking API changes without approval

## Risk Levels

### Low-Risk
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

## Stack
TypeScript 5, Node 22, postgresql, Zod, Vitest.

## Commands
- `npm run dev` start | `make check` lint+types+tests+audit (run before saying "done")

## Layout
src/http (routes), src/services, src/repo, src/config; tests mirror src/.

## Conventions
- Validate all input with Zod at the route boundary.
- Services never import Fastify. Repo is the only code that touches SQL.
- Errors use the format in docs/api-contracts.md.

## Rules
- Work on ONE task (docs/tasks/T-xxx.md) per session. Stay within its scope.
- Plan first; do not edit files until I say "implement".
- Never change migrations that already shipped; add a new one.
- Do not add dependencies, change CI, or touch .env without asking.
- No secrets in code or logs.
- Update docs/ in the same change if behavior or contracts change.

## References
docs/architecture.md, docs/api-contracts.md, docs/data-model.md, docs/security.md, docs/adr/