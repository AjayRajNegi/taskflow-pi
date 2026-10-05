export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, "VALIDATION_ERROR", 400, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication failed") {
    super(message, "AUTHENTICATION_ERROR", 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = "Access denied") {
    super(message, "AUTHORIZATION_ERROR", 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, "NOT_FOUND", 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = "Resource conflict") {
    super(message, "CONFLICT_ERROR", 409);
  }
}

export class ExternalServiceError extends AppError {
  constructor(message: string = "External service error") {
    super(message, "EXTERNAL_SERVICE_ERROR", 502);
  }
}

export class InternalError extends AppError {
  constructor(message: string = "Internal server error") {
    super(message, "INTERNAL_ERROR", 500);
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}