import React, { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { getProfileDisplayName, Profile, SUPER_USER_EMAILS } from '../../types';

export const ProfileSelector: React.FC = () => {
  const { currentUser, selectedProfile, selectProfile, logout, isAuthReady } = useAuth();
  const navigate = useNavigate();

  console.log('ProfileSelector - isAuthReady:', isAuthReady, 'currentUser:', currentUser?.email, 'access_profiles:', currentUser?.access_profiles);

  useEffect(() => {
    if (isAuthReady && currentUser && !selectedProfile) {
      if (currentUser.profiles.length === 1) {
        console.log('ProfileSelector - Only one profile found, auto-selecting:', currentUser.profiles[0]);
        selectProfile(currentUser.profiles[0]);
      }
    }
    if (isAuthReady && currentUser && selectedProfile) {
      if (currentUser.profiles.includes(selectedProfile)) {
        console.log('ProfileSelector - Profile already selected, redirecting to dashboard:', selectedProfile);
        if (selectedProfile === 'customer') {
          navigate('/student/takeaway-catalog');
        } else {
          navigate(`/${selectedProfile}/dashboard`);
        }
      }
    }
  }, [isAuthReady, currentUser, selectedProfile, navigate]);

  if (!isAuthReady) return null;

  if (!currentUser) {
    console.log('ProfileSelector - No user, redirecting to login');
    return <Navigate to="/login" />;
  }

  if (currentUser.activity_status === 'De Baja') {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col justify-center items-center">
        <div className="text-center max-w-md p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <img src={currentUser.avatar} alt="User Avatar" className="w-24 h-24 mx-auto rounded-full mb-4 shadow-lg" />
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Cuenta Inactiva</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Hola {currentUser.name}, tu cuenta ha sido registrada como <strong>Profesor Inactivo</strong>. 
            Un administrador debe activarla y asignarte los permisos correspondientes antes de que puedas acceder a la plataforma.
          </p>
          <button 
            onClick={logout}
            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col justify-center items-center">
      <div className="text-center">
        <img 
          src={currentUser.avatar} 
          alt="User Avatar" 
          className={`w-24 h-24 mx-auto rounded-full mb-4 shadow-lg ${SUPER_USER_EMAILS.includes(currentUser.email) ? 'cursor-pointer hover:ring-4 hover:ring-primary-500 transition-all' : ''}`}
          onClick={() => {
            if (SUPER_USER_EMAILS.includes(currentUser.email)) {
              console.log('ProfileSelector - Secretly selecting CREATOR profile');
              selectProfile(Profile.CREATOR);
            }
          }}
        />
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Bienvenido, {currentUser.name}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Por favor, selecciona un perfil para continuar.</p>
      </div>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        {[Profile.CREATOR, Profile.ADMIN, Profile.ALMACEN, Profile.TEACHER, Profile.STUDENT, Profile.SALES_MANAGER, Profile.CUSTOMER].map((profile) => {
          const hasProfile = currentUser.profiles.includes(profile);
          // access_profiles is deprecated, rely on profiles and activity_status
          const isEnabled = true; 
          
          if (!hasProfile) return null;

          const isCreator = profile === Profile.CREATOR;

          return (
            <button
              key={profile}
              onClick={() => {
                if (isEnabled) {
                  console.log('ProfileSelector - Selecting profile:', profile);
                  selectProfile(profile);
                } else {
                  alert("Este perfil aún no ha sido activado por un administrador.");
                }
              }}
              className={`px-8 py-4 font-semibold rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 ${
                isEnabled 
                  ? (isCreator 
                      ? 'bg-red-600 text-white hover:bg-red-700' 
                      : 'bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 hover:bg-primary-500 hover:text-white')
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }`}
            >
              <span className="text-xl">{getProfileDisplayName(profile)}</span>
            </button>
          );
        })}
      </div>
       <button 
        onClick={logout}
        className="mt-8 text-sm text-gray-500 hover:text-primary-600 dark:hover:text-primary-400"
        >
            ¿No eres tú? Cerrar sesión
        </button>
    </div>
  );
};