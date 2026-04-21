import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { ChevronDownIcon, LogoutIcon, ProfileIcon, MessageIcon } from './icons';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar } from './Avatar';
import { getProfileDisplayName, Profile } from '../types';
import { useCompany } from '../contexts/CompanyContext';

const getCurrentAcademicYear = () => {
    return `Curso 2025/26`;
};


export const Header: React.FC = () => {
  const { currentUser, selectedProfile, logout, selectProfile } = useAuth();
  const { messages } = useData();
  const { companyInfo } = useCompany();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const navigate = useNavigate();
  
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

  const unreadMessagesCount = useMemo(() => {
    if (!currentUser) return 0;
    return messages.filter(m => 
      m.recipient_ids.includes(currentUser.id) && 
      !m.read_by[currentUser.id]
    ).length;
  }, [messages, currentUser]);

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
          <div className="flex items-center space-x-2 bg-indigo-600 text-white font-bold text-sm py-2 px-4 rounded-lg shadow overflow-hidden max-w-[200px]">
              {currentUser.instituteLogo ? (
                  <img src={currentUser.instituteLogo} alt={currentUser.instituteName} className="h-5 w-auto" />
              ) : (
                  <img src={companyInfo.logo} alt="Logo de la Empresa" className="h-5 w-auto" />
              )}
              <span className="truncate">{currentUser.instituteName || companyInfo.name}</span>
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

      <div className="flex items-center space-x-4">
        {/* Messages Notification Icon */}
        <button 
          onClick={() => navigate(`/${selectedProfile}/messaging`)}
          className="relative p-2 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors"
          title="Mensajería"
        >
          <MessageIcon className="w-6 h-6" />
          {unreadMessagesCount > 0 && (
            <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
              {unreadMessagesCount}
            </span>
          )}
        </button>

        <div className="relative">
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center space-x-2 focus:outline-none"
          >
            <Avatar user={currentUser} className="w-10 h-10" />
            <div className="text-left hidden md:block">
              <p className="font-semibold text-gray-800 dark:text-gray-200 leading-tight">{currentUser.teacherName || currentUser.name}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
                  {selectedProfile ? getProfileDisplayName(selectedProfile) : ''}
              </p>
            </div>
            <ChevronDownIcon className="w-4 h-4 text-gray-400" />
          </button>
          
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-md shadow-lg py-1 z-20 border dark:border-gray-600">
              <Link to={`/${selectedProfile}/profile`} className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600">
                <ProfileIcon className="w-5 h-5 mr-2" />
                Mi Perfil
              </Link>
              <div className="border-t border-gray-100 dark:border-gray-600 my-1"></div>
              <button
                onClick={logout}
                className="w-full text-left flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <LogoutIcon className="w-5 h-5 mr-2" />
                Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
