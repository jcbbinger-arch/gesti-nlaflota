

import React from 'react';
import { User } from '../types';

interface AvatarProps {
  user: User | null;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ user, className = '' }) => {
  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (!user) {
    return (
      <div className={`flex items-center justify-center rounded-full bg-gray-300 text-gray-600 ${className}`}>
        ?
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {user.avatar ? (
        <img
          src={user.avatar}
          alt={user.name}
          className="w-full h-full rounded-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center rounded-full bg-primary-500 text-white font-bold">
          {getInitials(user.name)}
        </div>
      )}
    </div>
  );
};