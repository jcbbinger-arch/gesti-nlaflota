import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { WarningIcon } from './icons';

export const ImpersonationBanner: React.FC = () => {
  const { isImpersonating, currentUser, stopImpersonating } = useAuth();

  if (!isImpersonating) {
    return null;
  }

  return (
    <div className="bg-yellow-400 text-yellow-900 px-4 py-2 fixed top-0 left-0 right-0 z-50 flex items-center justify-center shadow-lg">
      <WarningIcon className="w-5 h-5 mr-3" />
      <span className="font-semibold">
        Estás suplantando a <span className="font-bold">{currentUser?.name}</span>.
      </span>
      <button
        onClick={stopImpersonating}
        className="ml-4 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-1 px-3 rounded-md transition-colors duration-200"
      >
        Volver a mi sesión
      </button>
    </div>
  );
};