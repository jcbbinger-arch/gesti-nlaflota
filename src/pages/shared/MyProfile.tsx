import React, { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { Card } from '../../components/Card';
import { ProfileIcon, ShieldCheckIcon, BookIcon, ClassroomIcon, ShoppingCartIcon, AssignmentIcon, CalendarIcon, WalletIcon } from '../../components/icons';
import { Avatar } from '../../components/Avatar';
import { Profile, getProfileDisplayName, Message, ServiceRole } from '../../types';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const MyProfile: React.FC = () => {
    const { currentUser, updateCurrentUser } = useAuth();
    const { 
        users, setUsers, setMessages, reservations, sale_items, 
        assignments, groups, modules, services, orders, events 
    } = useData();

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

    const [activeTab, setActiveTab] = useState<'info' | 'security'>('info');

    const isTeacher = currentUser?.profiles.includes(Profile.TEACHER);

    // Teacher Statistics Data
    const teacherData = useMemo(() => {
        if (!isTeacher || !currentUser) return null;

        const myAssignments = assignments.filter(a => a.user_id === currentUser.id);
        const detailedAssignments = myAssignments.map(a => {
            const group = groups.find(g => g.id === a.group_id);
            const module = modules.find(m => m.id === a.module_id);
            return {
                id: a.id,
                groupName: group?.name || 'Desconocido',
                moduleName: module?.name || 'Desconocido'
            };
        });
        
        const myServices = services.filter(s => Object.values(s.roles).includes(currentUser.id));
        
        // Spending calculations
        const myOrders = orders.filter(o => o.user_id === currentUser.id && o.status !== 'Cancelado');
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        const oneYearAgo = new Date(now.getFullYear(), 0, 1); // Course/Year stats

        const monthlySpend = myOrders
            .filter(o => new Date(o.date) >= thirtyDaysAgo)
            .reduce((sum, o) => sum + (o.cost || 0), 0);

        const annualSpend = myOrders
            .filter(o => new Date(o.date) >= oneYearAgo)
            .reduce((sum, o) => sum + (o.cost || 0), 0);

        // Chart data (last 6 months)
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const chartData = Array.from({ length: 6 }).map((_, i) => {
            const d = new Date();
            d.setMonth(d.getMonth() - (5 - i));
            const monthIdx = d.getMonth();
            const year = d.getFullYear();
            const spend = myOrders
                .filter(o => {
                    const od = new Date(o.date);
                    return od.getMonth() === monthIdx && od.getFullYear() === year;
                })
                .reduce((sum, o) => sum + (o.cost || 0), 0);
            return { name: months[monthIdx], gasto: Number(spend.toFixed(2)) };
        });

        // Event participation
        const myEvents = events.filter(e => 
            e.authorized_teachers?.includes(currentUser.id) || 
            myOrders.some(o => o.event_id === e.id)
        );

        return {
            groups: detailedAssignments,
            servicesCount: myServices.length,
            roles: Array.from(new Set(myServices.flatMap(s => 
                Object.entries(s.roles)
                    .filter(([_, uid]) => uid === currentUser.id)
                    .map(([role]) => role as ServiceRole)
            ))),
            monthlySpend,
            annualSpend,
            chartData,
            events: myEvents
        };
    }, [isTeacher, currentUser, assignments, groups, services, orders, events]);

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
                {/* Stats/Groups - Elevated to Main/Left */}
                <div className="lg:col-span-2 space-y-6">
                    {currentUser.profiles.includes(Profile.TEACHER) && teacherData && (
                        <>
                            <Card title="Grupos y Perfiles" icon={<AssignmentIcon className="w-8 h-8 text-primary-600" />}>
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Módulos y Grupos</h4>
                                        <div className="flex flex-col gap-2">
                                            {teacherData.groups.map(g => (
                                                <div key={g.id} className="px-2 py-1.5 bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 rounded text-xs">
                                                    <span className="font-bold text-primary-800 dark:text-primary-200 block">{g.moduleName}</span>
                                                    <span className="text-primary-600 dark:text-primary-400 italic">{g.groupName}</span>
                                                </div>
                                            ))}
                                            {teacherData.groups.length === 0 && <span className="text-gray-400 text-xs italic">Ningún módulo asignado.</span>}
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Perfiles de Trabajo</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {teacherData.roles.map(role => (
                                                <span key={role} className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs font-medium">
                                                    {role}
                                                </span>
                                            ))}
                                            {teacherData.roles.length === 0 && <span className="text-gray-400 text-xs text-italic">Sin roles en servicios.</span>}
                                        </div>
                                    </div>
                                    <div className="pt-2 border-t text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Servicios Realizados:</span>
                                            <span className="font-bold">{teacherData.servicesCount}</span>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            <Card title="Gasto Acumulado" icon={<WalletIcon className="w-8 h-8 text-green-600" />}>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                            <p className="text-[10px] text-gray-500 uppercase font-bold">Mensual (30d)</p>
                                            <p className="text-xl font-bold text-gray-800 dark:text-gray-200">{teacherData.monthlySpend.toFixed(2)}€</p>
                                        </div>
                                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                            <p className="text-[10px] text-gray-500 uppercase font-bold">Este Curso</p>
                                            <p className="text-xl font-bold text-primary-600">{teacherData.annualSpend.toFixed(2)}€</p>
                                        </div>
                                    </div>
                                    
                                    <div className="h-40 w-full pt-2">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={teacherData.chartData}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                                                <YAxis hide />
                                                <Tooltip 
                                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                    cursor={{ fill: 'transparent' }}
                                                />
                                                <Bar dataKey="gasto" radius={[4, 4, 0, 0]}>
                                                    {teacherData.chartData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={index === 5 ? '#2563eb' : '#94a3b8'} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </Card>

                            <Card title="Eventos y Actividades" icon={<CalendarIcon className="w-8 h-8 text-purple-600" />}>
                                <div className="space-y-3">
                                    {teacherData.events.length > 0 ? (
                                        teacherData.events.slice(0, 3).map(e => (
                                            <div key={e.id} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded transition-colors border-l-4 border-purple-500">
                                                <div className="text-xs">
                                                    <p className="font-bold text-gray-700 dark:text-gray-300">{e.name}</p>
                                                    <p className="text-gray-500">{new Date(e.start_date).toLocaleDateString()}</p>
                                                </div>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${e.status === 'Activo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                    {e.status}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-xs text-gray-400 text-center py-2 italic">No se han registrado participaciones en eventos.</p>
                                    )}
                                </div>
                            </Card>

                            <Card title="Información Corporativa" icon={<BookIcon className="w-8 h-8 text-gray-500" />}>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between border-b pb-2 dark:border-gray-700">
                                        <span className="font-semibold text-gray-500">Tipo de Contrato:</span> 
                                        <span className="font-medium text-gray-800 dark:text-gray-200">{currentUser.contract_type || 'No especificado'}</span>
                                    </div>
                                    <div className="flex justify-between border-b pb-2 dark:border-gray-700">
                                        <span className="font-semibold text-gray-500">Estatus Rol:</span> 
                                        <span className="font-medium text-gray-800 dark:text-gray-200">{currentUser.role_type || 'Regular'}</span>
                                    </div>
                                    <div className="flex justify-between border-b pb-2 dark:border-gray-700">
                                        <span className="font-semibold text-gray-500">Actividad:</span> 
                                        <span className={`font-bold ${currentUser.activity_status === 'Activo' ? 'text-green-600' : 'text-red-600'}`}>
                                            {currentUser.activity_status || 'Activo'}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-gray-400 pt-1 text-center italic">Datos gestionados por Administración.</p>
                                </div>
                            </Card>
                        </>
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
                
                {/* Personal Info + Security Tabs - Right side */}
                <div className="lg:col-span-1 space-y-6">
                    <Card title="Configuración de Cuenta">
                         <div className="flex border-b mb-4">
                             <button onClick={() => setActiveTab('info')} className={`py-2 px-4 ${activeTab === 'info' ? 'border-b-2 border-primary-600 font-bold' : ''}`}>Información</button>
                             <button onClick={() => setActiveTab('security')} className={`py-2 px-4 ${activeTab === 'security' ? 'border-b-2 border-primary-600 font-bold' : ''}`}>Seguridad</button>
                         </div>
                         
                         {activeTab === 'info' ? (
                             <form onSubmit={handlePersonalInfoSubmit} className="space-y-4">
                                <div className="flex items-center space-x-4">
                                   <Avatar user={{ ...currentUser, avatar: avatarPreview || personalInfo.avatar }} className="w-20 h-20" />
                                   <input type="file" id="avatar-upload" className="hidden" onChange={handleAvatarChange} accept="image/*"/>
                                   <label htmlFor="avatar-upload" className="bg-gray-200 dark:bg-gray-600 px-3 py-2 rounded-md text-sm font-medium cursor-pointer">Cambiar Foto</label>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre y Apellidos</label>
                                        <input type="text" value={personalInfo.name} onChange={e => setPersonalInfo({...personalInfo, name: e.target.value})} className="w-full mt-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-primary-500 focus:border-primary-500"/>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Correo Electrónico</label>
                                        <input type="email" value={currentUser.email} readOnly className="w-full mt-1 p-2 border rounded-md bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 cursor-not-allowed"/>
                                    </div>
                                     <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Teléfono Principal</label>
                                        <input type="tel" value={personalInfo.phone} onChange={e => setPersonalInfo({...personalInfo, phone: e.target.value})} className="w-full mt-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-primary-500 focus:border-primary-500"/>
                                    </div>
                                     <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Teléfono Secundario</label>
                                        <input type="tel" value={personalInfo.secondary_phone} onChange={e => setPersonalInfo({...personalInfo, secondary_phone: e.target.value})} className="w-full mt-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-primary-500 focus:border-primary-500"/>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Dirección</label>
                                        <textarea value={personalInfo.address} onChange={e => setPersonalInfo({...personalInfo, address: e.target.value})} rows={2} className="w-full mt-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-primary-500 focus:border-primary-500"/>
                                    </div>
                                </div>
                                 <div className="text-right">
                                    <button type="submit" className="bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700">Guardar Cambios</button>
                                </div>
                             </form>
                         ) : (
                             <form onSubmit={handlePasswordSubmit} className="space-y-4">
                                 <div>
                                     <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Contraseña Actual</label>
                                     <input type="password" value={passwordInfo.currentPassword} onChange={e => setPasswordInfo({...passwordInfo, currentPassword: e.target.value})} className="w-full mt-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white" required={!!currentUser.password} />
                                 </div>
                                 <div>
                                     <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nueva Contraseña</label>
                                     <input type="password" value={passwordInfo.newPassword} onChange={e => setPasswordInfo({...passwordInfo, newPassword: e.target.value})} className="w-full mt-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                                 </div>
                                  <div>
                                     <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirmar Nueva Contraseña</label>
                                     <input type="password" value={passwordInfo.confirmPassword} onChange={e => setPasswordInfo({...passwordInfo, confirmPassword: e.target.value})} className="w-full mt-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                                 </div>
                                 <div className="text-right">
                                    <button type="submit" className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">Cambiar Contraseña</button>
                                </div>
                             </form>
                         )}
                    </Card>
                </div>
            </div>
        </div>
    );
};
