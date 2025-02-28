import React from 'react';
import { UseFormRegister, FieldErrors } from 'react-hook-form';

interface FormData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

interface AuthFormFieldsProps {
  register: UseFormRegister<FormData>;
  errors: FieldErrors<FormData>;
  mode: 'signin' | 'signup';
}

export const AuthFormFields: React.FC<AuthFormFieldsProps> = ({ register, errors, mode }) => (
  <div className="space-y-4">
    {mode === 'signup' && (
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
            First name
          </label>
          <input
            {...register('firstName', { 
              required: 'First name is required'
            })}
            type="text"
            className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="John"
          />
          {errors.firstName && (
            <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
          )}
        </div>
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
            Last name
          </label>
          <input
            {...register('lastName', { 
              required: 'Last name is required'
            })}
            type="text"
            className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Doe"
          />
          {errors.lastName && (
            <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
          )}
        </div>
      </div>
    )}

    <div>
      <label htmlFor="email" className="block text-sm font-medium text-gray-700">
        Email address
      </label>
      <input
        {...register('email', { 
          required: 'Email is required',
          pattern: {
            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
            message: 'Invalid email address'
          }
        })}
        type="email"
        className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        placeholder="you@example.com"
      />
      {errors.email && (
        <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
      )}
    </div>

    <div>
      <label htmlFor="password" className="block text-sm font-medium text-gray-700">
        Password
      </label>
      <input
        {...register('password', { 
          required: 'Password is required',
          minLength: {
            value: 6,
            message: 'Password must be at least 6 characters'
          }
        })}
        type="password"
        className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        placeholder="••••••••"
      />
      {errors.password && (
        <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
      )}
    </div>
  </div>
);