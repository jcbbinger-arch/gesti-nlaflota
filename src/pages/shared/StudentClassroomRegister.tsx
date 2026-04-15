import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { useCompany } from '../../contexts/CompanyContext';
import { useCreator } from '../../contexts/CreatorContext';
import { Profile, User } from '../../types';
import { doc, setDoc, collection } from 'firebase/firestore';
import { db } from '../../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth as firebaseAuth } from '../../firebase';

export const StudentClassroomRegister: React.FC = () => {
  const { companyInfo } = useCompany();
  const { creatorInfo } = useCreator();
  const { classrooms, users } = useData();
  const { loginWithEmail } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    classroomCode: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // 1. Validate Classroom Code
      const classroom = classrooms.find(c => c.code.toUpperCase() === formData.classroomCode.toUpperCase());
      if (!classroom) {
        throw new Error('El código de aula no es válido. Por favor, solicítalo a tu profesor.');
      }

      // 2. Check if email already exists in our users list (optional but good for early feedback)
      if (users.some(u => u.email.toLowerCase() === formData.email.toLowerCase())) {
        throw new Error('Este correo electrónico ya está registrado.');
      }

      // 3. Create User in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(firebaseAuth, formData.email, formData.password);
      const firebaseUser = userCredential.user;

      // 4. Create User Document in Firestore
      const newUser: User = {
        id: firebaseUser.uid,
        name: formData.name,
        email: formData.email.toLowerCase(),
        avatar: `https://i.pravatar.cc/150?u=${firebaseUser.uid}`,
        profiles: [Profile.STUDENT],
        classroom_id: classroom.id,
        activity_status: 'Activo',
        location_status: 'En el centro',
        workspaceId: 'default-workspace' // Assuming a default or inherited workspace
      };

      await setDoc(doc(db, 'users', firebaseUser.uid), newUser);

      // 5. Log in locally
      await loginWithEmail(formData.email, formData.password);
      
      // 6. Redirect to dashboard
      navigate('/student/dashboard');

    } catch (err: any) {
      console.error("Registration error:", err);
      setError(err.message || 'Ocurrió un error durante el registro.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-200 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
        <div className="flex justify-center items-center space-x-8 mb-6">
          {creatorInfo.logo && (
            <img src={creatorInfo.logo} alt="Logotipo de Manager Pro" className="h-16 w-auto object-contain" />
          )}
          {companyInfo.logo && (
            <img src={companyInfo.logo} alt="Logotipo del IES La Flota" className="h-16 w-auto object-contain" />
          )}
        </div>

        <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-2">
          Registro de Alumno
        </h2>
        <p className="text-center text-gray-600 dark:text-gray-300 mb-8 text-sm">
          Introduce el código facilitado por tu profesor para unirte a tu aula.
        </p>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre Completo</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 block w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Tu nombre y apellidos"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Correo Electrónico</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className="mt-1 block w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="alumno@ejemplo.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Contraseña</label>
            <input
              type="password"
              required
              minLength={6}
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              className="mt-1 block w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Código de Aula</label>
            <input
              type="text"
              required
              value={formData.classroomCode}
              onChange={e => setFormData({ ...formData, classroomCode: e.target.value.toUpperCase() })}
              className="mt-1 block w-full p-2 border-2 border-primary-500 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono text-center text-lg tracking-widest"
              placeholder="CÓDIGO"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 transition-colors font-bold disabled:bg-primary-300"
          >
            {isLoading ? 'Registrando...' : 'Unirse al Aula'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-sm text-primary-600 hover:underline">
            ¿Ya tienes cuenta? Inicia sesión aquí
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 text-center text-xs text-gray-500">
             <p>{creatorInfo.copyright}</p>
             <a href={creatorInfo.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary-400">
                 {creatorInfo.name}
             </a>
        </div>
      </div>
    </div>
  );
};
