import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ChevronDownIcon, LogoutIcon, ProfileIcon } from './icons';
import { Link } from 'react-router-dom';
import { Avatar } from './Avatar';
import { getProfileDisplayName, Profile } from '../types';
import { useCompany } from '../contexts/CompanyContext';

const getCurrentAcademicYear = () => {
    return `Curso 2025/26`;
};


export const Header: React.FC = () => {
  const { currentUser, selectedProfile, logout, selectProfile } = useAuth();
  const { companyInfo } = useCompany();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const academicYear = getCurrentAcademicYear();

  if (!currentUser) return null;

  return (
    <header className="bg-white dark:bg-gray-800 shadow-md h-16 flex items-center justify-between px-6">
      <div className="flex items-center space-x-4">
          {/* Network Status Dot */}
          <div className="flex items-center px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 space-x-2 border dark:border-gray-600 group relative cursor-help">
            <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${isOnline ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`} />
            <span className={`text-[10px] uppercase font-bold hidden sm:block ${isOnline ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                {isOnline ? 'Online' : 'Offline'}
            </span>
            {/* Tooltip */}
            <div className="absolute top-full mt-2 left-0 w-48 p-2 bg-gray-800 text-white text-[10px] rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                {isOnline 
                  ? 'Tu conexión es estable y los datos se están sincronizando en tiempo real con la nube.' 
                  : 'Has perdido la conexión. Los cambios se guardarán localmente y se sincronizarán al recuperar internet.'}
            </div>
          </div>

          <div className="hidden lg:flex bg-indigo-600 text-white font-bold text-sm py-2 px-4 rounded-lg shadow">
              <span>{academicYear}</span>
          </div>
          <div className="flex items-center space-x-2 bg-indigo-600 text-white font-bold text-sm py-2 px-4 rounded-lg shadow">
              {currentUser.instituteLogo ? (
                  <img src={currentUser.instituteLogo} alt={currentUser.instituteName} className="h-5 w-auto" />
              ) : (
                  <img src={companyInfo.logo} alt="Logo de la Empresa" className="h-5 w-auto" />
              )}
              <span>{currentUser.instituteName || companyInfo.name}</span>
          </div>
          
          {currentUser.profiles.length > 1 && (
            <div className="flex items-center bg-indigo-600 p-1 rounded-lg shadow space-x-1">
              {currentUser.profiles.map((profile) => (
                <button
                  key={profile}
                  onClick={() => selectProfile(profile)}
                  className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors duration-200 ${
                    selectedProfile === profile
                      ? 'bg-white text-indigo-700 shadow-inner'
                      : 'text-indigo-200 hover:bg-indigo-500 hover:text-white'
                  }`}
                >
                  {getProfileDisplayName(profile)}
                </button>
              ))}
            </div>
          )}
      </div>
      <div className="relative">
        <button 
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center space-x-2 focus:outline-none"
        >
          <Avatar user={currentUser} className="w-10 h-10" />
          <div className="text-left hidden md:block">
            <p className="font-semibold text-gray-800 dark:text-gray-200">{currentUser.teacherName || currentUser.name}</p>
            <p className="text-xs text-gray-500">
                {selectedProfile ? getProfileDisplayName(selectedProfile) : ''}
            </p>
          </div>
          <ChevronDownIcon className="w-5 h-5 text-gray-500" />
        </button>
        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-md shadow-lg py-1 z-20">
            <Link to={`/${selectedProfile}/profile`} className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600">
              <ProfileIcon className="w-5 h-5 mr-2" />
              Mi Perfil
            </Link>
            <button
              onClick={logout}
              className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
            >
              <LogoutIcon className="w-5 h-5 mr-2" />
              Cerrar Sesión
            </button>
          </div>
        )}
      </div>
    </header>
  );
};