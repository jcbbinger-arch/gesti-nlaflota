import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Profile } from '../types';

interface ProtectedRouteProps {
  allowedProfiles: Profile[];
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedProfiles, children }) => {
  const { currentUser, selectedProfile, isAuthReady } = useAuth();

  console.log('ProtectedRoute - isAuthReady:', isAuthReady, 'currentUser:', currentUser?.email, 'selectedProfile:', selectedProfile, 'allowedProfiles:', allowedProfiles);

  if (!isAuthReady) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!currentUser) {
    console.log('ProtectedRoute - No user, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  if (!selectedProfile || !allowedProfiles.includes(selectedProfile)) {
    console.log('ProtectedRoute - Invalid profile or access denied, redirecting to selector');
    return <Navigate to="/select-profile" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};