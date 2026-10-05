# AGENTS.md

## Project

This repository is a TypeScript backend project.

Before making implementation changes, read the relevant documentation
in `docs/`.

The documentation is the source of truth for product requirements,
architecture, data models, API contracts, and security decisions.

---

## Documentation

Read these documents when relevant:

- `docs/project-requirements.md` — product requirements and constraints
- `docs/architecture.md` — high-level architectural decisions
- `docs/system-components.md` — component responsibilities and boundaries
- `docs/data-model.md` — database schema and data relationships
- `docs/api-contracts.md` — external API contracts
- `docs/security.md` — security model and security constraints
- `docs/implementation-plan.md` — current implementation plan

Do not contradict these documents silently.

If implementation reveals a conflict or missing decision:

1. Stop and identify the conflict.
2. Explain why it matters.
3. Do not silently invent a product or architectural decision.

---

## Technology

Use the project's established stack:

- TypeScript
- Bun
- PostgreSQL
- Prisma
- Redis / BullMQ where background jobs are required
- Razorpay for payments
- Cloudflare R2 for production file storage

Do not introduce a new framework, database, queue, ORM, cloud service,
or major dependency without justification.

Prefer existing dependencies over adding new ones.

---

## Architecture Rules

Follow the architecture documented in `docs/architecture.md`.

Maintain the dependency boundaries defined in
`docs/system-components.md`.

Business rules belong in the appropriate application/domain layer,
not in HTTP handlers or database-specific code.

HTTP handlers should remain thin:

Request
→ validation
→ application/service layer
→ response

Do not allow controllers/routes to contain substantial business logic.

Database access should remain behind the repository/data-access boundary
defined by the architecture.

Do not access the database directly from unrelated modules.

---

## Multi-Tenancy

Tenant isolation is a critical security requirement.

Never trust a client-provided `tenant_id` as proof of authorization.

Tenant context must come from the authenticated identity and the
server-side authorization model.

Every tenant-owned resource must be accessed within the authorized
tenant context.

When adding a query involving tenant-owned data, verify that it cannot
return another tenant's data.

Treat any potential cross-tenant data leak as a critical bug.

---

## API Rules

Follow `docs/api-contracts.md`.

Do not change an existing API contract casually.

If an API change is necessary:

1. Identify the affected contract.
2. Explain the compatibility impact.
3. Update the relevant documentation.
4. Then implement the change.

Use the project's standard error format.

Validate external input at the API boundary.

Do not expose internal database errors directly to API clients.

---

## Database Rules

Use Prisma for database access.

Use PostgreSQL features intentionally where required by the architecture.

Do not modify the database schema casually.

For schema changes:

1. Update `docs/data-model.md` when the design changes.
2. Create the appropriate Prisma migration.
3. Verify affected queries and constraints.

Never make destructive schema changes without explicit justification.

---

## Security

Follow `docs/security.md`.

Never commit:

- API keys
- passwords
- tokens
- private keys
- production credentials
- `.env` files containing secrets

Use environment variables for secrets.

Never log secrets, authentication credentials, or sensitive data.

Treat authentication, authorization, tenant isolation, file uploads,
payments, and webhooks as security-sensitive code.

---

## Error Handling

Use consistent application errors.

Do not silently swallow errors.

Errors should contain enough context for debugging without exposing
sensitive information to clients.

Distinguish between:

- validation errors
- authentication errors
- authorization errors
- not-found errors
- conflict errors
- internal errors
- external-service failures

---

## Background Jobs

Background jobs must be safe to retry.

Do not assume a job executes exactly once.

Where an operation can produce duplicate side effects, use appropriate
idempotency or deduplication mechanisms.

Failed jobs should be observable and recoverable according to the
architecture.

---

## Code Style

Prefer:

- small focused functions
- explicit types
- clear names
- simple control flow
- early validation
- predictable error handling
- minimal abstractions

Avoid:

- unnecessary abstractions
- speculative features
- premature optimization
- duplicated business logic
- large unrelated refactors

Follow the existing repository conventions when they are already
established.

---

## Dependency Changes

Before adding a dependency, determine whether the existing stack can
solve the problem.

When adding a dependency:

- explain why it is needed
- prefer mature, actively maintained packages
- avoid overlapping libraries
- update the lockfile
- verify the dependency does not introduce unnecessary security or
  operational complexity

---

## Change Discipline

Keep changes focused.

Do not modify unrelated files.

Do not perform broad refactors while implementing an unrelated feature.

Before changing an existing abstraction, search the repository for its
usages and understand the impact.

Preserve existing behavior unless the requirements explicitly require
a change.

---

## Documentation Synchronization

When implementation changes a documented architectural decision,
data model, API contract, or security behavior, update the relevant
documentation.

Do not allow code and design documentation to silently diverge.

However, do not rewrite documentation for implementation details that
do not affect the documented design.

---

## Implementation Workflow

Before implementing a feature:

1. Read the relevant requirements.
2. Read the relevant architecture/design documents.
3. Inspect the existing implementation.
4. Identify affected modules.
5. Create or follow the implementation plan.
6. Implement the smallest coherent change.
7. Review the change for security and tenant-isolation issues.
8. Update documentation if the design or contract changed.

Do not jump directly from a vague feature request to implementation
when important design decisions are unresolved.

---

## When Uncertain

Do not guess when the decision affects:

- product behavior
- API contracts
- database structure
- security
- tenant isolation
- external integrations
- architectural boundaries

Instead, identify the ambiguity and ask for clarification or record
it as an explicit design decision before implementation.