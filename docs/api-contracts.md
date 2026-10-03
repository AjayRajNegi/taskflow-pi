# TaskFlow API Contracts

This document defines the external REST API contracts for the TaskFlow API as implemented in the current slice.

## Overview

- **Base Path**: `/api/v1`
- **Authentication**: Bearer token (JWT) in the `Authorization` header.
- **Tenant Context**: Derived from the authenticated user; all tenant-owned resources are scoped to the user's tenant.
- **Content-Type**: `application/json` for request and response bodies.
- **Error Format**: All errors follow the format:
  ```json
  {
    "error": {
      "code": "ERROR_CODE",
      "message": "Human-readable error message"
    }
  }
  ```
- **Versioning**: API is versioned via the path prefix `/api/v1`.

## Endpoints

### Authentication

#### Register a new user
- **Method**: `POST`
- **Path**: `/auth/register`
- **Authentication**: None (public endpoint)
- **Tenant/Authorization**: 
  - Requires a `tenant_id` in the request body to associate the new user with a tenant.
  - The tenant must exist; the caller does not need to be authenticated.
  - After registration, the user belongs to the specified tenant.
- **Path Parameters**: None
- **Query Parameters**: None
- **Request JSON Schema**:
  ```json
  {
    "email": "string (required, valid email)",
    "password": "string (required, min length 8)",
    "firstName": "string (optional)",
    "lastName": "string (optional)",
    "tenantId": "string (required, UUID) - the tenant to associate the user with"
  }
  ```
- **Response JSON Schema** (201 Created):
  ```json
  {
    "userId": "string (UUID)",
    "email": "string",
    "firstName": "string",
    "lastName": "string",
    "tenantId": "string (UUID)",
    "createdAt": "string (ISO 8601 timestamp)"
  }
  ```
- **Success Status Codes**:
  - `201 Created` - user successfully registered
- **Validation Errors** (400 Bad Request):
  - `code`: `VALIDATION_ERROR`
    - `message`: Details about invalid fields (e.g., "email is required", "password must be at least 8 characters")
  - `code`: `INVALID_TENANT`
    - `message`: "Tenant not found" if tenantId does not exist
  - `code`: `EMAIL_ALREADY_EXISTS`
    - `message`: "A user with this email already exists"
- **Other Error Responses**:
  - `409 Conflict` - if email already exists (as above)
  - `500 Internal Server Error` - unexpected failure
- **Example Request**:
  ```http
  POST /api/v1/auth/register
  Content-Type: application/json

  {
    "email": "alice@example.com",
    "password": "securePassword123",
    "firstName": "Alice",
    "lastName": "Smith",
    "tenantId": "550e8400-e29b-41d4-a716-446655440000"
  }
  ```
- **Example Response** (201):
  ```json
  {
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "email": "alice@example.com",
    "firstName": "Alice",
    "lastName": "Smith",
    "tenantId": "550e8400-e29b-41d4-a716-446655440000",
    "createdAt": "2023-10-01T12:00:00Z"
  }
  ```

#### Login
- **Method**: `POST`
- **Path**: `/auth/login`
- **Authentication**: None (public endpoint)
- **Tenant/Authorization**: None; login validates credentials and returns a token.
- **Path Parameters**: None
- **Query Parameters**: None
- **Request JSON Schema**:
  ```json
  {
    "email": "string (required)",
    "password": "string (required)"
  }
  ```
- **Response JSON Schema** (200 OK):
  ```json
  {
    "accessToken": "string (JWT token)",
    "expiresIn": "number (seconds until expiration)",
    "user": {
      "id": "string (UUID)",
      "email": "string",
      "firstName": "string",
      "lastName": "string",
      "tenantId": "string (UUID)"
    }
  }
  ```
- **Success Status Codes**:
  - `200 OK` - login successful
- **Validation Errors** (400 Bad Request):
  - `code`: `VALIDATION_ERROR`
    - `message`: "email and password are required"
- **Other Error Responses**:
  - `401 Unauthorized` - invalid credentials
    ```json
    { "error": { "code": "INVALID_CREDENTIALS", "message": "Invalid email or password" } }
    ```
  - `500 Internal Server Error` - unexpected failure
- **Example Request**:
  ```http
  POST /api/v1/auth/login
  Content-Type: application/json

  {
    "email": "alice@example.com",
    "password": "securePassword123"
  }
  ```
- **Example Response** (200):
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600,
    "user": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "email": "alice@example.com",
      "firstName": "Alice",
      "lastName": "Smith",
      "tenantId": "550e8400-e29b-41d4-a716-446655440000"
    }
  }
  ```

### Tenant Management

#### Create a tenant
- **Method**: `POST`
- **Path**: `/tenants`
- **Authentication**: Required (Bearer token)
- **Tenant/Authorization**: 
  - The authenticated user must have permission to create tenants (currently, any authenticated user can create a tenant? Typically, tenant creation might be restricted. The docs do not specify. We'll assume any authenticated user can create a tenant and will automatically be associated with it? Actually, tenant creation is likely done by an admin or via invitation. Since not specified, we'll treat as open question.
  - For now, we'll require authentication but not restrict further. The user creating the tenant will not automatically belong to it unless we also add them via another endpoint.
- **Path Parameters**: None
- **Query Parameters**: None
- **Request JSON Schema**:
  ```json
  {
    "name": "string (required, non-empty)"
  }
  ```
- **Response JSON Schema** (201 Created):
  ```json
  {
    "id": "string (UUID)",
    "name": "string",
    "createdAt": "string (ISO 8601 timestamp)",
    "updatedAt": "string (ISO 8601 timestamp)"
  }
  ```
- **Success Status Codes**:
  - `201 Created` - tenant successfully created
- **Validation Errors** (400 Bad Request):
  - `code`: `VALIDATION_ERROR`
    - `message`: "name is required"
- **Other Error Responses**:
  - `401 Unauthorized` - missing or invalid authentication
  - `403 Forbidden` - if the user lacks permission to create tenants (open question)
  - `500 Internal Server Error` - unexpected failure
- **Example Request**:
  ```http
  POST /api/v1/tenants
  Authorization: Bearer <token>
  Content-Type: application/json

  {
    "name": "Acme Corp"
  }
  ```
- **Example Response** (201):
  ```json
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Acme Corp",
    "createdAt": "2023-10-01T12:00:00Z",
    "updatedAt": "2023-10-01T12:00:00Z"
  }
  ```

#### Get current user's tenant
- **Method**: `GET`
- **Path**: `/users/me/tenant`
- **Authentication**: Required
- **Tenant/Authorization**: Returns the tenant of the authenticated user.
- **Path Parameters**: None
- **Query Parameters**: None
- **Request JSON Schema**: None
- **Response JSON Schema** (200 OK):
  ```json
  {
    "id": "string (UUID)",
    "name": "string",
    "createdAt": "string (ISO 8601 timestamp)",
    "updatedAt": "string (ISO 8601 timestamp)"
  }
  ```
- **Success Status Codes**:
  - `200 OK`
- **Validation Errors**: None
- **Other Error Responses**:
  - `401 Unauthorized` - missing or invalid authentication
  - `404 Not Found` - if the user has no tenant (should not happen if data integrity is maintained)
  - `500 Internal Server Error`
- **Example Request**:
  ```http
  GET /api/v1/users/me/tenant
  Authorization: Bearer <token>
  ```
- **Example Response** (200):
  ```json
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Acme Corp",
    "createdAt": "2023-10-01T12:00:00Z",
    "updatedAt": "2023-10-01T12:00:00Z"
  }
  ```

#### Add a user to a tenant
- **Method**: `POST`
- **Path**: `/tenants/:tenantId/users`
- **Authentication**: Required
- **Tenant/Authorization**: 
  - The authenticated user must be a member of the target tenant (or have admin rights? Not specified). We'll require that the authenticated user belongs to the same tenant as the target tenantId (i.e., they can only add users to their own tenant). This is a reasonable assumption for self-service tenant management.
  - The user to be added is identified by userId in request body; that user must exist and not already belong to a tenant? Or can they be moved? We'll assume they can be invited; if they already belong to a tenant, maybe not allowed. Open question.
- **Path Parameters**:
  - `tenantId`: string (UUID) - the tenant to add the user to
- **Query Parameters**: None
- **Request JSON Schema**:
  ```json
  {
    "userId": "string (required, UUID) - the user to add"
  }
  ```
- **Response JSON Schema** (200 OK):
  ```json
  {
    "message": "string (e.g., \"User added to tenant successfully\")"
  }
  ```
- **Success Status Codes**:
  - `200 OK` - user added
- **Validation Errors** (400 Bad Request):
  - `code`: `VALIDATION_ERROR`
    - `message`: "userId is required"
  - `code`: `INVALID_USER`
    - `message`: "User not found"
  - `code`: `USER_ALREADY_IN_TENANT`
    - `message`: "User already belongs to a tenant"
- **Other Error Responses**:
  - `401 Unauthorized` - missing or invalid authentication
  - `403 Forbidden` - if the authenticated user is not a member of the target tenant
  - `404 Not Found` - if tenantId does not exist
  - `500 Internal Server Error`
- **Example Request**:
  ```http
  POST /api/v1/tenants/550e8400-e29b-41d4-a716-446655440000/users
  Authorization: Bearer <token>
  Content-Type: application/json

  {
    "userId": "999e4567-e89b-12d3-a456-426614174000"
  }
  ```
- **Example Response** (200):
  ```json
  {
    "message": "User added to tenant successfully"
  }
  ```

### User Management

#### Get current user's profile
- **Method**: `GET`
- **Path**: `/users/me`
- **Authentication**: Required
- **Tenant/Authorization**: Returns the profile of the authenticated user.
- **Path Parameters**: None
- **Query Parameters**: None
- **Request JSON Schema**: None
- **Response JSON Schema** (200 OK):
  ```json
  {
    "id": "string (UUID)",
    "email": "string",
    "firstName": "string",
    "lastName": "string",
    "isActive": "boolean",
    "createdAt": "string (ISO 8601 timestamp)",
    "updatedAt": "string (ISO 8601 timestamp)",
    "tenantId": "string (UUID)"
  }
  ```
- **Success Status Codes**:
  - `200 OK`
- **Validation Errors**: None
- **Other Error Responses**:
  - `401 Unauthorized` - missing or invalid authentication
  - `500 Internal Server Error`
- **Example Request**:
  ```http
  GET /api/v1/users/me
  Authorization: Bearer <token>
  ```
- **Example Response** (200):
  ```json
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "alice@example.com",
    "firstName": "Alice",
    "lastName": "Smith",
    "isActive": true,
    "createdAt": "2023-10-01T12:00:00Z",
    "updatedAt": "2023-10-01T12:00:00Z",
    "tenantId": "550e8400-e29b-41d4-a716-446655440000"
  }
  ```

#### Update current user's profile
- **Method**: `PATCH`
- **Path**: `/users/me`
- **Authentication**: Required
- **Tenant/Authorization**: Authenticated user can only update their own profile.
- **Path Parameters**: None
- **Query Parameters**: None
- **Request JSON Schema** (partial update):
  ```json
  {
    "firstName": "string (optional)",
    "lastName": "string (optional)"
    // email and password changes may require separate endpoints; not included for simplicity
  }
  ```
- **Response JSON Schema** (200 OK):
  ```json
  {
    "id": "string (UUID)",
    "email": "string",
    "firstName": "string",
    "lastName": "string",
    "isActive": "boolean",
    "createdAt": "string (ISO 8601 timestamp)",
    "updatedAt": "string (ISO 8601 timestamp)",
    "tenantId": "string (UUID)"
  }
  ```
- **Success Status Codes**:
  - `200 OK` - profile updated
- **Validation Errors** (400 Bad Request):
  - `code`: `VALIDATION_ERROR`
    - `message`: "Invalid fields provided"
- **Other Error Responses**:
  - `401 Unauthorized`
  - `500 Internal Server Error`
- **Example Request**:
  ```http
  PATCH /api/v1/users/me
  Authorization: Bearer <token>
  Content-Type: application/json

  {
    "firstName": "Alicia",
    "lastName": "Smith"
  }
  ```
- **Example Response** (200):
  ```json
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "alice@example.com",
    "firstName": "Alicia",
    "lastName": "Smith",
    "isActive": true,
    "createdAt": "2023-10-01T12:00:00Z",
    "updatedAt": "2023-10-01T12:30:00Z",
    "tenantId": "550e8400-e29b-41d4-a716-446655440000"
  }
  ```

### Task Management

#### List tasks (with pagination)
- **Method**: `GET`
- **Path**: `/tasks`
- **Authentication**: Required
- **Tenant/Authorization**: Returns tasks belonging to the authenticated user's tenant.
- **Path Parameters**: None
- **Query Parameters**:
  - `page`: integer (optional, default 1) - page number
  - `limit`: integer (optional, default 10, max 100) - number of tasks per page
  - `status`: string (optional) - filter by status (e.g., 'todo', 'in_progress', 'done')
  - `assigneeId`: string (UUID, optional) - filter by assignee (must be a user in the same tenant)
- **Request JSON Schema**: None
- **Response JSON Schema** (200 OK):
  ```json
  {
    "data": [
      {
        "id": "string (UUID)",
        "title": "string",
        "description": "string",
        "status": "string",
        "assigneeId": "string (UUID) | null",
        "createdAt": "string (ISO 8601 timestamp)",
        "updatedAt": "string (ISO 8601 timestamp)"
      }
    ],
    "pagination": {
      "page": "integer",
      "limit": "integer",
      "totalPages": "integer",
      "totalItems": "integer",
      "hasNextPage": "boolean",
      "hasPreviousPage": "boolean"
    }
  }
  ```
- **Success Status Codes**:
  - `200 OK`
- **Validation Errors** (400 Bad Request):
  - `code`: `VALIDATION_ERROR`
    - `message`: "Invalid query parameters" (e.g., page not positive, limit out of range)
- **Other Error Responses**:
  - `401 Unauthorized`
  - `500 Internal Server Error`
- **Pagination Behavior**: 
  - Page-based pagination. `totalItems` is the total number of tasks matching filters in the tenant.
  - `hasNextPage` true if page < totalPages.
  - `hasPreviousPage` true if page > 1.
- **Example Request**:
  ```http
  GET /api/v1/tasks?page=1&limit=5&status=todo
  Authorization: Bearer <token>
  ```
- **Example Response** (200):
  ```json
  {
    "data": [
      {
        "id": "aaaa1111-bbbb-2222-cccc-33334444dddd",
        "title": "Fix login bug",
        "description": "Users cannot login after password reset",
        "status": "todo",
        "assigneeId": "123e4567-e89b-12d3-a456-426614174000",
        "createdAt": "2023-10-01T09:00:00Z",
        "updatedAt": "2023-10-01T09:00:00Z"
      },
      {
        "id": "bbbb2222-cccc-3333-dddd-44445555eeee",
        "title": "Update documentation",
        "description": "Add API contracts section",
        "status": "in_progress",
        "assigneeId": null,
        "createdAt": "2023-10-01T10:00:00Z",
        "updatedAt": "2023-10-01T10:15:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 5,
      "totalPages": 3,
      "totalItems": 14,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  }
  ```

#### Create a task
- **Method**: `POST`
- **Path**: `/tasks`
- **Authentication**: Required
- **Tenant/Authorization**: The task will belong to the authenticated user's tenant. The user can optionally assign the task to another user in the same tenant (by providing assigneeId). The assigneeId must be a user in the same tenant; otherwise, error.
- **Path Parameters**: None
- **Query Parameters**: None
- **Request JSON Schema**:
  ```json
  {
    "title": "string (required, non-empty)",
    "description": "string (optional)",
    "status": "string (optional, default 'todo'); allowed values: 'todo', 'in_progress', 'done'",
    "assigneeId": "string (UUID, optional) - must be a user in the same tenant"
  }
  ```
- **Response JSON Schema** (201 Created):
  ```json
  {
    "id": "string (UUID)",
    "title": "string",
    "description": "string",
    "status": "string",
    "assigneeId": "string (UUID) | null",
    "createdAt": "string (ISO 8601 timestamp)",
    "updatedAt": "string (ISO 8601 timestamp)"
  }
  ```
- **Success Status Codes**:
  - `201 Created` - task successfully created
- **Validation Errors** (400 Bad Request):
  - `code`: `VALIDATION_ERROR`
    - `message`: "title is required" or "status must be one of: todo, in_progress, done"
  - `code`: `INVALID_ASSIGNEE`
    - `message`: "Assignee not found or not in the same tenant"
- **Other Error Responses**:
  - `401 Unauthorized`
  - `403 Forbidden` - if the user attempts to assign to a user outside their tenant (covered by INVALID_ASSIGNEE)
  - `500 Internal Server Error`
- **Example Request**:
  ```http
  POST /api/v1/tasks
  Authorization: Bearer <token>
  Content-Type: application/json

  {
    "title": "Write unit tests",
    "description": "Create tests for task service",
    "status": "todo",
    "assigneeId": "999e4567-e89b-12d3-a456-426614174000"
  }
  ```
- **Example Response** (201):
  ```json
  {
    "id": "aaaa1111-bbbb-2222-cccc-33334444dddd",
    "title": "Write unit tests",
    "description": "Create tests for task service",
    "status": "todo",
    "assigneeId": "999e4567-e89b-12d3-a456-426614174000",
    "createdAt": "2023-10-01T14:00:00Z",
    "updatedAt": "2023-10-01T14:00:00Z"
  }
  ```

#### Get a specific task
- **Method**: `GET`
- **Path**: `/tasks/:taskId`
- **Authentication**: Required
- **Tenant/Authorization**: The task must belong to the authenticated user's tenant; otherwise, 404 (or 403? We'll return 404 to avoid leaking existence).
- **Path Parameters**:
  - `taskId`: string (UUID) - the task to retrieve
- **Query Parameters**: None
- **Request JSON Schema**: None
- **Response JSON Schema** (200 OK):
  ```json
  {
    "id": "string (UUID)",
    "title": "string",
    "description": "string",
    "status": "string",
    "assigneeId": "string (UUID) | null",
    "createdAt": "string (ISO 8601 timestamp)",
    "updatedAt": "string (ISO 8601 timestamp)"
  }
  ```
- **Success Status Codes**:
  - `200 OK`
- **Validation Errors** (400 Bad Request):
  - `code`: `VALIDATION_ERROR`
    - `message`: "Invalid taskId format"
- **Other Error Responses**:
  - `401 Unauthorized`
  - `404 Not Found` - if task not found or not accessible (tenant mismatch)
  - `500 Internal Server Error`
- **Example Request**:
  ```http
  GET /api/v1/tasks/aaaa1111-bbbb-2222-cccc-33334444dddd
  Authorization: Bearer <token>
  ```
- **Example Response** (200):
  ```json
  {
    "id": "aaaa1111-bbbb-2222-cccc-33334444dddd",
    "title": "Write unit tests",
    "description": "Create tests for task service",
    "status": "todo",
    "assigneeId": "999e4567-e89b-12d3-a456-426614174000",
    "createdAt": "2023-10-01T14:00:00Z",
    "updatedAt": "2023-10-01T14:00:00Z"
  }
  ```

#### Update a task
- **Method**: `PATCH`
- **Path**: `/tasks/:taskId`
- **Authentication**: Required
- **Tenant/Authorization**: The task must belong to the authenticated user's tenant. Fields that can be updated: title, description, status, assigneeId. AssigneeId must be a user in the same tenant (or null to unassign).
- **Path Parameters**:
  - `taskId`: string (UUID)
- **Query Parameters**: None
- **Request JSON Schema** (partial update):
  ```json
  {
    "title": "string (optional)",
    "description": "string (optional)",
    "status": "string (optional, allowed values: todo, in_progress, done)",
    "assigneeId": "string (UUID) | null (optional)"
  }
  ```
- **Response JSON Schema** (200 OK):
  ```json
  {
    "id": "string (UUID)",
    "title": "string",
    "description": "string",
    "status": "string",
    "assigneeId": "string (UUID) | null",
    "createdAt": "string (ISO 8601 timestamp)",
    "updatedAt": "string (ISO 8601 timestamp)"
  }
  ```
- **Success Status Codes**:
  - `200 OK` - task updated
- **Validation Errors** (400 Bad Request):
  - `code`: `VALIDATION_ERROR`
    - `message`: "Invalid fields provided" or "status must be one of: todo, in_progress, done"
  - `code`: `INVALID_ASSIGNEE`
    - `message`: "Assignee not found or not in the same tenant"
- **Other Error Responses**:
  - `401 Unauthorized`
  - `404 Not Found` - task not found or not accessible
  - `500 Internal Server Error`
- **Example Request**:
  ```http
  PATCH /api/v1/tasks/aaaa1111-bbbb-2222-cccc-33334444dddd
  Authorization: Bearer <token>
  Content-Type: application/json

  {
    "status": "in_progress",
    "assigneeId": null
  }
  ```
- **Example Response** (200):
  ```json
  {
    "id": "aaaa1111-bbbb-2222-cccc-33334444dddd",
    "title": "Write unit tests",
    "description": "Create tests for task service",
    "status": "in_progress",
    "assigneeId": null,
    "createdAt": "2023-10-01T14:00:00Z",
    "updatedAt": "2023-10-01T14:30:00Z"
  }
  ```

#### Delete a task
- **Method**: `DELETE`
- **Path**: `/tasks/:taskId`
- **Authentication**: Required
- **Tenant/Authorization**: The task must belong to the authenticated user's tenant.
- **Path Parameters**:
  - `taskId`: string (UUID)
- **Query Parameters**: None
- **Request JSON Schema**: None
- **Response JSON Schema** (204 No Content): No response body.
- **Success Status Codes**:
  - `204 No Content` - task deleted
- **Validation Errors** (400 Bad Request):
  - `code`: `VALIDATION_ERROR`
    - `message`: "Invalid taskId format"
- **Other Error Responses**:
  - `401 Unauthorized`
  - `404 Not Found` - task not found or not accessible
  - `500 Internal Server Error`
- **Example Request**:
  ```http
  DELETE /api/v1/tasks/aaaa1111-bbbb-2222-cccc-33334444dddd
  Authorization: Bearer <token>
  ```
- **Example Response** (204):
  (No body)

### File Attachments

#### Upload a file attachment to a task
- **Method**: `POST`
- **Path**: `/tasks/:taskId/attachments`
- **Authentication**: Required
- **Tenant/Authorization**: 
  - The task must belong to the authenticated user's tenant.
  - The file will be associated with that task and inherit the tenantId from the task.
  - File size limit: 10 MB (enforced by API and database).
  - Allowed MIME types: not specified; we'll accept any but recommend safe types. Open question.
- **Path Parameters**:
  - `taskId`: string (UUID) - the task to attach the file to
- **Query Parameters**: None
- **Request JSON Schema**: 
  - This endpoint expects a `multipart/form-data` request with a file field named `file`.
  - For simplicity in documenting JSON contract, we'll note that the request is multipart; however, we can also define a JSON schema for metadata if needed. We'll describe the multipart format.
- **Request Format**:
  - `file`: the file to upload (required)
  - Optional metadata fields could be sent as form fields, but we'll keep it simple: just the file.
    (Alternatively, the service may extract filename and mime-type from the uploaded file.)
- **Response JSON Schema** (201 Created):
  ```json
  {
    "id": "string (UUID)",
    "filename": "string",
    "mimeType": "string",
    "sizeBytes": "integer",
    "storageKey": "string",
    "uploadedAt": "string (ISO 8601 timestamp)",
    "taskId": "string (UUID)"
  }
  ```
- **Success Status Codes**:
  - `201 Created` - file uploaded successfully
- **Validation Errors** (400 Bad Request):
  - `code`: `VALIDATION_ERROR`
    - `message`: "file is required" or "file size exceeds 10 MB limit"
  - `code`: `INVALID_TASK`
    - `message`: "Task not found or not accessible"
- **Other Error Responses**:
  - `401 Unauthorized`
  - `403 Forbidden` - if user not authorized for the task
  - `415 Unsupported Media Type` - if request is not multipart/form-data
  - `500 Internal Server Error`
- **Example Request** (multipart/form-data):
  ```http
  POST /api/v1/tasks/aaaa1111-bbbb-2222-cccc-33334444dddd/attachments
  Authorization: Bearer <token>
  Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW

  ------WebKitFormBoundary7MA4YWxkTrZu0gW
  Content-Disposition: form-data; name="file"; filename="design.png"
  Content-Type: image/png

  <file binary data>
  ------WebKitFormBoundary7MA4YWxkTrZu0gW--
  ```
- **Example Response** (201):
  ```json
  {
    "id": "cdef1234-abcd-5678-ef90-1234567890ab",
    "filename": "design.png",
    "mimeType": "image/png",
    "sizeBytes": 245678,
    "storageKey": "tenants/550e8400-e29b-41d4-a716-446655440000/tasks/aaaa1111-bbbb-2222-cccc-33334444dddd/attachments/cdef1234-abcd-5678-ef90-1234567890ab",
    "uploadedAt": "2023-10-01T15:00:00Z",
    "taskId": "aaaa1111-bbbb-2222-cccc-33334444dddd"
  }
  ```

#### Get attachment metadata
- **Method**: `GET`
- **Path**: `/attachments/:attachmentId`
- **Authentication**: Required
- **Tenant/Authorization**: The attachment must belong to the authenticated user's tenant (via its task).
- **Path Parameters**:
  - `attachmentId`: string (UUID)
- **Query Parameters**: None
- **Request JSON Schema**: None
- **Response JSON Schema** (200 OK):
  ```json
  {
    "id": "string (UUID)",
    "filename": "string",
    "mimeType": "string",
    "sizeBytes": "integer",
    "storageKey": "string",
    "uploadedAt": "string (ISO 8601 timestamp)",
    "taskId": "string (UUID)"
  }
  ```
- **Success Status Codes**:
  - `200 OK`
- **Validation Errors** (400 Bad Request):
  - `code`: `VALIDATION_ERROR`
    - `message`: "Invalid attachmentId format"
- **Other Error Responses**:
  - `401 Unauthorized`
  - `404 Not Found` - attachment not found or not accessible
  - `500 Internal Server Error`
- **Example Request**:
  ```http
  GET /api/v1/attachments/cdef1234-abcd-5678-ef90-1234567890ab
  Authorization: Bearer <token>
  ```
- **Example Response** (200):
  ```json
  {
    "id": "cdef1234-abcd-5678-ef90-1234567890ab",
    "filename": "design.png",
    "mimeType": "image/png",
    "sizeBytes": 245678,
    "storageKey": "tenants/550e8400-e29b-41d4-a716-446655440000/tasks/aaaa1111-bbbb-2222-cccc-33334444dddd/attachments/cdef1234-abcd-5678-ef90-1234567890ab",
    "uploadedAt": "2023-10-01T15:00:00Z",
    "taskId": "aaaa1111-bbbb-2222-cccc-33334444dddd"
  }
  ```

#### Delete an attachment
- **Method**: `DELETE`
- **Path**: `/attachments/:attachmentId`
- **Authentication**: Required
- **Tenant/Authorization**: The attachment must belong to the authenticated user's tenant.
- **Path Parameters**:
  - `attachmentId`: string (UUID)
- **Query Parameters**: None
- **Request JSON Schema**: None
- **Response JSON Schema** (204 No Content): No response body.
- **Success Status Codes**:
  - `204 No Content` - attachment deleted
- **Validation Errors** (400 Bad Request):
  - `code`: `VALIDATION_ERROR`
    - `message`: "Invalid attachmentId format"
- **Other Error Responses**:
  - `401 Unauthorized`
  - `404 Not Found` - attachment not found or not accessible
  - `500 Internal Server Error`
- **Example Request**:
  ```http
  DELETE /api/v1/attachments/cdef1234-abcd-5678-ef90-1234567890ab
  Authorization: Bearer <token>
  ```
- **Example Response** (204):
  (No body)

### Subscription / Payment Management

#### Get subscription status for the tenant
- **Method**: `GET`
- **Path**: `/users/me/tenant/subscription`
- **Authentication**: Required
- **Tenant/Authorization**: Returns the subscription status of the authenticated user's tenant.
- **Path Parameters**: None
- **Query Parameters**: None
- **Request JSON Schema**: None
- **Response JSON Schema** (200 OK):
  ```json
  {
    "id": "string (UUID)",
    "status": "string (e.g., 'active', 'trialing', 'past_due', 'canceled')",
    "planId": "string | null",
    "currentPeriodEnd": "string (ISO 8601 timestamp) | null",
    "createdAt": "string (ISO 8601 timestamp)",
    "updatedAt": "string (ISO 8601 timestamp)"
  }
  ```
- **Success Status Codes**:
  - `200 OK`
- **Validation Errors**: None
- **Other Error Responses**:
  - `401 Unauthorized`
  - `404 Not Found` - if no subscription exists for the tenant (maybe they are on free tier)
  - `500 Internal Server Error`
- **Example Request**:
  ```http
  GET /api/v1/users/me/tenant/subscription
  Authorization: Bearer <token>
  ```
- **Example Response** (200):
  ```json
  {
    "id": "sub123",
    "status": "active",
    "planId": "pro_monthly",
    "currentPeriodEnd": "2023-11-01T00:00:00Z",
    "createdAt": "2023-10-01T12:00:00Z",
    "updatedAt": "2023-10-01T12:00:00Z"
  }
  ```

#### Create a subscription (initiate payment)
- **Method**: `POST`
- **Path**: `/users/me/tenant/subscription`
- **Authentication**: Required
- **Tenant/Authorization**: Initiates a subscription for the authenticated user's tenant. The user must be authorized to manage billing for the tenant (open question: any member? or admin?). We'll assume any member can initiate.
- **Path Parameters**: None
- **Query Parameters**: None
- **Request JSON Schema**:
  ```json
  {
    "planId": "string (required) - identifier of the subscription plan",
    "paymentMethodId": "string (optional) - if not provided, may require redirect to payment portal"
  }
  ```
- **Response JSON Schema** (201 Created):
  ```json
  {
    "subscriptionId": "string (UUID)",
    "status": "string",
    "clientSecret": "string | null - if redirect needed for payment confirmation"
    // Additional fields as needed for payment flow
  }
  ```
- **Success Status Codes**:
  - `201 Created` - subscription created
- **Validation Errors** (400 Bad Request):
  - `code`: `VALIDATION_ERROR`
    - `message`: "planId is required"
- **Other Error Responses**:
  - `401 Unauthorized`
  - `402 Payment Required` - if payment fails (maybe)
  - `500 Internal Server Error`
  - `503 Service Unavailable` - if payment provider is unavailable
- **Example Request**:
  ```http
  POST /api/v1/users/me/tenant/subscription
  Authorization: Bearer <token>
  Content-Type: application/json

  {
    "planId": "pro_monthly",
    "paymentMethodId": "pm_123"
  }
  ```
- **Example Response** (201):
  ```json
  {
    "subscriptionId": "sub123",
    "status": "active",
    "clientSecret": null
  }
  ```

#### Webhook endpoint for payment provider (Razorpay)
- **Method**: `POST`
- **Path**: `/payments/webhook`
- **Authentication**: None (public endpoint; secured by signature verification)
- **Tenant/Authorization**: None; the webhook payload contains tenant information to identify the affected tenant.
- **Path Parameters**: None
- **Query Parameters**: None
- **Request JSON Schema**: 
  - The payload is specific to Razorpay; we'll describe the expected top-level structure.
  ```json
  {
    "event": "string (e.g., 'payment.captured', 'subscription.activated')",
    "payload": {
      // nested data
    }
  }
  ```
- **Response JSON Schema** (200 OK):
  ```json
  {
    "status": "string (e.g., 'processed')"
  }
  ```
- **Success Status Codes**:
  - `200 OK` - webhook processed successfully
- **Validation Errors** (400 Bad Request):
  - `code`: `INVALID_PAYLOAD`
    - `message`: "Invalid webhook payload"
  - `code`: `INVALID_SIGNATURE`
    - `message`: "Invalid webhook signature"
- **Other Error Responses**:
  - `401 Unauthorized` - if we decide to require auth (but we won't)
  - `500 Internal Server Error`
- **Example Request**:
  ```http
  POST /api/v1/payments/webhook
  Content-Type: application/json
  X-Razorpay-Signature: <signature>

  {
    "event": "subscription.activated",
    "payload": {
      "subscription": {
        "id": "sub123",
        "plan_id": "pro_monthly",
        "status": "active",
        "customer_id": "cus_123",
        "current_period_end": 1698796800
      }
    }
  }
  ```
- **Example Response** (200):
  ```json
  {
    "status": "processed"
  }
  ```

### Health Check

#### Get API health
- **Method**: `GET`
- **Path**: `/health`
- **Authentication**: None
- **Tenant/Authorization**: None
- **Path Parameters**: None
- **Query Parameters**: None
- **Request JSON Schema**: None
- **Response JSON Schema** (200 OK):
  ```json
  {
    "status": "string (e.g., 'ok')",
    "timestamp": "string (ISO 8601 timestamp)",
    "version": "string (e.g., '1.0.0')"
  }
  ```
- **Success Status Codes**:
  - `200 OK`
- **Validation Errors**: None
- **Other Error Responses**:
  - `503 Service Unavailable` - if critical dependencies are down (e.g., database)
- **Example Request**:
  ```http
  GET /api/v1/health
  ```
- **Example Response** (200):
  ```json
  {
    "status": "ok",
    "timestamp": "2023-10-01T12:00:00Z",
    "version": "1.0.0"
  }
  ```

## Open Questions

The following items are identified as open questions where the requirements, architecture, or data model do not specify behavior. These should be clarified during implementation.

1. **Tenant Creation Permissions**: Who is allowed to create tenants? Is it open to any authenticated user, or restricted to certain roles?
2. **Adding Users to Tenant**: Can a user be added to a tenant if they already belong to another tenant? Should users be allowed to belong to multiple tenants? The data model assumes a user belongs to exactly one tenant (foreign key). The requirement says "Users must belong to a tenant." It does not specify exclusivity. However, the users table has a tenant_id foreign key, implying one tenant per user. We'll assume single tenancy for users, but need to confirm.
3. **File Attachment MIME Type Restrictions**: Are there any restrictions on allowed MIME types for attachments (e.g., prevent executable files)?
4. **Subscription Management Permissions**: Which users are allowed to initiate subscriptions or manage billing for a tenant?
5. **Payment Flow Details**: The exact flow for creating a subscription (e.g., redirect to payment gateway, use of payment methods) is not detailed. Should the API return a redirect URL or require client-side integration with Razorpay SDK?
6. **Task Status Values**: Are the task status values fixed to 'todo', 'in_progress', 'done', or can they be customized per tenant?
7. **Notification API**: Should there be an API endpoint to manually trigger notifications or fetch notification status? The requirements only mention background notifications for task assignment.
8. **Pagination Alternatives**: Should we consider cursor-based pagination instead of page-based for better performance on large datasets?
9. **Soft Deletes**: Should we implement soft deletes for tasks, attachments, etc., instead of hard deletes?
10. **Rate Limiting**: What are the rate limits for various endpoints (e.g., auth, file upload)?
11. **Email Uniqueness**: Should email be unique globally or per tenant? (See data-model.md open question)
12. **Assignee Tenant Consistency**: Should the database enforce that a task's assignee belongs to the same tenant as the task? (See data-model.md open question)
13. **Status Fields as ENUM**: Should we use PostgreSQL ENUM types for status fields? (See data-model.md open question)
14. **Row-Level Security**: Should RLS be implemented as an additional layer? (See data-model.md open question)
15. **Additional Task Fields**: Are title, description, status, assignee the complete set of task fields required? (See data-model.md open question)
