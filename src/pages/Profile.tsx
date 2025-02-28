import React from 'react';
import { ProfileForm } from '../components/profile/ProfileForm';

export const ProfilePage = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-3xl mx-auto">
        <ProfileForm />
      </div>
    </div>
  );
};