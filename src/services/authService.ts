import { User, Profile } from '../types';

// This is the initial set of users for a fresh application instance.
// The demo data loader will overwrite this.
export const users: User[] = [
  { id: 'user-1', name: 'Usuario Administrador', email: 'admin@managerpro.edu', password: 'password', avatar: 'https://i.pravatar.cc/150?u=admin@managerpro.edu', profiles: [Profile.ADMIN], activity_status: 'Activo', location_status: 'En el centro', phone: '600112233', address: 'Calle Falsa 123' },
  { id: 'user-2', name: 'Usuario Encargado', email: 'manager@managerpro.edu', password: 'password', avatar: 'https://i.pravatar.cc/150?u=manager@managerpro.edu', profiles: [Profile.ALMACEN], activity_status: 'Activo', location_status: 'En el centro' },
  { id: 'teacher-1', name: 'Ana Martínez (Tutora)', email: 'teacher@managerpro.edu', password: 'password', avatar: 'https://i.pravatar.cc/150?u=teacher-1', profiles: [Profile.TEACHER], activity_status: 'Activo', location_status: 'En el centro', contract_type: 'Fijo', role_type: 'Titular', phone: '611223344', address: 'Avenida del Saber 45' },
  { id: 'user-4', name: 'Super Usuario', email: 'managerproapp@gmail.com', avatar: 'https://i.pravatar.cc/150?u=creator@managerpro.edu', profiles: [Profile.ADMIN, Profile.TEACHER, Profile.ALMACEN, Profile.CREATOR, Profile.STUDENT], activity_status: 'Activo', location_status: 'En el centro', role_type: 'Titular', contract_type: 'Fijo', classroom_id: 'classroom-1', phone: '655667788', address: 'Plaza del Centro 1', student_simulated_profile: Profile.TEACHER },
  { id: 'student-1', name: 'Usuario Alumno', email: 'student@managerpro.edu', password: 'password', avatar: 'https://i.pravatar.cc/150?u=student-1', profiles: [Profile.STUDENT], activity_status: 'Activo', location_status: 'En el centro', classroom_id: 'classroom-1', student_simulated_profile: Profile.ALMACEN },
];
