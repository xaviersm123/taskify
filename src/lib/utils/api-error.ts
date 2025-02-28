import { PostgrestError } from '@supabase/supabase-js';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static fromError(error: unknown): ApiError {
    if (error instanceof ApiError) return error;
    
    if (error instanceof Error) {
      return new ApiError(error.message, error);
    }

    // Handle Supabase errors
    if (isPostgrestError(error)) {
      return new ApiError(
        error.message || 'Database operation failed',
        error,
        error.code
      );
    }

    return new ApiError('An unexpected error occurred', error);
  }
}

function isPostgrestError(error: unknown): error is PostgrestError {
  return typeof error === 'object' && error !== null && 'code' in error;
}