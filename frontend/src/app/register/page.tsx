'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

interface RegisterForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  biometricConsent: boolean;
}

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>({
    defaultValues: {
      biometricConsent: false,
    },
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const password = watch('password');

  const onSubmit = async (data: RegisterForm) => {
    try {
      setIsLoading(true);
      setError('');

      const { confirmPassword, biometricConsent, ...registerData } = data;
      const response = await authAPI.register({
        ...registerData,
        biometricConsentGiven: biometricConsent,
      });

      login(response.data.user, response.data.token);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-orange-600 mb-2">
            OrangePrivacy
          </h1>
          <h2 className="text-2xl font-semibold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-medium text-orange-600 hover:text-orange-500"
            >
              Sign in
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {error && (
            <Alert variant="error" onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                {...register('firstName', {
                  required: 'First name is required',
                })}
                label="First Name"
                placeholder="John"
                error={errors.firstName?.message}
              />
              <Input
                {...register('lastName', {
                  required: 'Last name is required',
                })}
                label="Last Name"
                placeholder="Doe"
                error={errors.lastName?.message}
              />
            </div>

            <Input
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address',
                },
              })}
              type="email"
              label="Email Address"
              placeholder="john.doe@example.com"
              error={errors.email?.message}
            />

            <Input
              {...register('password', {
                required: 'Password is required',
                minLength: {
                  value: 8,
                  message: 'Password must be at least 8 characters',
                },
                pattern: {
                  value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                  message:
                    'Password must contain uppercase, lowercase, and number',
                },
              })}
              type="password"
              label="Password"
              placeholder="••••••••"
              error={errors.password?.message}
              helperText="At least 8 characters with uppercase, lowercase, and number"
            />

            <Input
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: (value) =>
                  value === password || 'Passwords do not match',
              })}
              type="password"
              label="Confirm Password"
              placeholder="••••••••"
              error={errors.confirmPassword?.message}
            />
          </div>

          {/* Biometric Consent Checkbox */}
          <div className="rounded-lg border-2 border-orange-200 bg-orange-50 p-4">
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  {...register('biometricConsent', {
                    required: 'You must give consent to use OrangePrivacy',
                  })}
                  type="checkbox"
                  className="w-4 h-4 text-orange-600 bg-white border-gray-300 rounded focus:ring-orange-500 focus:ring-2"
                />
              </div>
              <div className="ml-3">
                <label className="text-sm font-medium text-gray-900">
                  Biometric Data Processing Consent
                </label>
                <p className="text-sm text-gray-700 mt-1">
                  I consent to OrangePrivacy processing my facial biometric data
                  for the purpose of identifying my photos on the web. I understand
                  that this is required to use the service and I can revoke this
                  consent at any time from my profile settings.
                </p>
                {errors.biometricConsent && (
                  <p className="mt-2 text-sm text-red-600">
                    {errors.biometricConsent.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-start">
            <div className="text-sm text-gray-600">
              By creating an account, you agree to our Terms of Service and
              Privacy Policy. Your data will be processed in accordance with GDPR
              and applicable privacy laws.
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full"
          >
            {isLoading ? 'Creating account...' : 'Create account'}
          </Button>
        </form>
      </div>
    </div>
  );
}
