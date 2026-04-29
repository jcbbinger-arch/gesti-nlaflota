import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useCompany } from '../../contexts/CompanyContext';
import { Card } from '../../components/Card';
import { Modal } from '../../components/Modal';
import { ConfirmModal } from '../../components/ConfirmModal';
import { PlusIcon, TrashIcon, PencilIcon, UsersIcon, EventIcon, UserPlusIcon } from '../../components/icons';
import { ServiceGroup, Service, User, Profile, ServiceRole, AppEvent, DiningService } from '../../types';
import { FamilyMealAssignmentModal } from '../../components/FamilyMealAssignmentModal';

const SERVICE_ROLES: ServiceRole[] = ['Cocina', 'Postres', 'Servicios (Sala)', 'Cafetería', 'Pan del servicio', 'Mignardises'];

// --- SERVICE GROUP MANAGEMENT ---
const ServiceGroupManager: React.FC = () => {
    const { service_groups, setServiceGroups, users, services, setServices, assignments, groups, modules } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<ServiceGroup | null>(null);
    const [confirmDeleteGroupId, setConfirmDeleteGroupId] = useState<string | null>(null);

    const teachers = useMemo(() => users.filter((u: User) => u.profiles.includes(Profile.TEACHER)), [users]);
    const usersMap = useMemo(() => new Map(users.map((u: User) => [u.id, u.name])), [users]);
    const groupsMap = useMemo(() => new Map(groups.map(g => [g.id, g])), [groups]);
    const modulesMap = useMemo(() => new Map(modules.map(m => [m.id, m])), [modules]);
    const assignmentsMap = useMemo(() => new Map(assignments.map(a => [a.id, a])), [assignments]);

    const getAssignmentDisplayName = (assignmentId: string) => {
        const assignment = assignmentsMap.get(assignmentId);
        if (!assignment) return 'N/A';
        const group = groupsMap.get(assignment.group_id);
        const module = modulesMap.get(assignment.module_id);
        return `${group?.name || 'N/A'} (${module?.name || 'N/A'})`;
    };

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

    const renderRoleList = (roleAssignments: string[] | undefined) => {
        if (!roleAssignments || roleAssignments.length === 0) return 'N/A';
        
        return roleAssignments.map(id => {
            // Check if it's an assignment ID or a legacy teacher ID
            const assignment = assignmentsMap.get(id);
            if (assignment) {
                const teacherName = usersMap.get(assignment.user_id) || 'Desconocido';
                return `${teacherName} [${getAssignmentDisplayName(id)}]`;
            }
            return usersMap.get(id) || 'Desconocido';
        }).join(', ');
    };

    return (
        <div>
            <div className="flex justify-end mb-4">
                <button onClick={() => { setSelectedGroup(null); setIsModalOpen(true); }} className="bg-blue-500 text-white py-2 px-4 rounded-md flex items-center"><PlusIcon className="w-5 h-5 mr-1" /> Nuevo Grupo</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {service_groups.map((group: ServiceGroup) => (
                    <div key={group.id} className="p-4 border rounded-lg dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm">
                        <div className="flex justify-between items-start">
                            <h3 className="font-bold text-lg">{group.name}</h3>
                            <div className="space-x-2">
                                <button onClick={() => { setSelectedGroup(group); setIsModalOpen(true); }} title="Editar"><PencilIcon className="w-4 h-4 text-gray-500 hover:text-blue-500"/></button>
                                <button onClick={() => setConfirmDeleteGroupId(group.id)} title="Eliminar"><TrashIcon className="w-4 h-4 text-red-500 hover:text-red-700"/></button>
                            </div>
                        </div>
                        <p className="text-sm font-semibold mt-3 text-gray-500 border-b pb-1 uppercase tracking-wider">Miembros:</p>
                        <ul className="text-sm list-disc list-inside mt-1 mb-3">
                            {group.teacher_ids.map((id: string) => <li key={id} className="text-gray-700 dark:text-gray-300">{usersMap.get(id) || 'Desconocido'}</li>)}
                        </ul>
                         <p className="text-sm font-semibold mt-3 text-gray-500 border-b pb-1 uppercase tracking-wider">Configuración de Roles:</p>
                        <ul className="text-xs space-y-1.5 mt-2">
                            {SERVICE_ROLES.map((role: ServiceRole) => (
                                <li key={role} className="flex flex-col">
                                    <span className="font-bold text-gray-600 dark:text-gray-400">{role}:</span>
                                    <span className="text-gray-800 dark:text-gray-200 ml-2">{renderRoleList(group.roles?.[role])}</span>
                                </li>
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
    const { assignments, setAssignments, groups, modules } = useData();
    const [name, setName] = useState(group?.name || '');
    const [teacher_ids, setTeacherIds] = useState<string[]>(group?.teacher_ids || []);
    const [roles, setRoles] = useState<Partial<Record<ServiceRole, string[]>>>(group?.roles || {});
    
    const teachersInGroup = useMemo(() => teachers.filter(t => teacher_ids.includes(t.id)), [teachers, teacher_ids]);

    const handleToggleTransfer = (assignmentId: string) => {
        setAssignments(prev => prev.map(a => 
            a.id === assignmentId ? { ...a, allow_transfers: !a.allow_transfers } : a
        ));
    };

    const getTeacherAssignments = (userId: string) => {
        return assignments.filter(a => a.user_id === userId);
    };

    const getAssignmentLabel = (assignmentId: string) => {
        const assignment = assignments.find(a => a.id === assignmentId);
        if (!assignment) return 'N/A';
        const group = groups.find(g => g.id === assignment.group_id);
        const module = modules.find(m => m.id === assignment.module_id);
        return `${group?.name || 'N/A'} - ${module?.name || 'N/A'}`;
    };

    const handleTeacherSelectionChange = (id: string) => {
        setTeacherIds(prev => {
            const newTeacherIds = prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id];
            
            // Also clean up roles if a teacher is removed
            if (!newTeacherIds.includes(id)) {
                const newRoles = { ...roles };
                for (const role in newRoles) {
                    // Filter out both teacher ID and any assignment IDs related to this teacher
                    newRoles[role as ServiceRole] = newRoles[role as ServiceRole]?.filter(val => {
                        const assignment = assignments.find(a => a.id === val);
                        return val !== id && (!assignment || assignment.user_id !== id);
                    });
                }
                setRoles(newRoles);
            }

            return newTeacherIds;
        });
    };
    
    const handleRoleSelectionChange = (role: ServiceRole, value: string, isChecked: boolean) => {
        const currentSelection = roles[role] || [];
        
        let newSelection: string[];
        if (isChecked) {
            newSelection = [...currentSelection, value];
        } else {
            newSelection = currentSelection.filter(v => v !== value);
        }
        
        setRoles(prev => ({...prev, [role]: newSelection}));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ name, teacher_ids, roles });
    };

    const isTeacherInRole = (role: ServiceRole, teacherId: string) => {
        const currentSelection = roles[role] || [];
        return currentSelection.some(val => {
            if (val === teacherId) return true;
            const assignment = assignments.find(a => a.id === val);
            return assignment && assignment.user_id === teacherId;
        });
    };

    const getAssignmentForTeacherInRole = (role: ServiceRole, teacherId: string) => {
        const currentSelection = roles[role] || [];
        return currentSelection.find(val => {
            const assignment = assignments.find(a => a.id === val);
            return assignment && assignment.user_id === teacherId;
        }) || "";
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={group ? 'Editar Grupo' : 'Nuevo Grupo de Servicio'} size="lg">
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del Grupo" required className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"/>
                
                <div>
                    <label className="font-semibold block mb-1">1. Selecciona los Miembros del Grupo:</label>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border rounded dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50">
                        {teachers.map(t => (
                            <label key={t.id} className="flex items-center space-x-2 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md cursor-pointer transition-colors">
                                <input type="checkbox" checked={teacher_ids.includes(t.id)} onChange={() => handleTeacherSelectionChange(t.id)} className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                                <span className="text-sm">{t.name}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="space-y-4 pt-2">
                    <label className="font-semibold block">2. Asigna Roles y Contextos (Grupos/Módulos):</label>
                    {teachersInGroup.length > 0 ? (
                        <div className="max-h-[50vh] overflow-y-auto pr-2 space-y-4">
                            {SERVICE_ROLES.map(role => (
                                <div key={role} className="p-3 border rounded-lg dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm">
                                    <p className="font-bold text-sm mb-3 text-primary-600 dark:text-primary-400 uppercase tracking-tight border-b pb-1">{role}</p>
                                    <div className="space-y-2">
                                        {teachersInGroup.map(t => {
                                            const teacherAssignments = getTeacherAssignments(t.id);
                                            const isSelected = isTeacherInRole(role, t.id);
                                            const selectedAssignmentId = getAssignmentForTeacherInRole(role, t.id);

                                            return (
                                                <div key={t.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                    <label className="flex items-center space-x-2 text-sm cursor-pointer min-w-[150px]">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={isSelected} 
                                                            onChange={(e) => {
                                                                const checked = e.target.checked;
                                                                // When checking, if they have assignments, we should probably pick the first one by default
                                                                const val = teacherAssignments.length > 0 ? teacherAssignments[0].id : t.id;
                                                                handleRoleSelectionChange(role, checked ? val : (selectedAssignmentId || t.id), checked);
                                                            }} 
                                                            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                                        />
                                                        <span className={isSelected ? "font-bold" : ""}>{t.name}</span>
                                                    </label>
                                                    
                                                    {isSelected && teacherAssignments.length > 0 && (
                                                        <div className="flex items-center space-x-2">
                                                            <select 
                                                                value={selectedAssignmentId} 
                                                                onChange={(e) => {
                                                                    const oldVal = selectedAssignmentId || t.id;
                                                                    const newVal = e.target.value;
                                                                    
                                                                    setRoles(prev => {
                                                                        const currentRoleSelection = prev[role] || [];
                                                                        const newRoleSelection = currentRoleSelection.map(v => v === oldVal ? newVal : v);
                                                                        return { ...prev, [role]: newRoleSelection };
                                                                    });
                                                                }}
                                                                className="text-xs p-1 border rounded bg-white dark:bg-gray-700 w-full sm:w-auto"
                                                            >
                                                                {teacherAssignments.map(a => (
                                                                    <option key={a.id} value={a.id}>{getAssignmentLabel(a.id)}</option>
                                                                ))}
                                                            </select>
                                                            
                                                            {selectedAssignmentId && (
                                                                <label className="flex items-center space-x-1 px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded border border-indigo-100 dark:border-indigo-800 cursor-pointer hover:bg-indigo-100 transition-colors" title="Marcar como módulo de producción para realizar traspasos">
                                                                    <input 
                                                                        type="checkbox"
                                                                        checked={assignments.find(a => a.id === selectedAssignmentId)?.allow_transfers || false}
                                                                        onChange={() => handleToggleTransfer(selectedAssignmentId)}
                                                                        className="h-3 w-3 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                                                                    />
                                                                    <span className="text-[9px] font-bold uppercase">Traspasos</span>
                                                                </label>
                                                            )}
                                                        </div>
                                                    )}
                                                    
                                                    {isSelected && teacherAssignments.length === 0 && (
                                                        <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded italic">Sin grupos asignados</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center border-2 border-dashed rounded-lg text-gray-400">
                             Selecciona miembros arriba para asignarles roles en este grupo.
                        </div>
                    )}
                </div>

                <div className="flex justify-end pt-4 border-t">
                    <button type="button" onClick={onClose} className="mr-2 px-4 py-2 text-gray-600 hover:text-gray-800">Cancelar</button>
                    <button type="submit" className="bg-primary-600 text-white px-6 py-2 rounded-md font-bold shadow-md hover:bg-primary-700 transition-all">Guardar Configuración</button>
                </div>
            </form>
        </Modal>
    );
};


// --- SERVICE MANAGEMENT ---
const ServiceManager: React.FC = () => {
    const { services, setServices, service_groups, events, setEvents, assignments, dining_services } = useData();
    const navigate = useNavigate();
    const { companyInfo } = useCompany();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [assigningDiningServiceId, setAssigningDiningServiceId] = useState<string | null>(null);
    const [confirmDeleteServiceId, setConfirmDeleteServiceId] = useState<string | null>(null);

    const serviceGroupsMap = useMemo(() => new Map(service_groups.map((g: ServiceGroup) => [g.id, g.name])), [service_groups]);

    const calculateEventDates = (serviceDateStr: string) => {
        const serviceDate = new Date(serviceDateStr);
        // Monday of the week of the service
        const serviceWeekMonday = new Date(serviceDate);
        serviceWeekMonday.setDate(serviceDate.getDate() - (serviceDate.getDay() + 6) % 7);

        // Closing date: Monday of the previous week at 23:59:59
        const closingDate = new Date(serviceWeekMonday);
        closingDate.setDate(serviceWeekMonday.getDate() - 7);
        closingDate.setHours(23, 59, 59, 999);

        // Opening date: Tuesday of the week two weeks before the closing date
        const openingDate = new Date(closingDate);
        openingDate.setDate(closingDate.getDate() - 13);
        openingDate.setHours(0, 0, 0, 0);

        return { openingDate, closingDate };
    };

    const formatEventName = (serviceName: string, dateStr: string) => {
        const date = new Date(dateStr);
        const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
        return `${serviceName} - ${date.toLocaleDateString('es-ES', options)}`;
    };

    const handleSave = (serviceData: Partial<Service>) => {
        const { openingDate, closingDate } = calculateEventDates(serviceData.date!);
        const eventName = formatEventName(serviceData.name!, serviceData.date!);
        
        // Find teachers for authorized_teachers (only those with assigned roles in the group)
        const group = service_groups.find(g => g.id === (serviceData.service_group_id || selectedService?.service_group_id));
        const authorizedTeacherIds = Array.from(new Set(
            Object.values(group?.roles || {}).flat().map(id => {
                const assignment = assignments.find(a => a.id === id);
                return assignment ? assignment.user_id : id;
            })
        )).filter(id => !!id);

        if (selectedService) {
            // Update Service
            const updatedService = { ...selectedService, ...serviceData } as Service;
            setServices(services.map((s: Service) => s.id === selectedService.id ? updatedService : s));

            // Update associated Event if it exists
            if (updatedService.event_id) {
                setEvents(events.map(e => e.id === updatedService.event_id ? {
                    ...e,
                    name: eventName,
                    start_date: openingDate.toISOString(),
                    end_date: closingDate.toISOString(),
                    authorized_teachers: authorizedTeacherIds
                } : e));
            }
        } else {
            // Create new Event
            const eventId = `evt-svc-${Date.now()}`;
            const newEvent: AppEvent = {
                id: eventId,
                name: eventName,
                type: 'Servicio',
                start_date: openingDate.toISOString(),
                end_date: closingDate.toISOString(),
                budget_per_teacher: companyInfo.default_budget || 300,
                status: 'Activo',
                authorized_teachers: authorizedTeacherIds
            };
            setEvents([...events, newEvent]);

            // Create new Service
            const newService: Service = { 
                id: `svc-${Date.now()}`, 
                name: serviceData.name!, 
                date: serviceData.date!, 
                service_group_id: serviceData.service_group_id!, 
                menu: [], 
                roles: {}, 
                status: 'Planificación',
                event_id: eventId
            };
            setServices([...services, newService]);
        }
        setIsModalOpen(false);
    };

    const handleDelete = (serviceId: string) => {
        const serviceToDelete = services.find(s => s.id === serviceId);
        
        // Remove associated event
        if (serviceToDelete?.event_id) {
            setEvents(events.filter(e => e.id !== serviceToDelete.event_id));
        }
        
        // Remove service
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
                                <button onClick={() => { setSelectedService(service); setIsModalOpen(true); }} title="Editar"><PencilIcon className="w-4 h-4 text-gray-500 hover:text-blue-500"/></button>
                                {(() => {
                                    const ds = dining_services.find(d => d.service_id === service.id);
                                    return (
                                        <button 
                                            onClick={() => {
                                                if (ds) {
                                                    setAssigningDiningServiceId(ds.id);
                                                } else {
                                                    alert('Aún no se ha habilitado el servicio de comedor para este servicio escolar. Debes habilitarlo primero en "Gestión de Comedor" para gestionar la comida de familia.');
                                                }
                                            }}
                                            className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded border uppercase transition-colors ${(ds?.family_meal_authorized_teachers?.length || 0) > 0 ? 'text-green-700 bg-green-50 border-green-200 hover:text-green-800' : 'text-indigo-600 hover:text-indigo-800 bg-indigo-50 border-indigo-100'}`}
                                            title="Asignar Responsables Comida de Familia"
                                        >
                                            <UserPlusIcon className="w-3 h-3 mr-1" /> 
                                            {(ds?.family_meal_authorized_teachers?.length || 0) > 0 ? 'Familia Asignada' : 'Sin Asignar (Familia)'}
                                        </button>
                                    );
                                })()}
                                <button onClick={() => setConfirmDeleteServiceId(service.id)} title="Eliminar"><TrashIcon className="w-4 h-4 text-red-500 hover:text-red-700"/></button>
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
            
            {assigningDiningServiceId && (
                <FamilyMealAssignmentModal 
                    isOpen={!!assigningDiningServiceId} 
                    onClose={() => setAssigningDiningServiceId(null)} 
                    diningServiceId={assigningDiningServiceId} 
                />
            )}
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