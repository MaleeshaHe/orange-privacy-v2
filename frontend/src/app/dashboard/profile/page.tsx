'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { User, Mail, Shield } from 'lucide-react';

interface ProfileForm {
  firstName: string;
  lastName: string;
  email: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [updating, setUpdating] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors },
    setValue,
  } = useForm<ProfileForm>();

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors },
    reset: resetPassword,
    watch,
  } = useForm<PasswordForm>();

  const newPassword = watch('newPassword');

  useEffect(() => {
    if (user) {
      setValue('firstName', user.firstName || '');
      setValue('lastName', user.lastName || '');
      setValue('email', user.email);
    }
  }, [user, setValue]);

  const onSubmitProfile = async (data: ProfileForm) => {
    try {
      setUpdating(true);
      setError('');
      const response = await authAPI.updateProfile(data);
      updateUser(response.data.user);
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  const onSubmitPassword = async (data: PasswordForm) => {
    try {
      setChangingPassword(true);
      setError('');
      await authAPI.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      setSuccess('Password changed successfully!');
      resetPassword();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleBiometricConsent = async () => {
    try {
      setError('');
      if (user?.biometricConsentGiven) {
        await authAPI.revokeBiometricConsent();
        updateUser({ biometricConsentGiven: false });
        setSuccess('Biometric consent revoked');
      } else {
        await authAPI.giveBiometricConsent();
        updateUser({ biometricConsentGiven: true });
        setSuccess('Biometric consent given');
      }
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update consent');
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
        <p className="mt-2 text-gray-600">Manage your account information</p>
      </div>

      {error && (
        <div className="mb-6">
          <Alert variant="error" onClose={() => setError('')}>
            {error}
          </Alert>
        </div>
      )}

      {success && (
        <div className="mb-6">
          <Alert variant="success" onClose={() => setSuccess('')}>
            {success}
          </Alert>
        </div>
      )}

      <div className="space-y-6">
        {/* Profile Information */}
        <Card>
          <div className="flex items-center mb-6">
            <User className="h-6 w-6 text-orange-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">
              Profile Information
            </h2>
          </div>

          <form onSubmit={handleSubmitProfile(onSubmitProfile)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                {...registerProfile('firstName', {
                  required: 'First name is required',
                })}
                label="First Name"
                error={profileErrors.firstName?.message}
              />
              <Input
                {...registerProfile('lastName', {
                  required: 'Last name is required',
                })}
                label="Last Name"
                error={profileErrors.lastName?.message}
              />
            </div>

            <Input
              {...registerProfile('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address',
                },
              })}
              type="email"
              label="Email Address"
              error={profileErrors.email?.message}
            />

            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                isLoading={updating}
              >
                {updating ? 'Updating...' : 'Update Profile'}
              </Button>
            </div>
          </form>
        </Card>

        {/* Change Password */}
        <Card>
          <div className="flex items-center mb-6">
            <Shield className="h-6 w-6 text-orange-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">
              Change Password
            </h2>
          </div>

          <form onSubmit={handleSubmitPassword(onSubmitPassword)} className="space-y-4">
            <Input
              {...registerPassword('currentPassword', {
                required: 'Current password is required',
              })}
              type="password"
              label="Current Password"
              error={passwordErrors.currentPassword?.message}
            />

            <Input
              {...registerPassword('newPassword', {
                required: 'New password is required',
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
              label="New Password"
              error={passwordErrors.newPassword?.message}
              helperText="At least 8 characters with uppercase, lowercase, and number"
            />

            <Input
              {...registerPassword('confirmPassword', {
                required: 'Please confirm your password',
                validate: (value) =>
                  value === newPassword || 'Passwords do not match',
              })}
              type="password"
              label="Confirm New Password"
              error={passwordErrors.confirmPassword?.message}
            />

            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                isLoading={changingPassword}
              >
                {changingPassword ? 'Changing...' : 'Change Password'}
              </Button>
            </div>
          </form>
        </Card>

        {/* Biometric Consent */}
        <Card>
          <div className="flex items-center mb-6">
            <Mail className="h-6 w-6 text-orange-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">
              Privacy & Consent
            </h2>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-900 mb-1">
                    Biometric Data Processing
                  </h3>
                  <p className="text-sm text-gray-600">
                    By giving consent, you allow OrangePrivacy to process your
                    facial biometric data for the purpose of finding your photos
                    on the web. You can revoke this consent at any time.
                  </p>
                  <div className="mt-3">
                    {user?.biometricConsentGiven ? (
                      <div className="flex items-center text-sm text-green-600">
                        <Shield className="h-4 w-4 mr-1" />
                        Consent given
                      </div>
                    ) : (
                      <div className="text-sm text-yellow-600">
                        Consent not given - features are limited
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                variant={user?.biometricConsentGiven ? 'danger' : 'primary'}
                onClick={handleBiometricConsent}
              >
                {user?.biometricConsentGiven ? 'Revoke Consent' : 'Give Consent'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
