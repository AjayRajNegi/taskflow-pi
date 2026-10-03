# Architecture

## 1. Architecture Overview

The application is a **modular monolith** built with TypeScript and Bun.

The system is organized into clear application modules rather than separate microservices. All modules run within the main API application, while background jobs run through separate worker processes.

### High-Level Architecture

```text
                        ┌─────────────────────┐
                        │      API Client     │
                        └──────────┬──────────┘
                                   │
                                   ▼
                        ┌─────────────────────┐
                        │      API Layer      │
                        │ Routing / Auth /    │
                        │ Validation / HTTP   │
                        └──────────┬──────────┘
                                   │
                                   ▼
                     ┌───────────────────────────┐
                     │    Application Services   │
                     │                           │
                     │ TaskService               │
                     │ TenantService             │
                     │ NotificationService       │
                     │ FileService               │
                     │ PaymentService             │
                     └─────────────┬─────────────┘
                                   │
                         ┌─────────┴─────────┐
                         ▼                   ▼
                ┌─────────────────┐   ┌───────────────┐
                │    Prisma ORM   │   │  Job Queue    │
                └────────┬────────┘   │ Redis/BullMQ  │
                         │            └───────┬───────┘
                         ▼                    │
                ┌─────────────────┐           ▼
                │   PostgreSQL    │    ┌───────────────┐
                └─────────────────┘    │ Worker Process│
                                       └───────┬───────┘
                                               │
                              ┌────────────────┼────────────────┐
                              ▼                ▼                ▼
                         Email Provider    Razorpay       File Storage
                                                            Cloudflare R2
```

---

# 2. Technology Decisions

| Area               | Decision                                 |
| ------------------ | ---------------------------------------- |
| Language           | TypeScript                               |
| Runtime            | Bun                                      |
| API                | TypeScript/Bun-compatible HTTP framework |
| Database           | PostgreSQL                               |
| ORM                | Prisma                                   |
| Background Jobs    | BullMQ                                   |
| Queue Backend      | Redis                                    |
| File Storage       | Cloudflare R2                            |
| Local File Storage | Local filesystem                         |
| Payments           | Razorpay                                 |
| API Documentation  | OpenAPI                                  |
| Architecture       | Modular monolith                         |

The application should remain compatible with the Node.js ecosystem where practical, even though Bun is the primary runtime.

Avoid introducing technologies that duplicate existing capabilities without a clear reason.

---

# 3. Architectural Style

Use a **modular monolith**.

The system should have strong internal module boundaries while remaining a single application/codebase.

This provides:

* Simple local development
* Simple deployment
* Low infrastructure overhead
* Straightforward database transactions
* Easy end-to-end testing
* Clear separation of business domains
* Ability to extract modules into services later if required

Do not introduce microservices unless a concrete requirement justifies them.

---

# 4. Application Structure

The application should be organized around business modules rather than purely technical folders.

Recommended structure:

```text
src/
├── modules/
│   ├── auth/
│   ├── tenants/
│   ├── users/
│   ├── tasks/
│   ├── notifications/
│   ├── files/
│   └── payments/
│
├── infrastructure/
│   ├── database/
│   ├── queue/
│   ├── storage/
│   ├── email/
│   └── payments/
│
├── shared/
│   ├── errors/
│   ├── logging/
│   ├── validation/
│   └── tenancy/
│
├── app/
│   ├── middleware/
│   ├── routes/
│   └── config/
│
└── server.ts
```

The exact directory structure may adapt to the existing repository, but the module boundaries should remain clear.

---

# 5. Layer Responsibilities

## 5.1 API Layer

Responsible for HTTP concerns:

* Routing
* Request parsing
* Authentication middleware
* Authorization checks
* Input validation
* Calling application services
* HTTP status codes
* Response serialization
* OpenAPI integration

The API layer should not contain substantial business logic.

---

## 5.2 Application Layer

Application services coordinate use cases.

Examples:

```text
TaskService
TenantService
NotificationService
FileService
PaymentService
```

Responsibilities include:

* Executing business use cases
* Coordinating repositories/infrastructure
* Enforcing application-level business rules
* Managing transactions where required
* Publishing domain/application events

Application services should not depend directly on HTTP concepts.

---

## 5.3 Domain Layer

Contains domain concepts and business rules.

Core entities include:

```text
User
Tenant
Task
Attachment
Subscription
```

Business rules should live here or in the application layer depending on their complexity.

The domain should not depend on HTTP, Redis, Razorpay, or Cloudflare R2.

---

## 5.4 Infrastructure Layer

Contains implementations that communicate with external systems.

Examples:

```text
PostgreSQL
Prisma
Redis
BullMQ
Razorpay
Email Provider
Cloudflare R2
```

External integrations should be hidden behind interfaces/adapters where doing so provides meaningful isolation.

---

# 6. Multi-Tenancy

Multi-tenancy is a critical architectural concern.

All tenant-owned database records must be associated with a tenant.

Conceptually:

```text
Tenant
 ├── Users
 ├── Tasks
 ├── Attachments
 └── Subscription
```

Tenant isolation must be enforced server-side.

## Tenant Resolution

The authenticated user establishes the tenant context.

The server must determine which tenant(s) the user belongs to and authorize access accordingly.

Do not blindly trust a `tenant_id` supplied by the client.

If a tenant identifier is included in a request, it must be validated against the authenticated user's authorized tenant context.

---

# 7. Database Architecture

Use:

**PostgreSQL + Prisma**

All tenant-owned tables should contain a tenant relationship.

Example:

```text
tasks
├── id
├── tenant_id
├── ...
```

```text
attachments
├── id
├── tenant_id
├── task_id
├── ...
```

Tenant filtering must happen consistently at the data-access boundary.

## Row-Level Security

PostgreSQL Row-Level Security may be used as an additional defense-in-depth mechanism.

However, application-level tenant authorization must not be abandoned merely because RLS exists.

The system should be designed so that accidental cross-tenant queries are difficult to write.

---

# 8. Prisma

Prisma is the primary database access layer.

Responsibilities:

* Database queries
* Transactions
* Schema management
* Migrations
* Type-safe database access

Application modules should avoid scattering raw SQL throughout the codebase.

Raw SQL may be used when Prisma cannot efficiently express a required operation, but it must preserve tenant isolation.

---

# 9. Authentication and Authorization

Authentication establishes the identity of the caller.

Authorization determines whether that identity may access a resource.

These concerns must remain separate.

Conceptually:

```text
Request
   ↓
Authentication
   ↓
Identify User
   ↓
Resolve Tenant Membership
   ↓
Authorize Resource
   ↓
Application Service
```

Every tenant-owned resource access must verify authorization.

Never rely solely on:

```text
client-provided tenant_id
```

for access control.

---

# 10. Task Architecture

Task operations are handled by `TaskService`.

Responsibilities:

* Create task
* Retrieve task
* Update task
* Delete task
* Assign task
* Validate task-related business rules
* Publish task assignment events

Task queries must always operate within the authorized tenant context.

---

# 11. Background Processing

Use:

**BullMQ + Redis**

Background jobs should be used for operations that should not block API requests.

Initial job categories:

```text
notification jobs
payment retry jobs
```

Example:

```text
Task Assigned
     │
     ▼
TaskService
     │
     ▼
Publish Job
     │
     ▼
Redis
     │
     ▼
BullMQ Worker
     │
     ▼
Email Provider
```

The API should return without waiting for email delivery.

---

# 12. Job Reliability

Background jobs should support:

* Retry attempts
* Exponential backoff
* Failed-job handling
* Dead-letter/failed-job inspection
* Idempotent processing where required

Jobs must be designed so that retries do not unintentionally perform the same irreversible operation multiple times.

For example, email/payment processing should consider duplicate execution.

---

# 13. Email Architecture

Email delivery should be abstracted behind an email provider interface.

Conceptually:

```ts
interface EmailProvider {
  send(options: SendEmailOptions): Promise<void>
}
```

The application should not depend directly on a specific email provider.

This allows the provider to be changed without changing notification business logic.

---

# 14. File Storage

Use an abstraction for file storage.

```ts
interface FileStorage {
  upload(...)
  download(...)
  delete(...)
}
```

## Development

Use local filesystem storage.

This avoids requiring a cloud account during local development.

## Production

Use **Cloudflare R2**.

R2 is S3-compatible and therefore allows the application to use standard S3-style APIs without requiring an AWS S3 account.

The storage provider must remain behind the storage abstraction.

---

# 15. File Upload Flow

```text
Client
  │
  ▼
API
  │
  ▼
FileService
  │
  ├── Validate authentication
  ├── Validate tenant access
  ├── Validate file size
  ├── Validate metadata
  │
  ▼
Storage Adapter
  │
  ▼
Cloudflare R2 / Local Storage
  │
  ▼
Save Attachment Metadata
  │
  ▼
PostgreSQL
```

Maximum file size:

```text
10 MB
```

File metadata should include appropriate information such as:

* File identifier
* Tenant identifier
* Associated resource/task
* Storage key
* File size
* MIME type
* Original filename
* Created timestamp

Files must not become publicly accessible merely because their metadata is stored in the database.

---

# 16. Payment Architecture

Use **Razorpay** for payment processing.

Payment functionality should be isolated behind `PaymentService`.

Conceptually:

```text
Application
    │
    ▼
PaymentService
    │
    ▼
Razorpay
    │
    ▼
Webhook
    │
    ▼
Webhook Handler
    │
    ▼
Validate Event
    │
    ▼
Update Subscription State
```

The system must verify Razorpay webhook authenticity before processing webhook events.

Payment-provider state should not be trusted solely based on client-side information.

---

# 17. Payment Reliability

Payment-related asynchronous work should use the existing BullMQ infrastructure where appropriate.

If Razorpay or another external payment operation temporarily fails:

```text
Payment Operation
      ↓
Queue
      ↓
Retry
      ↓
Razorpay
```

Payment operations should be designed with idempotency in mind.

The application should maintain its own subscription state rather than querying Razorpay for every normal API request.

---

# 18. OpenAPI

The API must expose an OpenAPI specification.

The preferred approach is to generate or derive the specification from the API implementation where practical.

The project should avoid maintaining two independent sources of truth for API behavior.

If the framework/library makes code-first OpenAPI generation practical, prefer that approach.

The OpenAPI specification should be validated as part of CI.

---

# 19. API Versioning

The API should be versioned from the beginning to allow future breaking changes.

Preferred convention:

```text
/api/v1/...
```

Breaking API changes should result in a new API version rather than silently changing existing behavior.

Non-breaking changes may be introduced within the existing version.

---

# 20. Rate Limiting

The API should support rate limiting at the infrastructure/API layer.

Rate limits should particularly protect:

* Authentication endpoints
* File-upload endpoints
* Payment-related endpoints
* Expensive API operations

Exact limits should be determined based on the deployment environment and actual usage requirements rather than hardcoded prematurely.

---

# 21. Error Handling

Use a consistent application error model.

Errors should be categorized appropriately:

```text
ValidationError
AuthenticationError
AuthorizationError
NotFoundError
ConflictError
ExternalServiceError
InternalError
```

The API layer should convert application errors into appropriate HTTP responses.

Internal stack traces and sensitive infrastructure information must not be exposed to clients.

---

# 22. Observability

The application should provide structured logging.

Important events include:

* Authentication failures
* Authorization failures
* Cross-tenant access attempts
* Background-job failures
* Email failures
* Razorpay failures
* File-storage failures
* Unexpected application errors

Logs must avoid unnecessarily exposing:

* Passwords
* Authentication tokens
* Payment secrets
* Private file URLs
* Other sensitive information

---

# 23. Transaction Boundaries

Database transactions should be used where multiple related database operations must succeed or fail together.

For example:

```text
Create Task
    +
Create Assignment
    +
Create Outbox/Event Record
```

should use a transaction when consistency requires it.

External operations such as:

* Email
* Razorpay
* File storage

must not be treated as if they participate in PostgreSQL transactions.

Where database state and external side effects must remain consistent, use appropriate asynchronous/event-based patterns.

---

# 24. Deployment Model

Start with a simple deployment model.

Initial architecture:

```text
                 ┌──────────────┐
                 │ API Process  │
                 └──────┬───────┘
                        │
          ┌─────────────┼──────────────┐
          ▼             ▼              ▼
     PostgreSQL       Redis       Cloudflare R2
          │             │
          │             ▼
          │       Worker Process
          │
          ▼
       Database
```

The API and worker should be deployable independently even though they share the same codebase.

Do not introduce Kubernetes, service meshes, or microservice orchestration unless project scale later justifies them.

---

# 25. Local Development

The project should be runnable locally without requiring paid infrastructure.

Recommended local dependencies:

```text
Bun
PostgreSQL
Redis
```

PostgreSQL and Redis can be run through Docker for development.

File storage should use the local filesystem by default.

Cloudflare R2 should only be required when testing the production storage adapter.

Razorpay integration should support test/sandbox credentials during development.

---

# 26. Configuration

Configuration must come from environment variables or an equivalent configuration system.

Examples:

```text
DATABASE_URL
REDIS_URL

AUTH_SECRET

R2_ENDPOINT
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET

RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET

EMAIL_PROVIDER_API_KEY
```

Secrets must never be committed to source control.

Environment-specific configuration should not be hardcoded.

---

# 27. Testing Architecture

The project should use multiple testing levels.

## Unit Tests

Test isolated business logic.

## Integration Tests

Test:

* PostgreSQL interactions
* Tenant isolation
* Prisma queries
* Background job behavior
* External integration boundaries

## API Tests

Test complete HTTP flows.

Critical scenarios include:

```text
Authenticated Tenant A → Tenant A resource = allowed

Authenticated Tenant A → Tenant B resource = rejected
```

Cross-tenant isolation must have automated test coverage.

---

# 28. Security Principles

The following principles apply throughout the architecture:

1. Never trust client-provided tenant identifiers.
2. Authenticate before accessing protected resources.
3. Authorize every tenant-owned resource.
4. Validate all external input.
5. Keep secrets out of source control.
6. Verify payment webhooks.
7. Do not expose private files by default.
8. Treat background jobs as potentially duplicated.
9. Do not expose internal errors to API clients.
10. Prefer defense in depth for tenant isolation.

---

# 29. Architectural Trade-offs

## Modular Monolith

### Advantages

* Simple deployment
* Low operational overhead
* Fast development
* Easy local development
* Easy transactions
* Easy end-to-end testing

### Disadvantages

* Modules share the same application process
* Individual modules cannot be independently deployed initially
* Poor module boundaries could cause coupling over time

The project accepts these trade-offs in favor of development speed and simplicity.

---

## PostgreSQL + Prisma

### Advantages

* Strong relational model
* Excellent fit for multi-tenant relational data
* Mature ecosystem
* Type-safe database access
* Prisma migrations and generated types

### Disadvantages

* Prisma adds an abstraction layer
* Some advanced PostgreSQL features may require raw SQL

---

## Redis + BullMQ

### Advantages

* Mature Node/Bun ecosystem
* Retries and delayed jobs
* Good fit for asynchronous notifications
* Simple worker architecture

### Disadvantages

* Adds Redis as infrastructure
* Requires monitoring of failed jobs and queue backlog

---

## Cloudflare R2

### Advantages

* S3-compatible API
* Suitable for object storage
* Avoids requiring AWS S3 specifically
* Easy migration from local storage through an adapter

### Disadvantages

* Additional external dependency
* Production storage still requires cloud credentials and configuration

---

# 30. Scalability Strategy

The initial system should optimize for simplicity rather than premature scaling.

When load increases:

```text
Phase 1
Single API + Worker
        ↓
Phase 2
Multiple API instances
        ↓
Phase 3
Multiple Worker instances
        ↓
Phase 4
Database optimization / read replicas
        ↓
Phase 5
Extract individual components only if required
```

Do not prematurely split the application into microservices.

---

# 31. Architecture Decision Rules

When making future architectural decisions:

1. Prefer the simplest solution that satisfies the requirements.
2. Prefer technologies already used by the project.
3. Avoid adding infrastructure without a clear benefit.
4. Preserve tenant isolation above all other optimization goals.
5. Keep external providers behind adapters where practical.
6. Prefer reversible decisions when requirements are uncertain.
7. Do not optimize for hypothetical scale before measuring actual bottlenecks.
8. Avoid architectural complexity that does not solve a current requirement.

---

# 32. System Components

Detailed component responsibilities and dependency boundaries are defined in `docs/system-components.md`.

The system follows the dependency direction documented there.

# 33. Source of Truth

The following documents have distinct responsibilities:

### `docs/project-requirements.md`

Defines:

* What the product must do
* Product requirements
* Business constraints
* Non-goals
* Success criteria

### `docs/architecture.md`

Defines:

* Technology choices
* System architecture
* Module boundaries
* Infrastructure
* Data flow
* Security architecture
* Integration architecture

### `AGENTS.md`

Defines:

* How the coding agent should work
* Repository conventions
* Coding rules
* Testing expectations
* File/change restrictions

If these documents conflict, the conflict must be identified before implementation rather than silently choosing one interpretation.
