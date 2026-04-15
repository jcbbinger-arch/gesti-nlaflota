import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/Card';
import { Modal } from '../../components/Modal';
import { PlusIcon, DownloadIcon } from '../../components/icons';
import { User, Profile, getProfileDisplayName, SUPER_USER_EMAILS } from '../../types';
import { Avatar } from '../../components/Avatar';
import { exportToCsv } from '../../utils/export';

export const UserManager: React.FC = () => {
    const { users, setUsers } = useData();
    const { currentUser, impersonateUser } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [filter, setFilter] = useState<string>('');
    
    const filteredUsers = useMemo(() => {
        const displayableUsers = users.filter(u => !SUPER_USER_EMAILS.includes(u.email));
        if (!filter) return displayableUsers;
        return displayableUsers.filter(u => u.name.toLowerCase().includes(filter.toLowerCase()) || u.email.toLowerCase().includes(filter.toLowerCase()));
    }, [users, filter]);

    const handleOpenModal = (user: User | null = null) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };

    const handleSaveUser = (userData: User) => {
        if (selectedUser) {
            setUsers(users.map(u => (u.id === userData.id ? userData : u)));
        } else {
            setUsers([...users, { ...userData, id: `user-${Date.now()}` }]);
        }
        setIsModalOpen(false);
        setSelectedUser(null);
    };
    
    const handleDeleteUser = (userId: string) => {
        if (window.confirm("¿Seguro que quieres eliminar a este usuario? Esta acción no se puede deshacer.")) {
            setUsers(users.filter(u => u.id !== userId));
        }
    };

    const handleExport = () => {
        exportToCsv('usuarios.csv', users.map(u => ({...u, password: '***'})));
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Gestión de Usuarios</h1>
                <div className="no-print">
                    <button onClick={handleExport} className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 mr-2 flex items-center">
                        <DownloadIcon className="w-5 h-5 mr-1" /> Exportar a CSV
                    </button>
                </div>
            </div>

            <Card>
                <input 
                    type="text" 
                    placeholder="Buscar por nombre o email..."
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    className="w-full p-2 mb-4 border rounded-md dark:bg-gray-700 no-print"
                />
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th className="px-4 py-3">Usuario</th>
                                <th className="px-4 py-3">Perfiles</th>
                                <th className="px-4 py-3">Estado</th>
                                <th className="px-4 py-3">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(user => (
                                <tr key={user.id} className="border-b dark:border-gray-700">
                                    <td className="px-4 py-3 font-medium">
                                        <div className="flex items-center space-x-3">
                                            <Avatar user={user} className="w-10 h-10"/>
                                            <div>
                                                <div className="font-bold">{user.name}</div>
                                                <div className="text-xs text-gray-500">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                     <td className="px-4 py-3">{user.profiles.map(p => getProfileDisplayName(p)).join(', ')}</td>
                                    <td className="px-4 py-3">{user.activity_status}</td>
                                    <td className="px-4 py-3 space-x-3 text-xs font-medium no-print">
                                        <button onClick={() => handleOpenModal(user)} className="text-primary-600 hover:underline">Editar</button>
                                        <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:underline">Eliminar</button>
                                        {currentUser?.id !== user.id && (
                                            <button onClick={() => impersonateUser(user)} className="text-yellow-600 hover:underline">Suplantar</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
            
            {isModalOpen && <UserFormModal user={selectedUser} onClose={() => setIsModalOpen(false)} onSave={handleSaveUser} />}
        </div>
    );
};

const UserFormModal: React.FC<{ user: User | null, onClose: () => void, onSave: (user: User) => void }> = ({ user, onClose, onSave }) => {
    const [formState, setFormState] = useState<User>(user || {
        id: '', name: '', email: '', password: '', avatar: '', profiles: [], activity_status: 'Activo', location_status: 'En el centro'
    });
    
    const handleMultiProfileChange = (profile: Profile) => {
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
        const finalUser = {
            ...formState,
            avatar: formState.avatar || `https://i.pravatar.cc/150?u=${formState.email}`
        };
        onSave(finalUser);
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={user ? "Editar Usuario" : "Nuevo Usuario"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" name="name" value={formState.name} onChange={e => setFormState({ ...formState, name: e.target.value })} placeholder="Nombre Completo" required className="w-full p-2 border rounded dark:bg-gray-700" />
                <input type="email" name="email" value={formState.email} onChange={e => setFormState({ ...formState, email: e.target.value })} placeholder="Email" required className="w-full p-2 border rounded dark:bg-gray-700" />
                
                <div>
                    <label>Perfiles</label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                        {Object.values(Profile).filter(p => p !== Profile.CREATOR).map(p => (
                            <label key={p} className="flex items-center space-x-2">
                                <input type="checkbox" checked={formState.profiles.includes(p)} onChange={() => handleMultiProfileChange(p)} />
                                <span>{getProfileDisplayName(p)}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end pt-4 space-x-2">
                    <button type="button" onClick={onClose} className="bg-gray-200 px-4 py-2 rounded-md">Cancelar</button>
                    <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-md">Guardar</button>
                </div>
            </form>
        </Modal>
    );
};