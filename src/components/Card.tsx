import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Profile } from '../types';

interface CardProps {
  title?: string | React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({ title, icon, children, className = '', noPadding = false }) => {
  const { selectedProfile } = useAuth();

  const getProfileColors = () => {
    switch (selectedProfile) {
      case Profile.CREATOR:
        return { border: 'border-red-600', icon: 'text-red-500' };
      case Profile.ADMIN:
        return { border: 'border-amber-500', icon: 'text-amber-500' };
      case Profile.ALMACEN:
        return { border: 'border-emerald-600', icon: 'text-emerald-500' };
      case Profile.SALES_MANAGER:
        return { border: 'border-purple-600', icon: 'text-purple-500' };
      default: // TEACHER, STUDENT, etc.
        return { border: 'border-indigo-600', icon: 'text-indigo-500' };
    }
  };

  const colors = getProfileColors();
  const borderClass = className.includes('border-t-') ? '' : `border-t-4 ${colors.border}`;

  return (
    <div className={`bg-white dark:bg-gray-800 shadow-lg rounded-lg ${className} ${borderClass}`}>
      <div className={noPadding ? '' : 'p-6'}>
        {title && (
          <div className={`flex items-center mb-4 border-b border-gray-200 dark:border-gray-700 pb-4 ${noPadding ? 'px-6 pt-6' : ''}`}>
            {icon && <div className={`mr-3 ${colors.icon}`}>{icon}</div>}
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 w-full">{title}</h2>
          </div>
        )}
        <div>{children}</div>
      </div>
    </div>
  );
};