> **Note:** This is my first vibe-coded app with the help of pi coding agent to understand AI-assisted coding and its workflow. DO NOT use this project without testing it first. 

# TaskFlow API

A production-oriented REST API for task management with multi-tenant isolation, background notifications, file attachments, and payment support for premium features.

## Project Overview

TaskFlow is a backend API designed for small teams and developers who need a reliable, secure, and scalable task management system. The API enforces strict tenant isolation, supports asynchronous email notifications, file uploads (up to 10 MB), and integrates with Razorpay for subscription‑based premium features.

## Key Features

- **Multi-tenancy** – Each tenant (team/organization) has isolated data; users belong to a single tenant.
- **Task Management** – CRUD operations for tasks, assignment, status updates, pagination, filtering.
- **File Attachments** – Upload files (max 10 MB) to tasks; metadata stored, files kept in tenant‑specific storage.
- **Background Notifications** – Email notifications on task assignment processed via BullMQ workers.
- **Payment Integration** – Razorpay subscription management; webhook handling for subscription events.
- **Authentication & Authorization** – JWT‑based auth; every request derives tenant context from the authenticated user.
- **Observability** – Structured JSON logging with request‑ID correlation, configurable log levels, no sensitive data leakage.
- **Extensible Design** – Modular monolith with clear layer boundaries (API, application services, domain, infrastructure).

## Architecture Overview

The application follows a modular monolith architecture (see `docs/architecture.md`). Responsibilities are separated into layers:

- **API Layer** – Routing, request parsing, authentication, authorization, validation, calling application services, HTTP responses.
- **Application Layer** – Use‑case orchestration (e.g., `TaskService`, `TenantService`, `NotificationService`, `FileService`, `PaymentService`).
- **Domain Layer** – Core entities and business rules (`User`, `Tenant`, `Task`, `Attachment`, `Subscription`).
- **Infrastructure Layer** – External integrations: PostgreSQL (via Prisma), Redis/BullMQ (job queue), Razorpay, Email Provider, File Storage (local or Cloudflare R2).
- **Shared Modules** – Cross‑cutting concerns: logging, error types, validation, tenancy helpers.

**Key architectural decisions**:

- TypeScript + Bun runtime.
- PostgreSQL as primary database; Prisma ORM for type‑safe access.
- BullMQ with Redis for reliable background jobs.
- Razorpay for payment processing.
- Cloudflare R2 for production file storage (local filesystem in development).
- JWT authentication with short‑lived tokens.
- Multi‑tenant isolation enforced at the application level (every query filtered by tenant ID derived from the authenticated user).

## API Contracts

The API is versioned under `/api/v1`. All protected endpoints require a Bearer JWT token in the `Authorization` header. Public endpoints: `/auth/register`, `/auth/login`, `/health`, `/payments/webhook`.

### Authentication
- **POST `/auth/register`** – Create a user and associate with a tenant (requires `tenantId` in body).
- **POST `/auth/login`** – Authenticate user and receive JWT access token.

### Tenant & User Management
- **GET `/tenants`** – Create a tenant (authenticated).
- **GET `/users/me`** – Retrieve current user profile.
- **PATCH `/users/me`** – Update current user profile.
- **GET `/users/me/tenant`** – Get the tenant of the authenticated user.
- **POST `/tenants/:tenantId/users`** – Add a user to the caller’s tenant.

### Task Management
- **GET `/tasks`** – List tasks with pagination, filtering by status and assignee.
- **POST `/tasks`** – Create a task (optional assignee must be in same tenant).
- **GET `/tasks/:taskId`** – Retrieve a specific task.
- **PATCH `/tasks/:taskId`** – Update a task.
- **DELETE `/tasks/:taskId`** – Delete a task.

### File Attachments
- **POST `/tasks/:taskId/attachments`** – Upload a file to a task (multipart/form‑data).
- **GET `/attachments/:attachmentId`** – Get attachment metadata.
- **DELETE `/attachments/:attachmentId`** – Delete an attachment.

### Subscription & Payments
- **GET `/users/me/tenant/subscription`** – Get subscription status for the tenant.
- **POST `/users/me/tenant/subscription`** – Initiate a subscription (create Razorpay order).
- **POST `/payments/webhook`** – Razorpay webhook endpoint (signature verification).

### Health Check
- **GET `/health`** – Liveness probe.

Full request/response schemas and error formats are defined in `docs/api-contracts.md`.

## Data Flow Examples

### 1. Task Creation
1. Client sends `POST /tasks` with JWT and task payload.
2. API layer authenticates, extracts user ID and tenant ID from token.
3. Request validated (title required, assignee if any must belong to same tenant).
4. `TaskService.createTask` called with tenant ID from user context.
5. Service persists task record via Prisma (includes `tenant_id`).
6. If assignee set, a `task.assigned` event is published to BullMQ queue.
7. API returns created task data.

### 2. File Upload
1. Client sends `POST /tasks/:taskId/attachments` with JWT, `taskId` path param, and multipart file.
2. API authenticates, verifies `taskId` belongs to user’s tenant.
3. Request passes to `FileService.uploadFile`.
4. Service validates file size (<10 MB), streams to storage adapter (local or R2).
5. Storage returns a key; service saves attachment metadata (`tenant_id`, `task_id`, `key`, etc.).
6. API returns attachment metadata.

### 3. Notification Background Job
1. Upon task assignment, `TaskService` publishes a job to the `task-notifications` queue (task ID, assignee user ID, task title).
2. Worker process pulls job from BullMQ.
3. Worker invokes `NotificationService.processTaskAssignmentNotification`.
4. Service loads task and assignee user (with tenant checks).
5. Builds email content and sends via `EmailProvider` abstraction (dummy/logger in dev).
6. Success/failure logged; retries handled by BullMQ configuration.

### 4. Payment Webhook
1. Razorpay POSTs to `/payments/webhook` with payload and `X-Razorpay-Signature` header.
2. API route uses `express.raw` to capture exact body for verification.
3. `PaymentService.verifyWebhookSignature` validates signature using webhook secret.
4. Payload parsed; event type extracted (e.g., `subscription.activated`).
5. `SubscriptionService` updates the local subscription record based on event.
6. App returns `200 OK` to acknowledge processing.

## Technology Stack

- **Language**: TypeScript
- **Runtime**: Bun
- **Framework**: Express (compatible with Bun)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Background Jobs**: BullMQ + Redis
- **Payment Provider**: Razorpay
- **File Storage**: Local filesystem (dev) / Cloudflare R2 (prod)
- **Email Provider**: Abstracted (dummy in dev)
- **Authentication**: JSON Web Tokens (jose library)
- **Validation**: Zod
- **Logging**: Custom structured JSON logger with async‑local‑storage request‑ID correlation
- **Environment**: `dotenv` for configuration

## Getting Started

1. Copy `.env.example` to `.env` and fill in required variables (DATABASE_URL, REDIS_URL, JWT_SECRET, etc.).
2. Install dependencies: `bun install`
3. Run migrations: `bunx prisma migrate dev`
4. Start the API: `bun run src/server.ts`
5. For background jobs: `bun run src/worker.ts`
6. API accessible at `http://localhost:8000/api/v1`

## License

This project is proprietary; all rights reserved.

--- 

*This README summarizes the project as implemented up to feature T‑014 (Logging and Monitoring).* 