import React, { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { User as UserIcon, LogOut, ShoppingCart, ShoppingBag, ShieldCheck, GraduationCap, Store, Box, ChefHat } from 'lucide-react';
import { getProfileDisplayName, Profile, SUPER_USER_EMAILS } from '../../types';

export const ProfileSelector: React.FC = () => {
  const { currentUser, selectedProfile, selectProfile, logout, isAuthReady, syncUserWithProfile } = useAuth();
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
      <div className="mt-8 flex flex-wrap justify-center gap-6 max-w-5xl px-4">
        {[Profile.CREATOR, Profile.ADMIN, Profile.ALMACEN, Profile.TEACHER, Profile.STUDENT, Profile.SALES_MANAGER, Profile.CUSTOMER].map((profile) => {
          const hasProfile = currentUser.profiles.includes(profile);
          if (!hasProfile) return null;

          let Icon = UserIcon;
          let colorClass = "text-primary-600";
          let bgClass = "bg-primary-100 dark:bg-primary-900/30";

          if (profile === Profile.ADMIN) { Icon = ShieldCheck; colorClass = "text-amber-600"; bgClass = "bg-amber-100 dark:bg-amber-900/30"; }
          if (profile === Profile.TEACHER) { Icon = ChefHat; colorClass = "text-indigo-600"; bgClass = "bg-indigo-100 dark:bg-indigo-900/30"; }
          if (profile === Profile.STUDENT) { Icon = GraduationCap; colorClass = "text-emerald-600"; bgClass = "bg-emerald-100 dark:bg-emerald-900/30"; }
          if (profile === Profile.CUSTOMER) { Icon = ShoppingCart; colorClass = "text-purple-600"; bgClass = "bg-purple-100 dark:bg-purple-900/30"; }
          if (profile === Profile.ALMACEN) { Icon = Box; colorClass = "text-blue-600"; bgClass = "bg-blue-100 dark:bg-blue-900/30"; }
          if (profile === Profile.SALES_MANAGER) { Icon = Store; colorClass = "text-pink-600"; bgClass = "bg-pink-100 dark:bg-pink-900/30"; }

          return (
            <button
              key={profile}
              onClick={() => {
                console.log('ProfileSelector - Selecting profile:', profile);
                selectProfile(profile);
              }}
              className="group relative flex flex-col items-center p-8 w-44 bg-white dark:bg-gray-800 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-2 border-transparent hover:border-primary-500"
            >
              <div className={`w-20 h-20 ${bgClass} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner`}>
                <Icon className={`w-10 h-10 ${colorClass}`} />
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-gray-800 dark:text-white text-center leading-tight">
                {getProfileDisplayName(profile)}
              </span>
            </button>
          );
        })}

        {/* BOTÓN INDEPENDIENTE PARA TAKEAWAY SI NO LO TIENE */}
        {!currentUser.profiles.includes(Profile.CUSTOMER) && (
          <button
            onClick={async () => {
              const newProfiles = [...currentUser.profiles, Profile.CUSTOMER];
              await syncUserWithProfile(newProfiles);
              selectProfile(Profile.CUSTOMER);
            }}
            className="group relative flex flex-col items-center p-8 w-44 bg-purple-50/50 dark:bg-purple-900/10 border-2 border-dashed border-purple-200 dark:border-purple-800 rounded-3xl hover:border-purple-500 hover:bg-purple-50 transition-all duration-300 transform hover:-translate-y-2 shadow-sm"
          >
            <div className="w-20 h-20 bg-purple-100 dark:bg-purple-800/30 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner">
              <ShoppingBag className="w-10 h-10 text-purple-600" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-purple-700 dark:text-purple-400 text-center leading-tight">
              Activar Perfil Takeaway
            </span>
            <p className="text-[8px] text-purple-500 mt-2 font-black uppercase tracking-tighter">Uso comercial independiente</p>
          </button>
        )}
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