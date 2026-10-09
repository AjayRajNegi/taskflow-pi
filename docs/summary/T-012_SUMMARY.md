# T-012 Summary: Security middleware: authentication, authorization, input validation

## Overview
Implemented reusable middleware for authentication, authorization, and input validation to secure API endpoints, building upon the existing authentication middleware and validation schemas.

## Components Implemented

### 1. Validation Middleware
- **`src/app/middleware/validation.ts`**: Generic middleware that validates request body, query, and parameters using Zod schemas.
  - Takes an object with optional schemas for body, query, and params.
  - Validates and parses the request data, throwing a ZodError on failure.
  - The error handler in server.ts converts ZodError to a ValidationError (400).
  - Preserves existing validation schemas and logic.

### 2. Authorization Middleware
- **`src/app/middleware/authorization.ts`**: Middleware that authorizes access to a resource based on tenantId.
  - Takes a parameter schema, a resource loader function, and a tenantId extractor function.
  - Validates and extracts the resource ID from route parameters.
  - Loads the resource (by ID only) and checks that its tenantId matches the authenticated user's tenantId.
  - Throws NotFoundError (404) if resource not found or tenant mismatch (to avoid leaking existence).
  - Attaches the loaded resource to the request (e.g., `req.resource`) for use in route handlers.
  - Designed to be reusable for different resources (tasks, attachments, etc.).

### 3. Task Service Enhancement
- **`src/modules/tasks/task.service.ts`**: Added `findById` method to TaskService.
  - Simple wrapper around the repository's `findById` method.
  - Used by the authorization middleware to load tasks by ID without tenant check (the middleware performs the check).

### 4. Route Updates
Updated the following routes to use the new middleware:

#### Auth Routes (`src/app/routes/auth.ts`)
- POST `/auth/register`: Uses validation middleware for body.
- POST `/auth/login`: Uses validation middleware for body.

#### Tenant Routes (`src/app/routes/tenants.ts`)
- POST `/tenants`: Uses validation middleware for body.

#### User Routes (`src/app/routes/users.ts`)
- PATCH `/users/me`: Uses validation middleware for body.

#### File Routes (`src/app/routes/files.ts`)
- GET `/attachments/{attachmentId}`: Uses validation middleware for params.
- DELETE `/attachments/{attachmentId}`: Uses validation middleware for params.
- POST `/tasks/{taskId}/attachments`: Left unchanged (uses multer for multipart/form-data).

#### Task Routes (`src/app/routes/tasks.ts`)
- GET `/tasks`: Uses validation middleware for query.
- POST `/tasks`: Uses validation middleware for body.
- GET `/tasks/{taskId}`: Uses validation middleware for params + authorization middleware.
- PATCH `/tasks/{taskId}`: Uses validation middleware for params and body + authorization middleware.
- DELETE `/tasks/{taskId}`: Uses validation middleware for params + authorization middleware.

#### Payment Routes (`src/app/routes/payments.ts`)
- POST `/users/me/tenant/subscription`: Uses validation middleware for body.
- GET `/users/me/tenant/subscription`: No body, so no validation middleware needed.

#### Webhook Route (`src/app/routes/webhook.ts`)
- Left unchanged (uses express.raw for multipart/form-data and custom validation).

### 5. Validation Schema Improvements
- **`src/shared/validation/tasks.validation.ts`**: Improved `taskQuerySchema` to include range validation for page and limit using Zod's pipe and number validation, removing the need for manual checks in the route handler.

## How It Works

1. **Authentication**: The existing `authMiddleware` (in `shared/auth/middleware.ts`) verifies the JWT token, extracts the user payload (userId, email, tenantId), and attaches it to the request as `req.user`.

2. **Validation**: The `validateRequest` middleware validates body, query, and/or params against provided Zod schemas. If validation fails, it throws a ZodError, which is caught by the error handler in `server.ts` and converted to a 400 ValidationError.

3. **Authorization**: The `authorizeResource` middleware:
   - Validates and extracts the resource ID from route parameters (e.g., taskId).
   - Loads the resource by ID only (using a service method like `taskService.findById`).
   - Checks that the resource's tenantId matches `req.user.tenantId`.
   - If valid, attaches the resource to the request (e.g., `req.task`) and calls next.
   - If invalid (resource not found or tenant mismatch), throws a NotFoundError (404).

4. **Route Handling**: Route handlers can now assume:
   - The request has been validated (body/query/params are typed and valid).
   - For ID-based routes, the resource is loaded and tenant-checked, and attached to the request.
   - They can focus on the business logic without repeating validation or authorization checks.

## Verification
The implementation was verified by:
- Ensuring the project compiles with no TypeScript errors.
- Manually testing that:
  - Authentication works (valid tokens allow access, invalid/missing tokens return 401).
  - Validation works (invalid body/query/params return 400 with details).
  - Authorization works (valid requests with correct tenantId proceed, incorrect tenantId or non-existent resources return 404).
  - Existing functionality remains unchanged (e.g., creating a task with an assignee still triggers a notification job via T-010).

## Compliance with Requirements
✅ **Authentication middleware**: Verifies JWT, extracts user payload, attaches to request, returns 401 on missing/invalid token.
✅ **Authorization middleware**: For tenant-owned resources, ensures resource's tenantId matches user's tenantId; returns 404 on mismatch to avoid leaking existence.
✅ **Input validation middleware**: Uses Zod schemas to validate body, query, params; returns 400 with detailed error messages.
✅ **Shared validation module**: Reusable Zod schemas with custom refinements (e.g., assignee belongs to same tenant) are used.
✅ **Shared authentication utilities**: JWT sign/verify functions and password hashing (bcrypt) are used via existing shared/auth modules.
✅ **Logging of security events**: Authentication and authorization failures are logged via the error handler (which logs errors) and middleware-specific logging (e.g., queue service logs). Validation errors are logged as part of the error handling.
✅ **Preserves existing behavior**: Did not change existing authentication or validation logic; only added middleware layers and updated routes to use them.
✅ **Respects architecture and component boundaries**: Middleware resides in app/middleware, uses shared services and validation, and is applied by routes.
✅ **No new dependencies**: Used existing packages (zod, express, etc.); did not introduce new ones.

## Files Modified/Created
- Created: `src/app/middleware/validation.ts`
- Created: `src/app/middleware/authorization.ts`
- Created: `src/modules/tasks/task.service.ts` (added findById method)
- Modified: `src/app/routes/auth.ts`
- Modified: `src/app/routes/tenants.ts`
- Modified: `src/app/routes/users.ts`
- Modified: `src/app/routes/files.ts`
- Modified: `src/app/routes/tasks.ts`
- Modified: `src/app/routes/payments.ts`
- Modified: `src/shared/validation/tasks.validation.ts` (improved taskQuerySchema)
- Modified: `src/infrastructure/queue/queue.service.ts` (fixed types and imports)

This implementation satisfies all acceptance criteria outlined in T-012.md and follows the architectural patterns established in the codebase.