import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCompany } from '../../contexts/CompanyContext';
import { useCreator } from '../../contexts/CreatorContext';
import { AllergenSelector } from '../teacher/RecipeForm';
import { LogIn, ShoppingBag, GraduationCap, ArrowLeft } from 'lucide-react';

type LoginView = 'portal' | 'teacher' | 'takeaway';

export const Login: React.FC = () => {
  const { loginWithGoogle, loginWithEmail, registerWithEmail, currentUser, selectedProfile } = useAuth();
  const { companyInfo } = useCompany();
  const { creatorInfo } = useCreator();
  const navigate = useNavigate();
  
  const [view, setView] = useState<LoginView>('portal');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  // Form state for Take Away
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [allergens, setAllergens] = useState<string[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'takeaway') {
      setView('takeaway');
      setIsRegistering(true);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      if (selectedProfile && currentUser.profiles.includes(selectedProfile)) {
        navigate(`/${selectedProfile}/dashboard`);
      } else {
        navigate('/select-profile');
      }
    }
  }, [currentUser, selectedProfile, navigate]);

  const handleTakeAwayAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    let success = false;
    if (isRegistering) {
      if (!name || !phone) {
        setError('Por favor, completa todos los campos.');
        setIsLoading(false);
        return;
      }
      success = await registerWithEmail(email, password, name, phone, allergens);
    } else {
      success = await loginWithEmail(email, password);
    }

    if (!success) {
      setError(isRegistering ? 'Error al registrarse. Verifica tus datos.' : 'Error al iniciar sesión. Verifica tus credenciales.');
    }
    setIsLoading(false);
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    const success = await loginWithGoogle();
    if (!success) {
      setError('Error al iniciar sesión con Google. Asegúrate de usar tu cuenta oficial.');
    }
    setIsLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-200 dark:border-gray-700">
        
        {/* Header Branding */}
        <div className="flex justify-center items-center space-x-6 mb-8">
          {creatorInfo.logo && (
            <img src={creatorInfo.logo} alt="Manager Pro" className="h-12 w-auto object-contain" />
          )}
          <div className="h-8 w-px bg-gray-300 dark:bg-gray-600"></div>
          {companyInfo.logo && (
            <img src={companyInfo.logo} alt="IES La Flota" className="h-12 w-auto object-contain" />
          )}
        </div>

        {view !== 'portal' && (
          <button 
            onClick={() => { setView('portal'); setError(''); setIsRegistering(false); }}
            className="mb-4 flex items-center text-sm text-gray-500 hover:text-primary-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Volver al inicio
          </button>
        )}

        {error && (
          <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm rounded-lg text-center font-medium">
            {error}
          </div>
        )}

        {/* --- PORTAL VIEW --- */}
        {view === 'portal' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-6">
              Portal de Acceso
            </h2>
            
            {/* Teacher Path */}
            <button 
              onClick={() => setView('teacher')}
              className="w-full flex items-center p-4 bg-white dark:bg-gray-700 border-2 border-transparent hover:border-primary-500 rounded-xl shadow-sm transition-all group"
            >
              <div className="bg-primary-100 dark:bg-primary-900/30 p-3 rounded-lg mr-4 group-hover:scale-110 transition-transform">
                <LogIn className="w-6 h-6 text-primary-600" />
              </div>
              <div className="text-left">
                <p className="font-bold text-gray-800 dark:text-white">Acceso Profesorado</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Solo personal docente del centro</p>
              </div>
            </button>

            {/* Take Away Path */}
            <button 
              onClick={() => setView('takeaway')}
              className="w-full flex items-center p-4 bg-white dark:bg-gray-700 border-2 border-transparent hover:border-green-500 rounded-xl shadow-sm transition-all group"
            >
              <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg mr-4 group-hover:scale-110 transition-transform">
                <ShoppingBag className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-left">
                <p className="font-bold text-gray-800 dark:text-white">Pedidos Take Away</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Compra de comida para llevar</p>
              </div>
            </button>

            {/* Student Path */}
            <Link 
              to="/student-register"
              className="w-full flex items-center p-4 bg-white dark:bg-gray-700 border-2 border-transparent hover:border-orange-500 rounded-xl shadow-sm transition-all group"
            >
              <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-lg mr-4 group-hover:scale-110 transition-transform">
                <GraduationCap className="w-6 h-6 text-orange-600" />
              </div>
              <div className="text-left">
                <p className="font-bold text-gray-800 dark:text-white">Acceso Alumnos</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Registro con código de aula</p>
              </div>
            </Link>
          </div>
        )}

        {/* --- TEACHER VIEW --- */}
        {view === 'teacher' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Acceso Profesorado</h2>
              <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                  ⚠️ AVISO: Este acceso es exclusivo para profesores de la Escuela de Hostelería del IES La Flota.
                </p>
              </div>
              <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                Utiliza tu cuenta oficial de Google para acceder. El administrador deberá autorizar tu cuenta tras el primer acceso.
              </p>
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex justify-center items-center py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm bg-white dark:bg-gray-700 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
              ) : (
                <>
                  <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24">
                    <path d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.86002 8.87028 4.75 12.0003 4.75Z" fill="#EA4335" />
                    <path d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z" fill="#4285F4" />
                    <path d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z" fill="#FBBC05" />
                    <path d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.21537 17.135 5.26538 14.29L1.27539 17.385C3.25539 21.31 7.3104 24.0001 12.0004 24.0001Z" fill="#34A853" />
                  </svg>
                  Entrar con Google
                </>
              )}
            </button>
          </div>
        )}

        {/* --- TAKE AWAY VIEW --- */}
        {view === 'takeaway' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white">
              {isRegistering ? 'Registro Take Away' : 'Acceso Take Away'}
            </h2>
            
            <form onSubmit={handleTakeAwayAuth} className="space-y-4">
              {isRegistering && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre Completo</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Tu nombre"
                      className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Teléfono</label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="600 000 000"
                      className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contraseña</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-bold shadow-md"
              >
                {isLoading ? 'Procesando...' : (isRegistering ? 'Crear Cuenta' : 'Entrar')}
              </button>
            </form>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-sm text-green-600 hover:underline"
              >
                {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate aquí'}
              </button>
            </div>
          </div>
        )}

        {/* Footer Branding */}
        <div className="mt-10 pt-6 border-t border-gray-200 dark:border-gray-700 text-center text-xs text-gray-500">
             <p>{creatorInfo.copyright}</p>
             <a href={creatorInfo.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary-600 transition-colors font-medium">
                 {creatorInfo.name}
             </a>
        </div>
      </div>
    </div>
  );
};