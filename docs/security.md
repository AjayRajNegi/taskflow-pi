# Security Model

This document outlines the security model for the TaskFlow API implementation as defined in the current scope.

## Protected Assets

The following assets require protection:
- **Tenant data**: All resources belonging to a tenant (users, tasks, attachments, subscriptions)
- **User credentials**: Passwords (hashed), authentication tokens
- **Payment information**: Subscription status, payment tokens (handled by Razorpay)
- **File attachments**: Uploaded files and their metadata
- **API endpoints**: Unauthorized access to any endpoint
- **Background jobs**: Notification and payment retry jobs
- **Configuration secrets**: API keys, database credentials, signing keys

## Authentication Model

- **Mechanism**: Bearer token (JWT) in the `Authorization` header for all protected endpoints.
- **Token Issuance**: Upon successful login via `/auth/login`, a signed JWT is returned.
- **Token Validation**: 
  - Middleware verifies token signature, expiration, and issuer.
  - Tokens are short-lived (configurable, e.g., 1 hour) with refresh token mechanism (to be detailed).
- **Public Endpoints**: 
  - `/auth/register` (requires tenantId in body)
  - `/auth/login`
  - `/health`
  - `/payments/webhook` (secured by signature verification, not authentication)
- **Password Handling**: 
  - Passwords are hashed using bcrypt (or equivalent strong hashing algorithm) before storage.
  - Minimum password length: 8 characters (enforced at registration/update).
- **Open Questions**:
  - Refresh token flow and storage mechanism.
  - JWT signing key rotation strategy.
  - Whether to implement multi-factor authentication (MFA) in V1.

## Authorization Model

- **Principle**: Authenticated user gains access only to resources within their own tenant.
- **Enforcement**:
  - Every request to a tenant-owned resource must verify that the resource's `tenant_id` matches the authenticated user's `tenant_id`.
  - Authorization checks occur in the API layer (middleware) and/or application services.
  - Never trust client-provided `tenant_id` for authorization; always derive from authenticated user context.
- **Specific Rules**:
  - Users can only read/update/delete their own profile (`/users/me`).
  - Users can only manage tasks, attachments within their tenant.
  - Users can only add other users to their own tenant (if permitted).
  - Subscription management is restricted to the tenant's users (exact roles open question).
- **Open Questions**:
  - Role-based access control (RBAC) within a tenant (e.g., admin vs member).
  - Which users can create tenants and invite others.
  - Permission granularity for subscription/billing operations.

## Tenant-Isolation Model

- **Core Requirement**: Zero cross-tenant data leaks.
- **Mechanisms**:
  - **Data Level**: Every tenant-owned table includes a `tenant_id` foreign key to `tenants.id`.
  - **Query Level**: All database queries must include a `WHERE tenant_id = ?` condition derived from the authenticated user's tenant.
  - **Application Level**: Services enforce tenant matching before returning data.
  - **Defense-in-Depth**: Consider PostgreSQL Row-Level Security (RLS) as an additional layer (open question).
- **Prohibited**:
  - Any direct reference to a `tenant_id` from request parameters for authorization.
  - Queries that filter by `tenant_id` without validating against the current user's tenant.
- **Validation**:
  - When a user attempts to access a resource (task, attachment, etc.), the system must:
    1. Authenticate the user.
    2. Retrieve the user's `tenant_id`.
    3. Fetch the resource and verify its `tenant_id` matches the user's.
    4. If mismatch, return 404 (to avoid leaking existence) or 403 if appropriate.
- **Open Questions**:
  - Implementation of RLS and strategy for setting tenant context per connection.
  - Whether to enforce same-tenant assignment for task assignee via trigger or application logic only.

## Trust Boundaries

- **Client ↔ API**: Untrusted; all input validated.
- **API ↔ Application Services**: Trusted (same process boundary).
- **Application Services ↔ Infrastructure (Prisma, BullMQ, etc.)**: Trusted but with validation where data crosses trust boundaries (e.g., user input passed to queries).
- **Infrastructure ↔ External Systems (Email, Razorpay, Storage)**: Untrusted; validate and sanitize all data exchanged.
- **Background Worker ↔ API**: Trusted (same codebase), but workers only process queued jobs; no direct API access.
- **Database ↔ Application**: Trusted connection, but queries must be parameterized to prevent SQL injection.

## Security-Sensitive Data Flows

1. **User Registration**:
   - Client → `/auth/register` (email, password, tenantId)
   - API validates input, checks tenant existence.
   - Password hashed before storage.
   - User record created with `tenant_id` from request.
   - Response excludes password hash.

2. **Login**:
   - Client → `/auth/login` (email, password)
   - API validates, retrieves user by email, compares password hash.
   - On success, signs JWT with user ID, email, tenant ID, expiry.
   - Returns token and user info (no password).

3. **Task Creation**:
   - Client → `/tasks` (Bearer token, task data)
   - API validates token, extracts user ID and tenant ID.
   - Validates assignee (if provided) belongs to same tenant.
   - Creates task record with `tenant_id` from user context.
   - Publishes task.assigned event if assignee set.

4. **File Upload**:
   - Client → `/tasks/:taskId/attachments` (Bearer token, multipart file)
   - API validates token, verifies task exists and belongs to user's tenant.
   - Validates file size (<10 MB), scans for malicious content (optional).
   - Streams file to storage adapter (local/R2) via FileService.
   - Saves metadata with `tenant_id` from task, `task_id`, storage key.
   - Returns metadata (no raw file data).

5. **Payment Webhook**:
   - External (Razorpay) → `/payments/webhook` (payload, signature header)
   - API verifies signature using webhook secret.
   - Parses event, extracts tenant identifier from payload.
   - Updates subscription record for that tenant (no direct user context).
   - Idempotent processing to handle duplicates.

6. **Background Job (Notification)**:
   - API → BullMQ (job: send email on task assignment)
   - Worker pulls job, retrieves task/user data via services (with tenant checks).
   - Calls Email Provider abstraction with sanitized data.
   - Logs success/failure without exposing email content.

## Input Validation Rules

- **General**: All externally supplied input (body, query, path, headers) must be validated.
- **Validation Layer**: Use Zod schemas at the API route level for:
  - Request bodies (JSON)
  - Query parameters
  - Path parameters (UUID format, etc.)
  - Headers (Authorization format)
- **Specific Rules**:
  - **UUIDs**: All ID parameters must be valid UUID v4.
  - **Strings**: Length limits, no dangerous characters (e.g., SQL/XSS attempts mitigated by output encoding and parameterized queries).
  - **Email**: Valid email format.
  - **Password**: Minimum length 8, optional complexity (not required).
  - **File Size**: `size_bytes <= 10485760` (10 MB) checked before storage.
  - **Status Fields**: Validate against allowed enum values (`todo`, `in_progress`, `done` for tasks; Razorpay-defined for subscriptions).
  - **Assignee ID**: If provided, must be a valid UUID and correspond to a user in the same tenant.
- **Sanitization**: 
  - Output encoding for any user‑generated content returned in JSON (though JSON encoding inherently safe).
  - No HTML/Markdown rendering in API; clients responsible for rendering.
- **Open Questions**:
  - Maximum lengths for free‑text fields (description, filename).
  - Allowed MIME types for attachments (e.g., block executable types).
  - Whether to perform virus scanning on uploads.

## SQL/Database Security Considerations

- **Parameterized Queries**: Prisma ORM automatically uses parameterized queries; no raw SQL unless unavoidable.
- **Least Privilege**: Database user for the application should have only necessary permissions (SELECT, INSERT, UPDATE, DELETE on needed tables; no DROP, ALTER, etc.).
- **Connection Limits**: Configure max connections to prevent exhaustion.
- **Tenant Isolation**: 
  - Every query includes explicit `tenant_id` filter from user context.
  - Consider RLS as defense‑in‑depth (open question).
- **Error Handling**: Database errors are caught and mapped to generic application errors; no internal details exposed.
- **Migration Safety**: 
  - migrations are version‑controlled and tested.
  - Avoid destructive changes in production without backup.
- **Open Questions**:
  - Implementation of RLS and tenant context setting.
  - Database logging (e.g., pgAudit) for access monitoring.

## Secrets Management

- **Storage**: Secrets must be stored in environment variables or a secure secrets manager (e.g., AWS Secrets Manager, HashiCorp Vault) — never in source code.
- **Used Secrets**:
  - `DATABASE_URL` (includes password)
  - `REDIS_URL` (if password‑protected)
  - `JWT_SECRET` (for signing tokens)
  - `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
  - `RAZORPAY_WEBHOOK_SECRET`
  - `EMAIL_PROVIDER_API_KEY` (or equivalent)
  - `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` (for Cloudflare R2)
  - `AUTH_SECRET` (general purpose, e.g., for encryption)
- **Rotation**: 
  - Secrets should be rotatable without downtime (strategy open question).
  - JWT secret rotation may require token invalidation mechanism.
- **Logging**: 
  - Never log secrets or tokens.
  - Mask secrets in configuration dumps (e.g., show only first/last few chars).
- **Open Questions**:
  - Whether to use a dedicated secrets manager in V1.
  - JWT refresh token secret storage and rotation.

## File‑Upload Security

- **Size Limit**: Enforced at API boundary (max 10 MB) and database level (`CHECK` constraint).
- **Metadata**: 
  - File name, MIME type, size, storage key, tenant ID, task ID, upload timestamp.
  - No storage of file content in database.
- **Isolation**: 
  - Files stored in tenant‑specific paths (e.g., `tenants/{tenantId}/tasks/{taskId}/attachments/{uuid}`).
  - Storage keys are opaque and not guessable.
- **Access Control**: 
  - To retrieve file metadata or the file itself, the requester must be authenticated and authorized for the parent task (and thus the tenant).
  - Direct file URLs (if using storage that supports public URLs) must be time‑signed or require authentication via API; otherwise, files must be served through an API endpoint that enforces tenant checks.
- **MIME Type Validation**: 
  - Recommended to restrict to safe types (images, documents, PDF) but open question.
  - At minimum, ensure `Content‑Type` header matches file extension (basic check).
- **Malware Scanning**: Optional; not required for V1 but noted as future consideration.
- **Open Questions**:
  - Allowed MIME types and extension validation.
  - Whether to serve files via a signed URL or through an API proxy.
  - Filename sanitization (remove path traversal sequences).

## Payment/Webhook Security

- **Provider**: Razorpay (as per architecture).
- **API Calls (Outbound)**:
  - Use official Razorpay Node.js SDK.
  - API keys (`key_id`, `key_secret`) stored as secrets.
  - All API calls made server‑side; never expose keys to client.
- **Webhook Inbound (`/payments/webhook`)**:
  - **Signature Verification**: Mandatory; verify `X-Razorpay-Signature` header using webhook secret.
  - **Idempotency**: Track processed webhook IDs (e.g., via `event_id`) to prevent duplicate processing.
  - **Payload Validation**: Validate expected structure before updating subscription.
  - **Tenant Mapping**: Extract tenant identifier from payload (e.g., via `customer_id` metadata stored on subscription) and update the correct tenant's subscription record.
  - **Response**: Return 200 only after successful processing; retry logic on Razorpay side for non‑2xx.
- **Payment Flow**:
  - Subscription creation initiates payment; exact flow (redirect vs SDK) open question.
  - No payment details (cards, etc.) touch our servers; handled entirely by Razorpay.
- **Open Questions**:
  - Exact subscription creation flow (client‑side Razorpay SDK vs server‑side order creation).
  - Webhook event types to handle and required actions.
  - Whether to store additional payment transaction history beyond subscription state.

## Background‑Job Security

- **Job Queue**: BullMQ with Redis.
  - Redis connection protected by network security (if applicable) and authentication (if password‑set via `REDIS_URL`).
  - Jobs contain only necessary data (e.g., task ID, user ID); avoid embedding sensitive payloads.
- **Job Processing**:
  - Workers run in separate processes but same codebase.
  - Before acting on job data, workers must re‑validate authorization via services (e.g., for a notification job, verify the task still exists and belongs to the tenant).
  - Jobs should be idempotent where possible (e.g., sending same email twice is harmless but may be annoying; consider deduplication).
- **Failure Handling**:
  - Failed jobs moved to dead‑letter set after configurable retries.
  - Log failures without exposing job payload content.
  - Monitor queue depth and failure rates.
- **Open Questions**:
  - Retry policy (count, backoff) for notification and payment jobs.
  - Whether to encrypt job payloads (not required if Redis is trusted and internal).

## Rate‑Limiting Requirements

- **Purpose**: Protect against abuse, credential stuffing, resource exhaustion.
- **Enforced At**: API layer (middleware) or infrastructure (API gateway).
- **Target Endpoints** (recommended limits to be tuned):
  - **Auth endpoints** (`/auth/register`, `/auth/login`): 5‑10 requests per minute per IP.
  - **File upload** (`/tasks/:taskId/attachments`): 10‑20 requests per minute per user/IP.
  - **Payment endpoints** (`/users/me/tenant/subscription`): 5 requests per minute per tenant.
  - **General API**: 100‑200 requests per minute per user/IP (adjust based on usage).
- **Algorithm**: Token bucket or fixed window; consider distributed rate limiting if multiple API instances.
- **Headers**: Return `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` (optional).
- **Open Questions**:
  - Exact rate limits for each endpoint.
  - Whether to differentiate limits by authentication status (anon vs authenticated).
  - Use of third‑party services (e.g., Cloudflare) for rate limiting.

## Logging Rules

- **Never Log**:
  - Authentication credentials (plaintext passwords, session tokens).
  - Secrets (API keys, JWT signing keys, webhook secrets).
  - Payment details (card numbers, bank account info).
  - Personal data unnecessarily (e.g., full email content, file contents).
- **Allowed Logging (with caution)**:
  - User IDs, tenant IDs (for audit trails).
  - Error messages (excluding sensitive data).
  - Request IDs / correlation IDs for tracing.
  - File metadata (name, size, MIME type) but not content.
  - Subscription status changes (not payment instrument details).
- **Sensitive Events to Log** (for security monitoring):
  - Authentication failures (invalid credentials, malformed tokens).
  - Authorization failures (access attempts to foreign tenant resources).
  - Cross‑tenant access attempts (logged as security events).
  - Failed webhook signature verifications.
  - File upload violations (size exceed, wrong MIME type).
  - Background job failures.
  - Unexpected errors (stack traces hidden from logs; only error type and message).
- **Log Format**: Structured JSON for easy ingestion.
- **Retention**: Logs retained per policy (e.g., 30 days) and secured against tampering.
- **Open Questions**:
  - Whether to log IP addresses for audit (consider privacy regulations).
  - Level of detail for background job logging (e.g., task IDs).

## Threat Analysis (STRIDE)

| Threat Type | Description | Mitigation |
|-------------|-------------|------------|
| **Spoofing** | Attacker pretends to be a legitimate user or service. | - Strong JWT validation (signature, expiry).<br>- Secure password storage (bcrypt).<br>- Verify webhook signatures.<br>- Mutual TLS for service‑to‑service if needed (open). |
| **Tampering** | Unauthorized modification of data or requests. | - Input validation and sanitization.<br>- Parameterized queries (Prisma).<br>- Idempotent processing for webhooks/jobs.<br>- HTTPS everywhere (enforced by deployment). |
| **Repudiation** | User denies performing an action. | - Audit logs (user ID, tenant ID, action, timestamp).<br>- Immutable logs (append‑only or write‑once storage).<br>- Correlation IDs for request tracing. |
| **Information Disclosure** | Exposure of sensitive data to unauthorized parties. | - Tenant‑isolated queries.<br>- Never leak existence via 404 vs 403 (use 404 for tenant‑mismatch).<br>- Encrypt secrets at rest (environment variables, secrets manager).<br>- Do not return password hashes or tokens in responses.<br>- Secure file storage (private buckets, no public URLs without auth). |
| **Denial of Service** | Service made unavailable to legitimate users. | - Rate limiting on auth and sensitive endpoints.<br>- Request size limits (file upload, payload size).<br>- Queue depth monitoring and worker autoscaling (open).<br>- Database connection limits and query timeouts. |
| **Elevation of Privilege** | User gains higher privileges than intended. | - Strict authorization checks (tenant matching).<br>- Least privilege database credentials.<br>- Role‑based checks within tenant (open).<br>- Regular dependency scanning for vulnerabilities. |

## Security Assumptions

- The deployment environment provides network security (firewalls, private subnets) for internal services (PostgreSQL, Redis).
- Developers follow secure coding practices and undergo basic security training.
- Third‑party providers (Razorpay, email provider, Cloudflare R2) are vetted and maintain their own security standards.
- The JWT secret is kept confidential and rotated periodically.
- The application is kept up‑to‑date with security patches for dependencies.
- Logging and monitoring are in place to detect anomalous behavior.
- Clients using the API are responsible for securing their own tokens and secrets.

## V1 Security Out of Scope

The following security areas are explicitly **not** required for V1 but may be considered in future versions:

- **Multi‑Factor Authentication (MFA)** for user login.
- **Single Sign‑On (SSO)** integration (SAML, OIDC).
- **Advanced encryption** of data at rest beyond provider‑managed storage (e.g., application‑level encryption of sensitive fields).
- **Penetration testing** or third‑party security audits (though basic security testing is expected).
- **Security Information and Event Management (SIEM)** integration.
- **Automated secret scanning** in CI/CD (recommended but not mandated).
- **Hardware Security Modules (HSM)** for key storage.
- **Behavioral analytics** or anomaly detection for user actions.
- **Data loss prevention (DLP)** controls for outbound data.
- **API gateway** features beyond basic rate limiting (e.g., bot management, WAF).
- **Federated identity** for tenants (allowing users to log in via corporate IdP).
- **Consent management** for data processing (beyond basic privacy notices).
- **Encryption of backups** (depends on provider capabilities).


This security model defines the controls and principles to protect the TaskFlow API in its current scope. Implementation must adhere to these guidelines while addressing open questions during development.