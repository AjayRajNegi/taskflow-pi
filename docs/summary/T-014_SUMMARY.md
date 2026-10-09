# T-014: Logging and Monitoring Setup – Summary

## Goal
Configure structured logging and basic monitoring for the application to support observability and debugging.

## Implemented Features

### 1. Structured JSON Logging
- Centralized logger (`src/shared/logging/logger.ts`) outputs JSON via `console.log`/`console.error` etc.
- Log levels: `error`, `warn`, `info`, `debug`; configurable via `LOG_LEVEL` env var.
- Each log entry includes `timestamp`, `level`, `message`, and optional metadata:
  - `requestId` (unique per request)
  - `userId` (from authenticated token, if available)
  - `tenantId` (from authenticated token, if available)
  - Any additional meta passed to logger methods.

### 2. Request ID Correlation
- Middleware (`src/app/middleware/requestLogger.ts`) generates a request ID (from `X-Request-ID` header or `crypto.randomUUID()`).
- Attaches ID to request object and sets response header `X-Request-ID`.
- Uses `AsyncLocalStorage` (`src/shared/logging/requestIdStorage.ts`) to propagate request-scoped context (requestId, userId, tenantId) across async call chains.
- Auth middleware stores `userId` and `tenantId` after successful token verification.

### 3. Logging of Key Events
- **Incoming requests**: logged at `info` level (method, path, query, IP, user agent).
- **Outgoing responses**: logged at `info` level (status code, response time).
- **Authentication failures**: logged at `warn` level with email extracted from token (via payload decoding, without verification).
- **Authorization failures**: logged at `warn` level (email included when available).
- **Validation errors**: logged at `info` level.
- **Unexpected errors**: logged at `error` level (including stack trace).
- **Outgoing HTTP requests to external services** (email, payment, storage): logged at `debug` level (metadata only, no secrets).
- **Background job processing**: logs for job waiting, active, completed, failed (queue service) and success/failure of notification processing.
- **Webhook signature verification**: logs success/failure at appropriate levels.

### 4. No Sensitive Data Logging
- Passwords, tokens, API keys, payment details, file contents, etc. are never logged.
- Email provider logs only metadata (to, subject, presence of body) at debug level.
- File storage logs metadata (filename, size, key) but not content.

### 5. Existing Code Updates
- Replaced all `console.log` statements in the codebase with appropriate logger calls (debug/info/warn/error).
- Updated error handlers to log at suitable levels and include request ID.
- Ensured logs are valid JSON and safe for ingestion.

## Files Affected
- Created: `logger.ts`, `requestIdStorage.ts`, `requestLogger.ts`
- Modified: `server.ts`, auth middleware & JWT utils, queue service, notification service, dummy email provider, payment service, local storage, webhook route, worker.

## Compliance with Acceptance Criteria
All acceptance criteria from `docs/tasks/T-014.md` are satisfied:
- Structured JSON format with timestamp, level, message, optional metadata.
- Log level configurable via `LOG_LEVEL`.
- No sensitive data logged.
- Authentication failures logged with email (when available).
- Authorization failures and validation errors logged.
- Outgoing requests to external services logged at debug level.
- Incoming requests logged at info level (method, path, etc.).
- Outgoing responses logged at info level (status, response time).
- Background job processing logged.
- Request ID correlation implemented and included in all related logs.
- Request ID passed to downstream services via async local storage.

## Out of Scope (as per T-014)
- Distributed tracing, advanced metrics, log aggregation, real-time alerting, audit logs beyond basic security events, syslog/journalctl logging.

## Summary
The logging infrastructure now provides consistent, structured, and correlated logs suitable for debugging and monitoring in production while adhering to security and tenant‑isolation requirements.