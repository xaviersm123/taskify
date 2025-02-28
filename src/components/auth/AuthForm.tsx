import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { LogIn, UserPlus, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../lib/store/auth';
import { AuthFormFields } from './AuthFormFields';
import { AuthError } from './AuthError';
import { getAuthErrorMessage } from '../../lib/utils/auth-errors';

interface AuthFormProps {
  mode: 'signin' | 'signup';
}

interface FormData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export const AuthForm: React.FC<AuthFormProps> = ({ mode }) => {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>();
  const { signIn, signUp } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setAuthError(null);
    
    try {
      if (mode === 'signin') {
        await signIn(data.email, data.password);
      } else {
        await signUp({
          email: data.email,
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName
        });
      }
      reset();
    } catch (error) {
      const errorMessage = getAuthErrorMessage(error);
      setAuthError(errorMessage);
      console.error('Auth error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {mode === 'signin' ? (
              <>
                Don't have an account?{' '}
                <Link to="/signup" className="font-medium text-indigo-600 hover:text-indigo-500">
                  Sign up
                </Link>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <Link to="/signin" className="font-medium text-indigo-600 hover:text-indigo-500">
                  Sign in
                </Link>
              </>
            )}
          </p>
        </div>

        {authError && <AuthError message={authError} />}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <AuthFormFields register={register} errors={errors} mode={mode} />

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                    {mode === 'signin' ? <LogIn className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
                  </span>
                  {mode === 'signin' ? 'Sign in' : 'Sign up'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};