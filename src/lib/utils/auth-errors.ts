export const getAuthErrorMessage = (error: any): string => {
  if (!error) return 'An error occurred. Please try again.';

  // Handle network errors
  if (error.name === 'AuthRetryableFetchError') {
    return 'Unable to connect to the authentication service. Please check your internet connection and try again.';
  }

  // Handle specific error messages
  const message = error.message?.toLowerCase() || '';
  
  if (message.includes('invalid login credentials')) {
    return 'Invalid email or password. Please try again.';
  }
  
  if (message.includes('user already registered')) {
    return 'This email is already registered. Please sign in instead.';
  }
  
  if (message.includes('password')) {
    return 'Password must be at least 6 characters long.';
  }

  if (message.includes('email')) {
    return 'Please enter a valid email address.';
  }

  // Log unknown errors for debugging
  console.error('Unhandled auth error:', error);
  return 'An unexpected error occurred. Please try again.';
};