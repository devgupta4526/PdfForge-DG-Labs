/**
 * Application-level error class. Anything thrown that's an instance of
 * `AppError` will be serialized with its `statusCode` + `code` by the
 * global error handler. Anything else becomes a 500.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(params: {
    message: string;
    statusCode?: number;
    code?: string;
    details?: unknown;
    isOperational?: boolean;
  }) {
    super(params.message);
    this.name = 'AppError';
    this.statusCode = params.statusCode ?? 500;
    this.code = params.code ?? 'INTERNAL_ERROR';
    this.details = params.details;
    this.isOperational = params.isOperational ?? true;
    Error.captureStackTrace?.(this, AppError);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details?: unknown) {
    super({ message, statusCode: 404, code: 'NOT_FOUND', details });
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Invalid request', details?: unknown) {
    super({ message, statusCode: 400, code: 'VALIDATION_ERROR', details });
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', details?: unknown) {
    super({ message, statusCode: 401, code: 'UNAUTHORIZED', details });
    this.name = 'UnauthorizedError';
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests', details?: unknown) {
    super({ message, statusCode: 429, code: 'TOO_MANY_REQUESTS', details });
    this.name = 'TooManyRequestsError';
  }
}
