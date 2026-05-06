import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../../components/Card';
import { Modal } from '../../components/Modal';
import { PlusIcon, WarningIcon, DownloadIcon, TrashIcon } from '../../components/icons';
import { User, Profile, Assignment, Group, Module, getProfileDisplayName, SUPER_USER_EMAILS } from '../../types';
import { exportToCsv } from '../../utils/export';

export const TeacherManager: React.FC = () => {
    const { users, setUsers, assignments, groups, modules } = useData();
    const [activeTab, setActiveTab] = useState<'profesores' | 'clientes' | 'alumnos'>('profesores');
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [deleteStep, setDeleteStep] = useState(1);

    const [searchTerm, setSearchTerm] = useState('');

    const filteredUsers = useMemo(() => {
        if (!searchTerm) return users;
        const lowTerm = searchTerm.toLowerCase().trim();
        return users.filter(u => 
            (u.email || '').toLowerCase().includes(lowTerm) || 
            (u.name || '').toLowerCase().includes(lowTerm)
        );
    }, [users, searchTerm]);

    const staff = useMemo(() => filteredUsers.filter(u => 
        u.email && u.name && 
        (
            u.profiles.length === 0 || 
            u.profiles.some(p => [Profile.TEACHER, Profile.ADMIN, Profile.ALMACEN, Profile.SALES_MANAGER, Profile.CREATOR].includes(p))
        ) &&
        !SUPER_USER_EMAILS.includes(u.email)
    ), [filteredUsers]);

    const takeawayCustomers = useMemo(() => filteredUsers.filter(u => 
        u.profiles.includes(Profile.CUSTOMER)
    ), [filteredUsers]);

    const students = useMemo(() => filteredUsers.filter(u => 
        u.profiles.includes(Profile.STUDENT)
    ), [filteredUsers]);

    const renderTable = (usersList: User[]) => (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                        <th className="px-6 py-3">Nombre</th>
                        <th className="px-6 py-3">Email</th>
                        {activeTab === 'profesores' && <th className="px-6 py-3">Acceso Perfiles</th>}
                        <th className="px-6 py-3">Estado</th>
                        <th className="px-6 py-3">Conexión</th>
                        <th className="px-6 py-3">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {usersList.map(user => (
                        <tr key={user.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                            <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{user.name}</td>
                            <td className="px-6 py-4">{user.email}</td>
                            {activeTab === 'profesores' && (
                                <td className="px-6 py-4">
                                    <div className="flex space-x-1">
                                        {[Profile.ADMIN, Profile.ALMACEN, Profile.TEACHER, Profile.SALES_MANAGER].map(p => {
                                            // Auto-calculate availability based on profiles array
                                            const isEnabled = user.profiles.includes(p);
                                            return (
                                                <div 
                                                    key={p} 
                                                    className={`w-3 h-3 rounded-full ${isEnabled ? 'bg-green-500' : 'bg-red-500/20'}`}
                                                    title={`${getProfileDisplayName(p)}: ${isEnabled ? 'Activo' : 'Inactivo'}`}
                                                />
                                            );
                                        })}
                                    </div>
                                </td>
                            )}
                            <td className="px-6 py-4">
                                <button 
                                    onClick={() => handleToggleStatus(user)}
                                    className={`px-2 py-1 rounded-full text-xs font-semibold ${user.activity_status === 'Activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                                >
                                    {user.activity_status}
                                </button>
                            </td>
                            <td className="px-6 py-4">
                                <span 
                                    className={`px-2 py-1 rounded-full text-xs font-semibold ${user.location_status === 'En el centro' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}
                                    title={user.location_status === 'En el centro' ? 'El usuario está conectado a la aplicación' : 'El usuario está desconectado'}
                                >
                                    {user.location_status === 'En el centro' ? 'Online' : 'Offline'}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-sm font-medium space-x-4 no-print flex items-center">
                                <button onClick={() => handleOpenFormModal(user)} className="text-blue-600 dark:text-blue-500 hover:underline">Ver/Editar</button>
                                <button 
                                    onClick={() => handleOpenDeleteModal(user)} 
                                    className="p-2 text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                                    title="Eliminar usuario"
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    const handleOpenFormModal = (user: User | null = null) => {
        setSelectedUser(user);
        setIsFormModalOpen(true);
    };
    
    const handleOpenDeleteModal = (user: User) => {
        setSelectedUser(user);
        setDeleteStep(1);
        setIsDeleteModalOpen(true);
    };

    const handleSaveUser = async (userData: Partial<User>) => {
        if (selectedUser) { // Editing
            try {
                // Update local state which triggers DataContext upsert
                setUsers(users.map(u => u.id === selectedUser.id ? { ...u, ...userData, email: userData.email?.trim().toLowerCase() || u.email } : u));
                console.log('User updated locally and syncing to DB...');
            } catch (error: any) {
                console.error('Error updating user:', error);
                alert(`Error: ${error.message}`);
                return;
            }
        } else { // Creating new
            try {
                const newUser: User = {
                    id: `user-${Date.now()}`,
                    name: userData.name || '',
                    email: userData.email?.trim().toLowerCase() || '',
                    profiles: userData.profiles || [Profile.TEACHER],
                    activity_status: 'Activo',
                    location_status: 'En el centro',
                    avatar: `https://i.pravatar.cc/150?u=${Date.now()}`,
                    ...userData
                };
                setUsers([...users, newUser]);
                console.log('New user created locally and syncing to DB...');
            } catch (error: any) {
                console.error('Error creating user:', error);
                alert(`Error: ${error.message}`);
                return;
            }
        }
        setIsFormModalOpen(false);
        setSelectedUser(null);
    };
    
    const handleToggleStatus = (user: User) => {
        const newStatus = user.activity_status === 'Activo' ? 'De Baja' : 'Activo';
        setUsers(users.map(u => u.id === user.id ? { ...u, activity_status: newStatus } : u));
    };

    const handleToggleProfileAccess = (user: User, profile: Profile) => {
        const hasProfile = user.profiles.includes(profile);
        const newProfiles = hasProfile 
            ? user.profiles.filter(p => p !== profile) 
            : [...user.profiles, profile];
        
        // Allow empty profiles so admin can deactivate access entirely
        setUsers(users.map(u => u.id === user.id ? { ...u, profiles: newProfiles } : u));
    };

    const handleDeleteUser = () => {
        if (selectedUser) {
            setUsers(users.filter(u => u.id !== selectedUser.id));
        }
        setIsDeleteModalOpen(false);
        setSelectedUser(null);
    };

    const handleExport = () => {
        exportToCsv('personal.csv', staff.map(s => ({...s, password: '***'})));
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Gestión de Personal</h1>
                <div className="no-print flex items-center">
                    <button onClick={handleExport} className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 mr-2 flex items-center">
                        <DownloadIcon className="w-5 h-5 mr-1" /> Exportar a CSV
                    </button>
                </div>
            </div>
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="flex space-x-2">
                    <button onClick={() => setActiveTab('profesores')} className={`px-4 py-2 rounded-md transition-colors ${activeTab === 'profesores' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>Profesores</button>
                    <button onClick={() => setActiveTab('clientes')} className={`px-4 py-2 rounded-md transition-colors ${activeTab === 'clientes' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>Clientes Takeaway</button>
                    <button onClick={() => setActiveTab('alumnos')} className={`px-4 py-2 rounded-md transition-colors ${activeTab === 'alumnos' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>Alumnos</button>
                </div>
                <div className="w-full md:w-64">
                    <input 
                        type="text" 
                        placeholder="Buscar por nombre o email..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
            </div>

            <Card title={activeTab === 'profesores' ? 'Lista de Profesores y Personal' : activeTab === 'clientes' ? 'Lista de Clientes Takeaway' : 'Lista de Alumnos'}>
                {activeTab === 'profesores' && renderTable(staff)}
                {activeTab === 'clientes' && renderTable(takeawayCustomers)}
                {activeTab === 'alumnos' && renderTable(students)}
            </Card>

            {isFormModalOpen && (
                <UserFormModal 
                    user={selectedUser} 
                    onClose={() => setIsFormModalOpen(false)} 
                    onSave={handleSaveUser}
                    allUsers={users}
                    allAssignments={assignments}
                    allGroups={groups}
                    allModules={modules}
                    activeTab={activeTab}
                />
            )}
            
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirmar Eliminación">
                {deleteStep === 1 ? (
                    <div>
                        <div className="text-center">
                            <WarningIcon className="w-16 h-16 text-red-500 mx-auto"/>
                            <p className="text-lg font-semibold my-4">¿Seguro que quieres eliminar a {selectedUser?.name}?</p>
                            <p className="text-gray-500">Esta acción no se puede deshacer.</p>
                        </div>
                        <div className="mt-6 flex justify-end space-x-3">
                            <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300">Cancelar</button>
                            <button onClick={() => setDeleteStep(2)} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Sí, eliminar</button>
                        </div>
                    </div>
                ) : (
                     <div>
                        <p className="mb-4 text-center">Para confirmar, haz clic de nuevo en el botón de eliminar.</p>
                        <div className="mt-6 flex justify-end">
                             <button onClick={handleDeleteUser} className="w-full px-4 py-2 bg-red-600 text-white rounded-md">Confirmar Eliminación Permanente</button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

const UserFormModal: React.FC<{ 
    user: User | null; 
    onClose: () => void; 
    onSave: (user: Partial<User>) => void; 
    allUsers: User[];
    allAssignments: Assignment[],
    allGroups: Group[],
    allModules: Module[],
    activeTab: 'profesores' | 'clientes' | 'alumnos'
}> = ({ user, onClose, onSave, allUsers, allAssignments, allGroups, allModules, activeTab }) => {
    const [formState, setFormState] = useState({
        name: user?.name || '',
        email: user?.email || '',
        // For new users, default to empty profile so admin MUST choose.
        // For existing users, keep their profiles (which might be empty if pending).
        profiles: user ? user.profiles : (activeTab === 'clientes' ? [Profile.CUSTOMER] : activeTab === 'alumnos' ? [Profile.STUDENT] : []),
        contract_type: user?.contract_type || 'Fijo',
        role_type: user?.role_type || 'Titular',
        substituting_user_id: user?.substituting_user_id || '',
        phone: user?.phone || '',
        address: user?.address || '',
    });

    const titularTeachers = useMemo(() => {
        // Find users that are Titular teachers
        return (allUsers || []).filter(u => u.role_type === 'Titular' && u.profiles.includes(Profile.TEACHER) && u.id !== user?.id);
    }, [allUsers, user]);

    const userAssignments = useMemo(() => {
        if (!user || !user.profiles.includes(Profile.TEACHER)) return [];
        const groupMap: Map<string, Group> = new Map(allGroups.map(g => [g.id, g]));
        const moduleMap: Map<string, Module> = new Map(allModules.map(m => [m.id, m]));
        return allAssignments
            .filter(a => a.user_id === user.id)
            .map(a => {
                const group = groupMap.get(a.group_id);
                const module = moduleMap.get(a.module_id);
                return {
                    id: a.id,
                    group_id: a.group_id,
                    group_name: group?.name || 'Desconocido',
                    module_name: module?.name || 'Desconocido'
                };
            });
    }, [user, allAssignments, allGroups, allModules]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        
        let newProfiles = [...formState.profiles];
        let newSubstitutingId = formState.substituting_user_id;

        if (name === 'role_type' && value === 'Titular') {
            newSubstitutingId = '';
        }

        if (name === 'substituting_user_id' && value !== '') {
            const titular = titularTeachers.find(t => t.id === value);
            if (titular) {
                // Inherit profiles EXCEPT Admin
                newProfiles = titular.profiles.filter(p => p !== Profile.ADMIN);
                // Ensure TEACHER is included if they are substituting a titular teacher
                if (!newProfiles.includes(Profile.TEACHER)) {
                    newProfiles.push(Profile.TEACHER);
                }
            }
        }

        setFormState({
            ...formState, 
            [name]: value, 
            profiles: newProfiles,
            substituting_user_id: newSubstitutingId
        });
    }

    const handleProfileChange = (profile: Profile) => {
        const newProfiles = formState.profiles.includes(profile)
            ? formState.profiles.filter(p => p !== profile)
            : [...formState.profiles, profile];
        setFormState({ ...formState, profiles: newProfiles });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formState.profiles.length === 0) {
            alert("Por favor, selecciona al menos un perfil.");
            return;
        }
        onSave({ ...formState });
    };

    const assignableProfiles = useMemo(() => {
        if (activeTab === 'clientes') return [Profile.CUSTOMER];
        if (activeTab === 'alumnos') return [Profile.STUDENT];
        return [Profile.ADMIN, Profile.ALMACEN, Profile.TEACHER, Profile.SALES_MANAGER];
    }, [activeTab]);

    return (
        <Modal isOpen={true} onClose={onClose} title={user ? 'Editar Personal' : 'Nuevo Personal'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" name="name" value={formState.name} onChange={handleChange} placeholder="Nombre y Apellidos" required className="w-full p-2 border rounded dark:bg-gray-700"/>
                <input type="email" name="email" value={formState.email} onChange={handleChange} placeholder="Email" required className="w-full p-2 border rounded dark:bg-gray-700"/>
                
                <div className="grid grid-cols-2 gap-4">
                    <input type="tel" name="phone" value={formState.phone} onChange={handleChange} placeholder="Teléfono" className="w-full p-2 border rounded dark:bg-gray-700"/>
                    <input type="text" name="address" value={formState.address} onChange={handleChange} placeholder="Dirección" className="w-full p-2 border rounded dark:bg-gray-700"/>
                </div>

                {activeTab === 'profesores' && (
                    <div>
                        <label className="font-medium">Perfiles / Permisos</label>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                            {assignableProfiles.map(p => (
                                <label key={p} className="flex items-center space-x-2 p-2 border rounded-md dark:border-gray-600 bg-white dark:bg-gray-800">
                                    <input type="checkbox" checked={formState.profiles.includes(p)} onChange={() => handleProfileChange(p)} />
                                    <span className="text-sm">{getProfileDisplayName(p)}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                 {formState.profiles.includes(Profile.TEACHER) && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <select name="contract_type" value={formState.contract_type} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-700">
                                <option value="Fijo">Fijo</option>
                                <option value="Interino">Interino</option>
                            </select>
                            <select name="role_type" value={formState.role_type} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-700">
                                <option value="Titular">Titular</option>
                                <option value="Sustituto">Sustituto</option>
                            </select>
                        </div>
                        
                        {formState.role_type === 'Sustituto' && (
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Profesor al que sustituye</label>
                                <select 
                                    name="substituting_user_id" 
                                    value={formState.substituting_user_id} 
                                    onChange={handleChange} 
                                    required 
                                    className="w-full p-2 border rounded dark:bg-gray-700 font-bold text-primary-600"
                                >
                                    <option value="">-- Seleccionar Titular --</option>
                                    {titularTeachers.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-gray-400 mt-1 italic">
                                    Al seleccionar un titular, el sustituto heredará sus perfiles automáticamente (excepto Administrador).
                                </p>
                            </div>
                        )}
                    </div>
                )}
                
                {userAssignments.length > 0 && (
                    <div className="pt-2">
                        <h4 className="font-semibold text-sm">Módulos Asignados</h4>
                        <ul className="list-disc list-inside text-xs mt-1 bg-gray-100 dark:bg-gray-700 p-2 rounded-md max-h-24 overflow-y-auto">
                            {userAssignments.map(a => <li key={a.id}>{a.module_name} - {a.group_name}</li>)}
                        </ul>
                    </div>
                )}

                <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={onClose} className="bg-gray-200 px-4 py-2 rounded-md">Cancelar</button>
                    <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-md">Guardar</button>
                </div>
            </form>
        </Modal>
    );
};