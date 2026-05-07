import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { ChevronDownIcon, LogoutIcon, ProfileIcon, MessageIcon, LockIcon } from './icons';
import { useNavigation } from '../contexts/NavigationContext';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar } from './Avatar';
import { getProfileDisplayName, Profile } from '../types';
import { useCompany } from '../contexts/CompanyContext';

export const Header: React.FC = () => {
  const { currentUser, selectedProfile, logout, selectProfile } = useAuth();
  const { messages, academic_years, selectedYearId, setSelectedYearId } = useData();
  const { companyInfo } = useCompany();
  const { toggleMobileSidebar } = useNavigation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isProfileSwitcherOpen, setIsProfileSwitcherOpen] = useState(false);
  const [isYearSwitcherOpen, setIsYearSwitcherOpen] = useState(false);
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
    if (!currentUser || !selectedProfile) return 0;
    return (messages || []).filter(m => 
      m?.recipient_ids?.includes(currentUser.id) && 
      !m?.read_by?.[currentUser.id]
    ).length;
  }, [messages, currentUser, selectedProfile]);

  const currentYear = useMemo(() => {
    return academic_years.find(y => y.id === selectedYearId) || academic_years.find(y => y.is_active);
  }, [academic_years, selectedYearId]);

  const academicYearLabel = currentYear ? currentYear.name : 'Cargando...';

  const getProfileTheme = (profile: Profile | null) => {
    switch (profile) {
      case Profile.CREATOR:
        return { bg: 'bg-red-600', hover: 'hover:bg-red-700', text: 'text-red-600' };
      case Profile.ADMIN:
        return { bg: 'bg-amber-500', hover: 'hover:bg-amber-600', text: 'text-amber-600' };
      case Profile.ALMACEN:
        return { bg: 'bg-emerald-600', hover: 'hover:bg-emerald-700', text: 'text-emerald-600' };
      case Profile.SALES_MANAGER:
        return { bg: 'bg-purple-600', hover: 'hover:bg-purple-700', text: 'text-purple-600' };
      default:
        return { bg: 'bg-indigo-600', hover: 'hover:bg-indigo-500', text: 'text-gray-500' };
    }
  };

  const currentTheme = getProfileTheme(selectedProfile);

  if (!currentUser) return null;

  return (
    <header className="bg-white dark:bg-gray-800 shadow-md h-16 flex items-center justify-between px-3 sm:px-6 z-40">
      <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Hamburger Menu - Mobile only */}
          <button onClick={toggleMobileSidebar} className="md:hidden p-2 text-gray-500 hover:text-indigo-600 dark:text-gray-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
          </button>

          {currentYear && !currentYear.is_active && (
            <div className="flex items-center bg-amber-100 text-amber-800 px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter border border-amber-200 animate-pulse">
              <LockIcon className="w-3 h-3 mr-1" /> Solo Lectura (Histórico)
            </div>
          )}

          {/* Network Status Dot - Always show, but shrink text */}
          <div className="flex items-center px-1.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 space-x-1 border dark:border-gray-600 group relative cursor-help">
            <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${isOnline ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`} />
            <span className={`text-[9px] uppercase font-bold hidden xs:block ${isOnline ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          {/* Perfil Seleccionado Label */}
          <div className="hidden lg:flex flex-col items-center px-4 py-1.5 bg-primary-50 dark:bg-primary-900/20 rounded-xl border border-primary-200 dark:border-primary-800 shadow-sm transition-all hover:shadow-md">
             <span className="text-[9px] font-black text-primary-600 dark:text-primary-400 uppercase tracking-widest leading-none mb-1 opacity-80">Perfil Activo</span>
             <span className="text-xs font-black text-gray-800 dark:text-gray-100 leading-none">{getProfileDisplayName(selectedProfile || Profile.STUDENT)}</span>
          </div>

          <div className="hidden md:flex items-center space-x-4">
              <div className="relative">
                <button 
                  onClick={() => setIsYearSwitcherOpen(!isYearSwitcherOpen)}
                  className={`hidden lg:flex items-center text-white font-bold text-sm py-2 px-4 rounded-lg shadow transition-colors ${currentTheme.bg} ${currentTheme.hover}`}
                >
                    <span>{academicYearLabel}</span>
                    {academic_years.length > 1 && <ChevronDownIcon className="w-4 h-4 ml-2" />}
                </button>

                {isYearSwitcherOpen && academic_years.length > 1 && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-md shadow-lg py-1 z-50 border border-gray-200 dark:border-gray-600">
                    <div className="px-4 py-2 text-[10px] uppercase font-bold text-gray-400 border-b dark:border-gray-600">Historial de Cursos</div>
                    {academic_years.map((year) => (
                      <button
                        key={year.id}
                        onClick={() => { setSelectedYearId(year.id); setIsYearSwitcherOpen(false); }}
                        className={`block w-full text-left px-4 py-2 text-xs font-semibold ${selectedYearId === year.id ? `${currentTheme.bg} text-white` : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'}`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{year.name}</span>
                          {year.is_active && <span className="text-[8px] bg-green-100 text-green-800 px-1 rounded uppercase font-black">Actual</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className={`flex items-center text-white font-bold text-sm py-2 px-3 rounded-lg shadow overflow-hidden max-w-[150px] sm:max-w-[200px] ${currentTheme.bg}`}>
                  {currentUser.instituteLogo ? (
                      <img src={currentUser.instituteLogo} alt={currentUser.instituteName} className="h-5 w-auto" />
                  ) : (
                      <img src={companyInfo.logo} alt="Logo de la Empresa" className="h-5 w-auto" />
                  )}
                  <span className="truncate ml-2">{currentUser.instituteName || companyInfo.name}</span>
              </div>
          </div>
          
          {currentUser.profiles.length >= 1 && (
            <div className="relative">
              <button
                onClick={() => setIsProfileSwitcherOpen(!isProfileSwitcherOpen)}
                className={`flex items-center text-xs font-semibold px-3 py-1.5 rounded-lg shadow space-x-1 transition-colors text-white ${currentTheme.bg} ${currentTheme.hover}`}
              >
                <span className="truncate max-w-[80px]">{selectedProfile ? getProfileDisplayName(selectedProfile) : 'Seleccionar'}</span>
                {currentUser.profiles.length > 1 && <ChevronDownIcon className="w-3 h-3" />}
              </button>
              
              {isProfileSwitcherOpen && currentUser.profiles.length > 1 && (
                <div className="absolute top-full left-0 mt-2 w-40 bg-white dark:bg-gray-700 rounded-md shadow-lg py-1 z-50 border border-gray-200 dark:border-gray-600">
                  {currentUser.profiles.map((profile) => {
                    const profileTheme = getProfileTheme(profile);
                    const isActive = selectedProfile === profile;
                    
                    return (
                      <button
                        key={profile}
                        onClick={() => { selectProfile(profile); setIsProfileSwitcherOpen(false); }}
                        className={`block w-full text-left px-4 py-2 text-xs font-semibold ${
                            isActive 
                                ? `${profileTheme.bg} text-white` 
                                : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'
                        }`}
                      >
                        {getProfileDisplayName(profile)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
      </div>

      <div className="flex items-center space-x-2 sm:space-x-4">
        {/* Messages Notification Icon */}
        <button 
          onClick={() => navigate(`/${selectedProfile}/messaging`)}
          className={`relative p-2 transition-colors ${currentTheme.text.startsWith('text-gray') ? 'text-gray-500 hover:text-indigo-600 dark:text-gray-400' : `${currentTheme.text} hover:opacity-80`}`}
          title="Mensajería"
        >
          <MessageIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          {unreadMessagesCount > 0 && (
            <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
              {unreadMessagesCount}
            </span>
          )}
        </button>

        <div className="relative">
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center space-x-1 sm:space-x-2 focus:outline-none"
          >
            <Avatar user={currentUser} className="w-8 h-8 sm:w-10 sm:h-10" />
            <div className="text-left hidden sm:block">
              <p className="font-semibold text-xs sm:text-sm text-gray-800 dark:text-gray-200 leading-tight">{currentUser.teacherName || currentUser.name}</p>
              <p className={`text-[10px] uppercase tracking-wider font-bold ${currentTheme.text}`}>
                  {selectedProfile ? getProfileDisplayName(selectedProfile) : ''}
              </p>
            </div>
            <ChevronDownIcon className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
          </button>
          
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-40 sm:w-48 bg-white dark:bg-gray-700 rounded-md shadow-lg py-1 z-50 border dark:border-gray-600">
              <Link to={`/${selectedProfile}/profile`} className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600">
                <ProfileIcon className="w-4 h-4 mr-2" />
                Mi Perfil
              </Link>
              <div className="border-t border-gray-100 dark:border-gray-600 my-1"></div>
              <button
                onClick={logout}
                className="w-full text-left flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <LogoutIcon className="w-4 h-4 mr-2" />
                Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
