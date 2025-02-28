interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  shouldRetry?: (error: unknown) => boolean;
}

const defaultOptions: Required<RetryOptions> = {
  maxAttempts: 3,
  delayMs: 1000,
  shouldRetry: (error) => {
    // Retry on network errors or 5xx server errors
    if (error instanceof Error) {
      return error.message.includes('Failed to fetch') || 
             error.message.includes('NetworkError');
    }
    return false;
  }
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  let lastError: unknown;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === opts.maxAttempts || !opts.shouldRetry(error)) {
        throw error;
      }

      await new Promise(resolve => setTimeout(resolve, opts.delayMs));
    }
  }

  throw lastError;
}