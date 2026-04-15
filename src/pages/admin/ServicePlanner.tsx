import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../../components/Card';
import { Modal } from '../../components/Modal';
import { ConfirmModal } from '../../components/ConfirmModal';
import { PlusIcon, TrashIcon, PencilIcon, UsersIcon, EventIcon } from '../../components/icons';
import { ServiceGroup, Service, User, Profile, ServiceRole } from '../../types';

const SERVICE_ROLES: ServiceRole[] = ['Cocina', 'Postres', 'Servicios (Sala)', 'Cafetería'];

// --- SERVICE GROUP MANAGEMENT ---
const ServiceGroupManager: React.FC = () => {
    const { service_groups, setServiceGroups, users, services, setServices } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<ServiceGroup | null>(null);
    const [confirmDeleteGroupId, setConfirmDeleteGroupId] = useState<string | null>(null);

    const teachers = useMemo(() => users.filter((u: User) => u.profiles.includes(Profile.TEACHER)), [users]);
    const usersMap = useMemo(() => new Map(users.map((u: User) => [u.id, u.name])), [users]);

    const handleSave = (groupData: Partial<ServiceGroup>) => {
        if (selectedGroup) {
            setServiceGroups(service_groups.map((g: ServiceGroup) => g.id === selectedGroup.id ? { ...g, ...groupData } as ServiceGroup : g));
        } else {
            const newGroup: ServiceGroup = { id: `sg-${Date.now()}`, name: groupData.name!, teacher_ids: groupData.teacher_ids!, roles: groupData.roles || {} };
            setServiceGroups([...service_groups, newGroup]);
        }
        setIsModalOpen(false);
    };

    const handleDelete = (groupId: string) => {
        setServices(services.filter((s: Service) => s.service_group_id !== groupId));
        setServiceGroups(service_groups.filter((g: ServiceGroup) => g.id !== groupId));
        setConfirmDeleteGroupId(null);
    };

    return (
        <div>
            <div className="flex justify-end mb-4">
                <button onClick={() => { setSelectedGroup(null); setIsModalOpen(true); }} className="bg-blue-500 text-white py-2 px-4 rounded-md flex items-center"><PlusIcon className="w-5 h-5 mr-1" /> Nuevo Grupo</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {service_groups.map((group: ServiceGroup) => (
                    <div key={group.id} className="p-4 border rounded-lg dark:border-gray-600">
                        <div className="flex justify-between items-start">
                            <h3 className="font-bold">{group.name}</h3>
                            <div className="space-x-2">
                                <button onClick={() => { setSelectedGroup(group); setIsModalOpen(true); }}><PencilIcon className="w-4 h-4 text-gray-500"/></button>
                                <button onClick={() => setConfirmDeleteGroupId(group.id)}><TrashIcon className="w-4 h-4 text-red-500"/></button>
                            </div>
                        </div>
                        <p className="text-sm font-semibold mt-2">Miembros:</p>
                        <ul className="text-sm list-disc list-inside">
                            {group.teacher_ids.map((id: string) => <li key={id}>{usersMap.get(id) || 'Desconocido'}</li>)}
                        </ul>
                         <p className="text-sm font-semibold mt-2">Roles:</p>
                        <ul className="text-xs">
                            {SERVICE_ROLES.map((role: ServiceRole) => (
                                <li key={role}><strong>{role}:</strong> {group.roles?.[role]?.map((id: string) => usersMap.get(id)).join(', ') || 'N/A'}</li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
            {isModalOpen && <ServiceGroupFormModal group={selectedGroup} teachers={teachers} onClose={() => setIsModalOpen(false)} onSave={handleSave} />}
            
            <ConfirmModal 
                isOpen={!!confirmDeleteGroupId}
                onClose={() => setConfirmDeleteGroupId(null)}
                onConfirm={() => confirmDeleteGroupId && handleDelete(confirmDeleteGroupId)}
                title="Eliminar Grupo"
                message="¿Seguro que quieres eliminar este grupo? También se eliminarán los servicios asociados."
                type="danger"
            />
        </div>
    );
};

const ServiceGroupFormModal: React.FC<{ group: ServiceGroup | null; teachers: User[]; onClose: () => void; onSave: (data: Partial<ServiceGroup>) => void; }> = ({ group, teachers, onClose, onSave }) => {
    const [name, setName] = useState(group?.name || '');
    const [teacher_ids, setTeacherIds] = useState<string[]>(group?.teacher_ids || []);
    const [roles, setRoles] = useState<Partial<Record<ServiceRole, string[]>>>(group?.roles || {});
    
    const teachersInGroup = useMemo(() => teachers.filter(t => teacher_ids.includes(t.id)), [teachers, teacher_ids]);

    const handleTeacherSelectionChange = (id: string) => {
        setTeacherIds(prev => {
            const newTeacherIds = prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id];
            
            // Also clean up roles if a teacher is removed
            if (!newTeacherIds.includes(id)) {
                const newRoles = { ...roles };
                for (const role in newRoles) {
                    newRoles[role as ServiceRole] = newRoles[role as ServiceRole]?.filter(teacherId => teacherId !== id);
                }
                setRoles(newRoles);
            }

            return newTeacherIds;
        });
    };
    
    const handleRoleSelectionChange = (role: ServiceRole, id: string) => {
        const currentSelection = roles[role] || [];
        const newSelection = currentSelection.includes(id)
            ? currentSelection.filter(tId => tId !== id)
            : [...currentSelection, id];
        setRoles(prev => ({...prev, [role]: newSelection}));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ name, teacher_ids, roles });
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={group ? 'Editar Grupo' : 'Nuevo Grupo de Servicio'} size="lg">
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del Grupo" required className="w-full p-2 border rounded dark:bg-gray-700"/>
                
                <div>
                    <label className="font-semibold">1. Selecciona los Miembros del Grupo:</label>
                    <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto p-2 border rounded dark:border-gray-600">
                        {teachers.map(t => (
                            <label key={t.id} className="flex items-center space-x-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md">
                                <input type="checkbox" checked={teacher_ids.includes(t.id)} onChange={() => handleTeacherSelectionChange(t.id)} className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                                <span>{t.name}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="font-semibold">2. Asigna Roles a los Miembros Seleccionados:</label>
                    {teachersInGroup.length > 0 ? (
                        <div className="space-y-3 mt-2">
                            {SERVICE_ROLES.map(role => (
                                <div key={role}>
                                    <p className="font-medium text-sm">{role}</p>
                                    <div className="grid grid-cols-2 gap-2 p-2 border rounded dark:border-gray-600">
                                        {teachersInGroup.map(t => (
                                             <label key={t.id} className="flex items-center space-x-2 text-sm p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md">
                                                <input type="checkbox" checked={roles[role]?.includes(t.id) || false} onChange={() => handleRoleSelectionChange(role, t.id)} className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"/>
                                                <span>{t.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : <p className="text-sm text-gray-500 mt-2">Selecciona al menos un miembro para asignar roles.</p>}
                </div>

                <div className="flex justify-end pt-4">
                    <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded">Guardar</button>
                </div>
            </form>
        </Modal>
    );
};


// --- SERVICE MANAGEMENT ---
const ServiceManager: React.FC = () => {
    const { services, setServices, service_groups } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [confirmDeleteServiceId, setConfirmDeleteServiceId] = useState<string | null>(null);

    const serviceGroupsMap = useMemo(() => new Map(service_groups.map((g: ServiceGroup) => [g.id, g.name])), [service_groups]);

    const handleSave = (serviceData: Partial<Service>) => {
        if (selectedService) {
            setServices(services.map((s: Service) => s.id === selectedService.id ? { ...s, ...serviceData } as Service : s));
        } else {
            const newService: Service = { id: `svc-${Date.now()}`, name: serviceData.name!, date: serviceData.date!, service_group_id: serviceData.service_group_id!, menu: [], roles: {}, status: 'Planificación' };
            setServices([...services, newService]);
        }
        setIsModalOpen(false);
    };

    const handleDelete = (serviceId: string) => {
        setServices(services.filter((s: Service) => s.id !== serviceId));
        setConfirmDeleteServiceId(null);
    };

    return (
        <div>
            <div className="flex justify-end mb-4">
                <button onClick={() => { setSelectedService(null); setIsModalOpen(true); }} className="bg-blue-500 text-white py-2 px-4 rounded-md flex items-center"><PlusIcon className="w-5 h-5 mr-1" /> Nuevo Servicio</button>
            </div>
            <table className="w-full text-sm">
                <thead><tr><th className="text-left p-2">Nombre</th><th className="text-left p-2">Fecha</th><th className="text-left p-2">Grupo Asignado</th><th className="text-left p-2">Acciones</th></tr></thead>
                <tbody>
                    {services.map((service: Service) => (
                        <tr key={service.id} className="border-t">
                            <td className="p-2">{service.name}</td>
                            <td className="p-2">{new Date(service.date).toLocaleDateString()}</td>
                            <td className="p-2">{serviceGroupsMap.get(service.service_group_id) || 'N/A'}</td>
                            <td className="p-2 space-x-2">
                                <button onClick={() => { setSelectedService(service); setIsModalOpen(true); }}><PencilIcon className="w-4 h-4 text-gray-500"/></button>
                                <button onClick={() => setConfirmDeleteServiceId(service.id)}><TrashIcon className="w-4 h-4 text-red-500"/></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {isModalOpen && <ServiceFormModal service={selectedService} serviceGroups={service_groups} onClose={() => setIsModalOpen(false)} onSave={handleSave} />}
            
            <ConfirmModal 
                isOpen={!!confirmDeleteServiceId}
                onClose={() => setConfirmDeleteServiceId(null)}
                onConfirm={() => confirmDeleteServiceId && handleDelete(confirmDeleteServiceId)}
                title="Eliminar Servicio"
                message="¿Seguro que quieres eliminar este servicio?"
                type="danger"
            />
        </div>
    );
};

const ServiceFormModal: React.FC<{ service: Service | null; serviceGroups: ServiceGroup[]; onClose: () => void; onSave: (data: Partial<Service>) => void; }> = ({ service, serviceGroups, onClose, onSave }) => {
    const [formState, setFormState] = useState({
        name: service?.name || '',
        date: service ? new Date(service.date).toISOString().substring(0, 10) : '',
        service_group_id: service?.service_group_id || '',
    });
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFormState({...formState, [e.target.name]: e.target.value});
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave({ ...formState, date: new Date(formState.date).toISOString() }); };

    return (
        <Modal isOpen={true} onClose={onClose} title={service ? 'Editar Servicio' : 'Nuevo Servicio'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" name="name" value={formState.name} onChange={handleChange} placeholder="Nombre del Servicio" required className="w-full p-2 border rounded"/>
                <input type="date" name="date" value={formState.date} onChange={handleChange} required className="w-full p-2 border rounded"/>
                <select name="service_group_id" value={formState.service_group_id} onChange={handleChange} required className="w-full p-2 border rounded">
                    <option value="">-- Asignar Grupo --</option>
                    {serviceGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                <div className="flex justify-end"><button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded">Guardar</button></div>
            </form>
        </Modal>
    );
};


// --- MAIN COMPONENT ---
export const ServicePlanner: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'groups' | 'services'>('groups');

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6">Planificación de Servicios</h1>
            <Card>
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                        <button onClick={() => setActiveTab('groups')} className={`${activeTab === 'groups' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} flex items-center whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}>
                            <UsersIcon className="w-5 h-5 mr-2" /> Grupos de Servicio
                        </button>
                        <button onClick={() => setActiveTab('services')} className={`${activeTab === 'services' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} flex items-center whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}>
                            <EventIcon className="w-5 h-5 mr-2" /> Servicios
                        </button>
                    </nav>
                </div>
                <div className="mt-4">
                    {activeTab === 'groups' && <ServiceGroupManager />}
                    {activeTab === 'services' && <ServiceManager />}
                </div>
            </Card>
        </div>
    );
};