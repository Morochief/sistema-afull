export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code: string = 'UNKNOWN_ERROR'
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string, code: string = 'VALIDATION_ERROR') {
    super(message, 400, code)
    this.name = 'ValidationError'
  }
}

export class AuthError extends AppError {
  constructor(message: string = 'No autenticado', code: string = 'AUTH_REQUIRED') {
    super(message, 401, code)
    this.name = 'AuthError'
  }
}

export class PermissionError extends AppError {
  constructor(message: string = 'Permiso denegado', code: string = 'PERMISSION_DENIED') {
    super(message, 403, code)
    this.name = 'PermissionError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Recurso', code: string = 'NOT_FOUND') {
    super(`${resource} no encontrado`, 404, code)
    this.name = 'NotFoundError'
  }
}

export function formatError(error: unknown) {
  if (error instanceof AppError) {
    return {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode
    }
  }

  if (error instanceof Error) {
    console.error('[UNEXPECTED_ERROR]', error.message)
    return {
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR',
      statusCode: 500
    }
  }

  console.error('[UNKNOWN_ERROR]', error)
  return {
    error: 'Error desconocido',
    code: 'UNKNOWN_ERROR',
    statusCode: 500
  }
}
