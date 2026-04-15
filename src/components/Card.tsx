import React from 'react';

interface CardProps {
  title?: string | React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ title, icon, children, className = '' }) => {
  const borderClass = className.includes('border-t-') ? '' : 'border-t-4 border-primary-500';
  return (
    <div className={`bg-white dark:bg-gray-800 shadow-lg rounded-lg ${className} ${borderClass}`}>
      <div className="p-6">
        {title && (
          <div className="flex items-center mb-4 border-b border-gray-200 dark:border-gray-700 pb-4">
            {icon && <div className="mr-3 text-primary-500">{icon}</div>}
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 w-full">{title}</h2>
          </div>
        )}
        <div>{children}</div>
      </div>
    </div>
  );
};