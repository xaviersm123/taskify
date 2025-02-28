import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useUserStore } from '../../lib/store/user';
import { useAuthStore } from '../../lib/store/auth';
import { Loader2 } from 'lucide-react';

export const UserProfileForm = () => {
  const { user } = useAuthStore();
  const { updateProfile } = useUserStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: ''
  });

  useEffect(() => {
    if (user?.user_metadata) {
      setFormData({
        firstName: user.user_metadata.firstName || '',
        lastName: user.user_metadata.lastName || ''
      });
    }
  }, [user]);

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfile(user.id, {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim()
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="border-b pb-4 mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Profile Settings</h2>
        <p className="text-sm text-gray-500">Manage your account settings and preferences.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">First Name</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">{formData.firstName || 'Not set'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Last Name</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">{formData.lastName || 'Not set'}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <p className="mt-1 text-sm text-gray-900">{user.email}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Account Created</label>
          <p className="mt-1 text-sm text-gray-900">
            {format(new Date(user.created_at), 'MMMM d, yyyy')}
          </p>
        </div>

        <div className="flex justify-end space-x-3">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
            >
              Edit Profile
            </button>
          )}
        </div>
      </form>
    </div>
  );
};