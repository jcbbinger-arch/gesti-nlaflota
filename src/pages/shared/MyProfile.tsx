import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { Card } from '../../components/Card';
import { ProfileIcon, ShieldCheckIcon, LockClosedIcon, BookIcon, ClassroomIcon, ShoppingCartIcon } from '../../components/icons';
import { Avatar } from '../../components/Avatar';
import { Profile, getProfileDisplayName, Message } from '../../types';
import { Link } from 'react-router-dom';

export const MyProfile: React.FC = () => {
    const { currentUser, updateCurrentUser } = useAuth();
    const { users, setUsers, setMessages, reservations, sale_items } = useData();

    const [personalInfo, setPersonalInfo] = useState({
        name: currentUser?.name || '',
        phone: currentUser?.phone || '',
        secondary_phone: currentUser?.secondary_phone || '',
        address: currentUser?.address || '',
        avatar: currentUser?.avatar || '',
    });
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [passwordInfo, setPasswordInfo] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    if (!currentUser) return <p>Cargando perfil...</p>;

    const customerReservations = reservations
        .filter(r => r.user_id === currentUser.id || r.email === currentUser.email)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                setAvatarPreview(result);
                setPersonalInfo(prev => ({ ...prev, avatar: result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handlePersonalInfoSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const updatedData = {
            name: personalInfo.name,
            phone: personalInfo.phone,
            secondary_phone: personalInfo.secondary_phone,
            address: personalInfo.address,
            avatar: personalInfo.avatar,
        };
        
        updateCurrentUser(updatedData);
        setUsers(users.map(u => u.id === currentUser.id ? { ...u, ...updatedData } : u));
        alert("Información personal actualizada.");
    };
    
    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (currentUser.password && passwordInfo.currentPassword !== currentUser.password) {
            alert("La contraseña actual es incorrecta.");
            return;
        }
        if (passwordInfo.newPassword !== passwordInfo.confirmPassword) {
            alert("Las nuevas contraseñas no coinciden.");
            return;
        }
        if (!passwordInfo.newPassword) {
            alert("La nueva contraseña no puede estar vacía.");
            return;
        }

        const updatedData = { password: passwordInfo.newPassword };
        updateCurrentUser(updatedData);
        setUsers(users.map(u => u.id === currentUser.id ? { ...u, ...updatedData } : u));

        const newMessage: Message = {
            id: `msg-sys-${Date.now()}`,
            sender_id: 'system',
            recipient_ids: [currentUser.id],
            subject: 'Actualización de Seguridad de la Cuenta',
            body: 'Tu contraseña ha sido actualizada con éxito.',
            date: new Date().toISOString(),
            read_by: {},
        };
        setMessages(prev => [...prev, newMessage]);
        
        alert("Contraseña actualizada con éxito. Recibirás un mensaje de confirmación.");
        setPasswordInfo({ currentPassword: '', newPassword: '', confirmPassword: '' });
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6">Mi Perfil</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card title="Información Personal" icon={<ProfileIcon className="w-8 h-8" />}>
                        <form onSubmit={handlePersonalInfoSubmit} className="space-y-4">
                            <div className="flex items-center space-x-4">
                               <Avatar user={{ ...currentUser, avatar: avatarPreview || personalInfo.avatar }} className="w-20 h-20" />
                               <input type="file" id="avatar-upload" className="hidden" onChange={handleAvatarChange} accept="image/*"/>
                               <label htmlFor="avatar-upload" className="bg-gray-200 dark:bg-gray-600 px-3 py-2 rounded-md text-sm font-medium cursor-pointer">Cambiar Foto</label>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm">Nombre y Apellidos</label>
                                    <input type="text" value={personalInfo.name} onChange={e => setPersonalInfo({...personalInfo, name: e.target.value})} className="w-full mt-1 p-2 border rounded"/>
                                </div>
                                <div>
                                    <label className="block text-sm">Correo Electrónico</label>
                                    <input type="email" value={currentUser.email} readOnly className="w-full mt-1 p-2 border rounded bg-gray-100 dark:bg-gray-800"/>
                                </div>
                                 <div>
                                    <label className="block text-sm">Teléfono Principal</label>
                                    <input type="tel" value={personalInfo.phone} onChange={e => setPersonalInfo({...personalInfo, phone: e.target.value})} className="w-full mt-1 p-2 border rounded"/>
                                </div>
                                 <div>
                                    <label className="block text-sm">Teléfono Secundario</label>
                                    <input type="tel" value={personalInfo.secondary_phone} onChange={e => setPersonalInfo({...personalInfo, secondary_phone: e.target.value})} className="w-full mt-1 p-2 border rounded"/>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm">Dirección</label>
                                    <textarea value={personalInfo.address} onChange={e => setPersonalInfo({...personalInfo, address: e.target.value})} rows={2} className="w-full mt-1 p-2 border rounded"/>
                                </div>
                            </div>
                             <div className="text-right">
                                <button type="submit" className="bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700">Guardar Cambios</button>
                            </div>
                        </form>
                    </Card>

                    <Card title="Seguridad" icon={<ShieldCheckIcon className="w-8 h-8"/>}>
                        <form onSubmit={handlePasswordSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm">Contraseña Actual</label>
                                <input type="password" value={passwordInfo.currentPassword} onChange={e => setPasswordInfo({...passwordInfo, currentPassword: e.target.value})} className="w-full mt-1 p-2 border rounded" required={!!currentUser.password} />
                            </div>
                            <div>
                                <label className="block text-sm">Nueva Contraseña</label>
                                <input type="password" value={passwordInfo.newPassword} onChange={e => setPasswordInfo({...passwordInfo, newPassword: e.target.value})} className="w-full mt-1 p-2 border rounded" />
                            </div>
                             <div>
                                <label className="block text-sm">Confirmar Nueva Contraseña</label>
                                <input type="password" value={passwordInfo.confirmPassword} onChange={e => setPasswordInfo({...passwordInfo, confirmPassword: e.target.value})} className="w-full mt-1 p-2 border rounded" />
                            </div>
                             <div className="text-right">
                                <button type="submit" className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">Cambiar Contraseña</button>
                            </div>
                        </form>
                    </Card>
                </div>
                <div className="lg:col-span-1">
                    {currentUser.profiles.includes(Profile.TEACHER) && (
                        <Card title="Información de Profesor" icon={<BookIcon className="w-8 h-8" />}>
                            <div className="space-y-3 text-sm">
                                <div><span className="font-semibold">Tipo:</span> {currentUser.contract_type}</div>
                                <div><span className="font-semibold">Estatus:</span> {currentUser.role_type}</div>
                                <div><span className="font-semibold">Estado de Actividad:</span> {currentUser.activity_status}</div>
                                <p className="text-xs text-gray-500 pt-2 border-t mt-2">Esta información es de solo lectura y la gestiona el Administrador.</p>
                            </div>
                        </Card>
                    )}
                    {currentUser.profiles.includes(Profile.STUDENT) && (
                        <Card title="Información de Alumno" icon={<ClassroomIcon className="w-8 h-8" />}>
                            <div className="space-y-3 text-sm">
                                <div>
                                    <span className="font-semibold">Rol de Simulación:</span> {
                                        currentUser.student_simulated_profile
                                        ? getProfileDisplayName(currentUser.student_simulated_profile)
                                        : 'Sin Asignar'
                                    }
                                </div>
                                <div>
                                    <span className="font-semibold">Estado de Actividad:</span> {
                                         currentUser.activity_status === 'De Baja'
                                         ? 'De Baja'
                                         : currentUser.student_simulated_profile
                                             ? 'Puede comenzar la práctica'
                                             : 'Esperando asignación de rol'
                                    }
                                </div>
                                <p className="text-xs text-gray-500 pt-2 border-t mt-2">Esta información es de solo lectura y la gestiona tu Profesor.</p>
                            </div>
                        </Card>
                    )}
                    {currentUser.profiles.includes(Profile.CUSTOMER) && (
                        <Card title="Últimos Pedidos" icon={<ShoppingCartIcon className="w-8 h-8" />}>
                            <div className="space-y-4">
                                {customerReservations.length > 0 ? (
                                    <div className="space-y-3">
                                        {customerReservations.map(res => {
                                            const item = sale_items.find(i => i.id === res.sale_item_id);
                                            return (
                                                <div key={res.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-sm">
                                                    <div className="font-semibold text-gray-800 dark:text-gray-200">{item?.name || 'Producto no disponible'}</div>
                                                    <div className="text-gray-500 dark:text-gray-400 mt-1 flex justify-between items-center">
                                                        <span>{new Date(res.created_at).toLocaleDateString()} - {res.quantity} ud.</span>
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                            res.status === 'recogido' ? 'bg-green-100 text-green-800' :
                                                            res.status === 'cancelado' ? 'bg-red-100 text-red-800' :
                                                            'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                            {res.status || 'pendiente'}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div className="pt-2">
                                            <Link 
                                                to="/student/takeaway-catalog"
                                                className="block w-full text-center bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 transition-colors text-sm font-medium"
                                            >
                                                Hacer un nuevo pedido
                                            </Link>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                                        <p>Aún no has realizado ningún pedido.</p>
                                        <Link 
                                            to="/student/takeaway-catalog"
                                            className="inline-block mt-4 text-primary-600 hover:text-primary-700 font-medium"
                                        >
                                            Ir al catálogo
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};