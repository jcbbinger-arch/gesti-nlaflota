import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { Card } from '../../components/Card';
import { Modal } from '../../components/Modal';
import { PlusIcon, TrashIcon, WarningIcon, DownloadIcon, UserPlusIcon } from '../../components/icons';
import { AppEvent, User, Profile, Service, DiningService } from '../../types';
import { exportToCsv, printPage } from '../../utils/export';
import { FamilyMealAssignmentModal } from '../../components/FamilyMealAssignmentModal';
// Fix: Added missing import for useCompany hook.
import { useCompany } from '../../contexts/CompanyContext';

const spanishMonths = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const PRESET_COLORS = [
    { name: 'Azul', value: '#3b82f6' },
    { name: 'Verde', value: '#22c55e' },
    { name: 'Naranja', value: '#f97316' },
    { name: 'Rojo', value: '#ef4444' },
    { name: 'Púrpura', value: '#a855f7' },
    { name: 'Rosa', value: '#ec4899' },
    { name: 'Amarillo', value: '#eab308' },
    { name: 'Gris', value: '#6b7280' }
];

const getEventStatus = (event: AppEvent) => {
    const now = new Date();
    const startDate = new Date(event.start_date);
    const endDate = new Date(event.end_date);
    
    if (event.status === 'Inactivo') return { text: 'Inactivo', color: 'bg-gray-200 text-gray-800' };
    if (now > endDate) return { text: 'Cerrado', color: 'bg-red-200 text-red-800' };
    if (now >= startDate && now <= endDate) return { text: 'Activo', color: 'bg-green-200 text-green-800' };
    if (now < startDate) return { text: 'Programado', color: 'bg-blue-200 text-blue-800' };
    return { text: 'Desconocido', color: 'bg-gray-200 text-gray-800' };
}

export const EventManager: React.FC = () => {
    const { events, setEvents, users, services, setServices, service_groups, academic_years, selectedYearId, dining_services } = useData();
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);
    const [assigningDiningServiceId, setAssigningDiningServiceId] = useState<string | null>(null);
    const [deleteStep, setDeleteStep] = useState(1);
    const { companyInfo } = useCompany();

    const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');

    const teachers = useMemo(() => users.filter(u => u.profiles.includes(Profile.TEACHER)), [users]);
    
    // Automatic event generation and Service sync logic
    useEffect(() => {
        // Wait for data to be loaded
        if (services.length === 0 && events.length === 0) return;

        const activeYearId = academic_years.find(y => y.is_active)?.id;

        const syncAndGenerateEvents = async () => {
            if (!activeYearId) return;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const serviceEventsToCreate: AppEvent[] = [];
            const serviceEventsToUpdate: AppEvent[] = [];
            const updatedServices = [...services];
            let servicesNeededUpdate = false;
            let eventsNeededUpdate = false;

            services.forEach((service, index) => {
                // Find existing event
                const existingEvent = events.find(e => 
                    (service.event_id && e.id === service.event_id) || 
                    (e.type === 'Servicio' && (e.id === service.event_id || e.name.includes(service.name)))
                );
                
                // Calculate authorized teachers
                const serviceGroup = service_groups.find(g => g.id === service.service_group_id);
                const groupTeachers = serviceGroup ? serviceGroup.teacher_ids : [];
                const roleTeachers = Object.values(service.roles || {}).filter(uid => !!uid) as string[];
                const authorizedTeachers = Array.from(new Set([...groupTeachers, ...roleTeachers]));

                if (!existingEvent) {
                    const eventId = service.event_id || `evt-svc-sync-${service.id}-${Date.now()}`;
                    
                    const calculateEventDates = (serviceDateStr: string) => {
                        const serviceDate = new Date(serviceDateStr);
                        const serviceWeekMonday = new Date(serviceDate);
                        serviceWeekMonday.setDate(serviceDate.getDate() - (serviceDate.getDay() + 6) % 7);
                        const closingDate = new Date(serviceWeekMonday);
                        closingDate.setDate(serviceWeekMonday.getDate() - 7);
                        closingDate.setHours(23, 59, 59, 999);
                        const openingDate = new Date(closingDate);
                        openingDate.setDate(closingDate.getDate() - 5);
                        openingDate.setHours(0, 0, 0, 0);
                        return { openingDate, closingDate };
                    };

                    const { openingDate, closingDate } = calculateEventDates(service.date);
                    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
                    const eventName = `${service.name} - ${new Date(service.date).toLocaleDateString('es-ES', options)}`;

                    const newEvent: AppEvent = {
                        id: eventId,
                        name: eventName,
                        type: 'Servicio',
                        start_date: openingDate.toISOString(),
                        end_date: closingDate.toISOString(),
                        budget_per_teacher: companyInfo.default_budget || 300,
                        status: 'Activo',
                        authorized_teachers: authorizedTeachers,
                        color: PRESET_COLORS[1].value, // Green for Service
                        academic_year_id: activeYearId
                    };
                    
                    serviceEventsToCreate.push(newEvent);
                    
                    if (!service.event_id) {
                        updatedServices[index] = { ...service, event_id: eventId };
                        servicesNeededUpdate = true;
                    }
                } else {
                    // Check if authorized teachers match
                    const currentAuth = existingEvent.authorized_teachers || [];
                    const needsUpdate = authorizedTeachers.length !== currentAuth.length || 
                                      !authorizedTeachers.every(id => currentAuth.includes(id));
                    
                    if (needsUpdate) {
                        serviceEventsToUpdate.push({
                            ...existingEvent,
                            authorized_teachers: authorizedTeachers
                        });
                        eventsNeededUpdate = true;
                    }
                }
            });

            // 2. Generate Regular Weekly Events (Next 8 weeks)
            const generatedRegularEvents: AppEvent[] = [];
            for (let i = 0; i < 8; i++) {
                const targetDate = new Date(today);
                targetDate.setDate(today.getDate() + (i * 7));

                const monthName = spanishMonths[targetDate.getMonth()];
                const weekOfMonth = Math.ceil(targetDate.getDate() / 7);
                const eventName = `R - ${monthName} - semana ${weekOfMonth}`;

                const year = targetDate.getFullYear();
                const weekOfYear = Math.ceil((((targetDate.getTime() - new Date(year, 0, 1).getTime()) / 86400000) + new Date(year, 0, 1).getDay() + 1) / 7);

                // Use a more inclusive check for regular events to avoid duplicates
                const eventExists = events.some(e => 
                    (e.type === 'Regular' && e.name.toLowerCase().includes(`${monthName.toLowerCase()}`) && e.name.toLowerCase().includes(`semana ${weekOfMonth}`)) ||
                    (e.id === `evt-auto-${year}-${weekOfYear}`)
                );

                if (!eventExists) {
                    const eventWeekMonday = new Date(targetDate);
                    eventWeekMonday.setDate(targetDate.getDate() - (targetDate.getDay() + 6) % 7);
                    
                    const orderCloseDate = new Date(eventWeekMonday);
                    orderCloseDate.setDate(eventWeekMonday.getDate() - 7);
                    orderCloseDate.setHours(23, 59, 59, 999);

                    const orderOpenDate = new Date(orderCloseDate);
                    orderOpenDate.setDate(orderCloseDate.getDate() - 5);

                    generatedRegularEvents.push({
                        id: `evt-auto-${year}-${weekOfYear}`,
                        name: eventName,
                        type: 'Regular',
                        start_date: orderOpenDate.toISOString(),
                        end_date: orderCloseDate.toISOString(),
                        budget_per_teacher: companyInfo.default_budget || 300,
                        status: 'Activo',
                        authorized_teachers: [],
                        color: PRESET_COLORS[0].value, // Blue for Regular
                        academic_year_id: activeYearId
                    });
                }
            }

            if (serviceEventsToCreate.length > 0 || serviceEventsToUpdate.length > 0 || generatedRegularEvents.length > 0) {
                console.log(`[EventManager] Syncing ${serviceEventsToCreate.length} new, ${serviceEventsToUpdate.length} updated service events and ${generatedRegularEvents.length} regular events`);
                setEvents((prevEvents: AppEvent[]) => {
                    // Start with filtered previous events (remove those that are being updated)
                    const filteredPrev = prevEvents.filter(e => !serviceEventsToUpdate.some(ue => ue.id === e.id));
                    const existingIds = new Set(filteredPrev.map(e => e.id));
                    
                    const newEvents = [...serviceEventsToCreate, ...generatedRegularEvents].filter(ne => !existingIds.has(ne.id));
                    
                    if (newEvents.length === 0 && serviceEventsToUpdate.length === 0) return prevEvents;
                    return [...filteredPrev, ...newEvents, ...serviceEventsToUpdate];
                });
            }
            
            if (servicesNeededUpdate) {
                console.log('[EventManager] Updating services with linked event IDs');
                setServices((prevServices: Service[]) => {
                    return prevServices.map(ps => {
                        const updated = updatedServices.find(us => us.id === ps.id);
                        return updated || ps;
                    });
                });
            }
        };

        syncAndGenerateEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [services.length, events.length]); 


    const handleOpenModal = (event: AppEvent | null = null) => {
        setSelectedEvent(event);
        setIsModalOpen(true);
    };

    const handleSaveEvent = (event: AppEvent) => {
        if (selectedEvent) {
            setEvents(events.map(e => (e.id === event.id ? event : e)));
            
            // If it's a Service event, update the linked service name/date if needed
            if (event.type === 'Servicio') {
                const linkedService = services.find(s => s.event_id === event.id);
                if (linkedService) {
                    // Extract name before the " - date" part if possible, or just keep it synced
                    // Actually, the user wants the name to be "ServiceName - Date"
                    // If they edited the name in EventManager, we might want to update the Service name
                    // But simpler is to keep the dates in sync.
                    const dateVal = new Date(event.end_date); 
                    // Note: Event end_date for Services is the closing date of orders.
                    // The actual service date is usually a week later.
                    // This might be confusing if edited here. 
                    // For now, let's just sync the collection.
                    setServices(services.map(s => s.event_id === event.id ? { ...s, name: event.name.split(' - ')[0] } : s));
                }
            }
        } else {
            const eventId = `evt-${Date.now()}`;
            setEvents([...events, { ...event, id: eventId }]);

            // If a Service event is created manually, create a linked Service
            if (event.type === 'Servicio') {
                const newService: Service = {
                    id: `svc-${Date.now()}`,
                    name: event.name.split(' - ')[0],
                    date: new Date(new Date(event.end_date).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Default to 1 week after closing
                    service_group_id: '', // Admin will need to assign a group later
                    menu: [],
                    roles: {},
                    status: 'Planificación',
                    event_id: eventId
                };
                setServices([...services, newService]);
            }
        }
        setIsModalOpen(false);
        setSelectedEvent(null);
    };

    const handleOpenDeleteModal = (event: AppEvent) => {
        setSelectedEvent(event);
        setDeleteStep(1);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteEvent = () => {
        if (selectedEvent) {
            // If it's a Service event, delete the linked service
            if (selectedEvent.type === 'Servicio') {
                setServices(services.filter(s => s.event_id !== selectedEvent.id));
            }
            setEvents(events.filter(e => e.id !== selectedEvent.id));
        }
        setIsDeleteModalOpen(false);
        setSelectedEvent(null);
    };
    
    const handleExport = () => {
        const dataToExport = events.map(event => {
            const status = getEventStatus(event);
            return {
                Nombre: event.name,
                Tipo: event.type,
                Inicio: new Date(event.start_date).toLocaleString(),
                Fin: new Date(event.end_date).toLocaleString(),
                Presupuesto: event.budget_per_teacher,
                Estado: status.text,
                Profesores_Autorizados: event.type === 'Extraordinario' 
                    ? event.authorized_teachers?.map(id => teachers.find(t => t.id === id)?.name).join(', ') || 'Todos'
                    : 'Todos'
            }
        });
        exportToCsv('eventos.csv', dataToExport);
    }

    const { activeEvents, pastEvents } = useMemo(() => {
        const now = new Date();
        const active: AppEvent[] = [];
        const past: AppEvent[] = [];

        events.forEach(event => {
            const endDate = new Date(event.end_date);
            if (now > endDate && event.status !== 'Inactivo') {
                past.push(event);
            } else {
                active.push(event);
            }
        });

        return {
            activeEvents: active.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()),
            pastEvents: past.sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime())
        };
    }, [events]);

    const displayEvents = activeTab === 'active' ? activeEvents : pastEvents;

    const getRowBgColor = (type: string) => {
        switch (type) {
            case 'Regular': return 'bg-blue-50/50 dark:bg-blue-900/10';
            case 'Extraordinario': return 'bg-red-50/50 dark:bg-red-900/10';
            case 'Servicio': return 'bg-green-50/50 dark:bg-green-900/10';
            default: return '';
        }
    };

    const currentDateString = new Date().toLocaleDateString('es-ES', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
    }).toUpperCase();

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div className="flex items-baseline gap-4">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Gestión de Eventos</h1>
                    <span className="text-sm font-bold text-primary-600 bg-primary-50 px-3 py-1 rounded-full border border-primary-100 hidden lg:block">
                        HOY: {currentDateString}
                    </span>
                </div>
                <div className="no-print flex flex-wrap items-center gap-2">
                     <button onClick={handleExport} className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 flex items-center">
                        <DownloadIcon className="w-5 h-5 mr-1" /> Exportar CSV
                     </button>
                      <button onClick={printPage} className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 flex items-center">
                        Imprimir Lista
                     </button>
                    <button onClick={() => handleOpenModal()} className="bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 flex items-center">
                        <PlusIcon className="w-5 h-5 mr-1" /> Crear Evento Manual
                    </button>
                </div>
            </div>
            
            <Card noPadding>
                <div className="border-b dark:border-gray-700 no-print">
                    <div className="flex">
                        <button 
                            onClick={() => setActiveTab('active')}
                            className={`px-6 py-4 text-sm font-bold transition-colors ${activeTab === 'active' ? 'border-b-2 border-primary-600 text-primary-600 bg-primary-50/30' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            ACTIVOS / PRÓXIMOS ({activeEvents.length})
                        </button>
                        <button 
                            onClick={() => setActiveTab('past')}
                            className={`px-6 py-4 text-sm font-bold transition-colors ${activeTab === 'past' ? 'border-b-2 border-primary-600 text-primary-600 bg-primary-50/30' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            HISTORIAL / PASADOS ({pastEvents.length})
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto p-4">
                    <table className="w-full">
                        <thead className="text-[11px] text-gray-500 uppercase bg-gray-50/50 dark:bg-gray-800/50 sticky top-0">
                            <tr>
                                <th className="px-4 py-3 text-left font-bold tracking-wider">Nombre</th>
                                <th className="px-4 py-3 text-left font-bold tracking-wider">Tipo</th>
                                <th className="px-4 py-3 text-left font-bold tracking-wider">Fecha Apertura</th>
                                <th className="px-4 py-3 text-left font-bold tracking-wider">Cierre Real</th>
                                <th className="px-4 py-3 text-left font-bold tracking-wider">Presupuesto</th>
                                <th className="px-4 py-3 text-left font-bold tracking-wider">Estado</th>
                                <th className="px-4 py-3 text-right font-bold tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayEvents.map(event => {
                                const status = getEventStatus(event);
                                const bgClass = getRowBgColor(event.type);
                                return (
                                <tr key={event.id} className={`border-b dark:border-gray-700 transition-colors ${bgClass} hover:opacity-90 group`}>
                                    <td className="px-4 py-3 font-semibold">
                                        <div className="flex items-center">
                                            <div 
                                                className="w-3 h-3 rounded-full mr-3 shadow-sm border border-black/5" 
                                                style={{ backgroundColor: event.color || '#6b7280' }}
                                            />
                                            {event.name}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                            event.type === 'Servicio' ? 'border-green-200 text-green-700 bg-green-50' : 
                                            event.type === 'Regular' ? 'border-blue-200 text-blue-700 bg-blue-50' : 
                                            'border-purple-200 text-purple-700 bg-purple-50'
                                        }`}>
                                            {event.type.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm font-mono">{new Date(event.start_date).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                                    <td className="px-4 py-3 text-sm font-mono">{new Date(event.end_date).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                                    <td className="px-4 py-3 text-sm font-bold text-primary-700">{event.budget_per_teacher.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider ${status.color}`}>
                                            {status.text}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 no-print text-right">
                                        <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {event.type === 'Servicio' && (
                                                <button 
                                                    onClick={() => {
                                                        const linkedService = services.find(s => s.event_id === event.id);
                                                        const ds = dining_services.find(d => d.service_id === linkedService?.id);
                                                        if (ds) {
                                                            setAssigningDiningServiceId(ds.id);
                                                        } else {
                                                            alert('Este servicio de planificación aún no tiene un servicio de comedor configurado.');
                                                        }
                                                    }}
                                                    className={`font-bold text-xs uppercase underline flex items-center ${
                                                        (() => {
                                                            const linkedService = services.find(s => s.event_id === event.id);
                                                            const ds = dining_services.find(d => d.service_id === linkedService?.id);
                                                            return (ds?.family_meal_authorized_teachers?.length || 0) > 0 
                                                                ? 'text-green-600 hover:text-green-800' 
                                                                : 'text-indigo-600 hover:text-indigo-800';
                                                        })()
                                                    }`}
                                                >
                                                    <UserPlusIcon className="w-3.5 h-3.5 mr-1" /> 
                                                    {(() => {
                                                        const linkedService = services.find(s => s.event_id === event.id);
                                                        const ds = dining_services.find(d => d.service_id === linkedService?.id);
                                                        return (ds?.family_meal_authorized_teachers?.length || 0) > 0 
                                                            ? 'Familia Asignada' 
                                                            : 'Sin Asignar (Familia)';
                                                    })()}
                                                </button>
                                            )}
                                            <button onClick={() => handleOpenModal(event)} className="text-primary-600 hover:text-primary-800 font-bold text-xs uppercase underline">Editar</button>
                                            <button onClick={() => handleOpenDeleteModal(event)} className="text-red-600 hover:text-red-800 font-bold text-xs uppercase underline">Eliminar</button>
                                        </div>
                                    </td>
                                </tr>
                            )})}
                            {displayEvents.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500 italic">No hay eventos para mostrar en esta sección.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
            
            {isModalOpen && <EventFormModal event={selectedEvent} onClose={() => setIsModalOpen(false)} onSave={handleSaveEvent} teachers={teachers} />}
            
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirmar Eliminación">
                {deleteStep === 1 ? (
                    <div>
                        <div className="text-center">
                            <WarningIcon className="w-16 h-16 text-red-500 mx-auto"/>
                            <p className="text-lg font-semibold my-4">¿Seguro que quieres eliminar el evento {selectedEvent?.name}?</p>
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
                             <button onClick={handleDeleteEvent} className="w-full px-4 py-2 bg-red-600 text-white rounded-md">Confirmar Eliminación Permanente</button>
                        </div>
                    </div>
                )}
            </Modal>
            
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

const MultiSelectTeachers: React.FC<{ teachers: User[], selected: string[], onChange: (selected: string[]) => void }> = ({ teachers, selected, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const handleToggle = (teacherId: string) => {
        const newSelection = selected.includes(teacherId)
            ? selected.filter(id => id !== teacherId)
            : [...selected, teacherId];
        onChange(newSelection);
    };
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownRef]);


    return (
        <div className="relative" ref={dropdownRef}>
            <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full p-2 border rounded-md dark:bg-gray-700 text-left">
                {selected.length > 0 ? `${selected.length} profesor(es) seleccionado(s)` : 'Todos los profesores'}
            </button>
            {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {teachers.map(teacher => (
                        <label key={teacher.id} className="flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600">
                            <input
                                type="checkbox"
                                checked={selected.includes(teacher.id)}
                                onChange={() => handleToggle(teacher.id)}
                                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="ml-3">{teacher.name}</span>
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
};

const EventFormModal: React.FC<{ event: AppEvent | null; onClose: () => void; onSave: (event: AppEvent) => void; teachers: User[] }> = ({ event, onClose, onSave, teachers }) => {
    const { companyInfo } = useCompany();
    const { academic_years, selectedYearId } = useData();
    const [formState, setFormState] = useState<AppEvent>(event || { 
        id: '', name: '', type: 'Regular', 
        start_date: new Date().toISOString(), 
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), 
        budget_per_teacher: companyInfo.default_budget || 300, 
        authorized_teachers: [],
        status: 'Activo',
        color: PRESET_COLORS[0].value,
        academic_year_id: selectedYearId || academic_years.find(y => y.is_active)?.id || ''
    });

    const [eventDateStr, setEventDateStr] = useState<string>('');

    const calculateDates = () => {
        if(eventDateStr) {
            const evDate = new Date(eventDateStr);
            if(!isNaN(evDate.getTime())) {
                const closeDate = new Date(evDate);
                const day = closeDate.getDay();
                const diffToMonday = closeDate.getDate() - day + (day === 0 ? -6 : 1);
                closeDate.setDate(diffToMonday - 7);
                closeDate.setHours(23, 59, 59, 999);
                
                const openDate = new Date(closeDate);
                openDate.setDate(openDate.getDate() - 5);
                openDate.setHours(0, 0, 0, 0);

                setFormState(prev => ({
                    ...prev,
                    start_date: openDate.toISOString(),
                    end_date: closeDate.toISOString()
                }));
            }
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormState({ ...formState, [name]: type === 'number' ? parseFloat(value) || 0 : value });
    };
    
    const handleAuthTeacherChange = (selection: string[]) => {
        setFormState({...formState, authorized_teachers: selection});
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formState);
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={event ? 'Editar Evento' : 'Nuevo Evento Manual'} size="lg">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium">Nombre</label>
                    <input type="text" name="name" value={formState.name} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600" />
                </div>
                <div>
                    <label className="block text-sm font-medium">Tipo de Evento</label>
                    <select name="type" value={formState.type} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600">
                        <option value="Regular">Regular</option>
                        <option value="Extraordinario">Extraordinario</option>
                        <option value="Servicio">Servicio</option>
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label>Curso Académico</label>
                        <select name="academic_year_id" value={formState.academic_year_id} onChange={handleChange} disabled className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 cursor-not-allowed">
                            {academic_years.map(y => (
                                <option key={y.id} value={y.id}>{y.name}</option>
                            ))}
                            {academic_years.length === 0 && <option value="">Curso actual</option>}
                        </select>
                        <p className="text-[10px] text-gray-500 mt-1">Se vincula automáticamente al curso actual.</p>
                    </div>
                    <div>
                        <label>Estado</label>
                        <select name="status" value={formState.status} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600">
                            <option value="Activo">Activo</option>
                            <option value="Inactivo">Inactivo</option>
                        </select>
                    </div>
                </div>

                {formState.type === 'Extraordinario' && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md border border-blue-100 dark:border-blue-800">
                         <label className="block text-sm font-medium mb-1 text-blue-800 dark:text-blue-300">Calcular fechas desde el día del evento</label>
                         <div className="flex space-x-2">
                             <input type="date" value={eventDateStr} onChange={e => setEventDateStr(e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700" />
                             <button type="button" onClick={calculateDates} className="bg-blue-600 text-white px-4 py-2 rounded">Calcular</button>
                         </div>
                         <p className="text-xs mt-1 text-blue-600">Calcula automático: Cierre el lunes de la semana anterior al evento, Apertura 5 días antes del cierre.</p>
                    </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label>Fecha Inicio</label>
                        <input type="datetime-local" name="start_date" value={formState.start_date.substring(0, 16)} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600" />
                    </div>
                    <div>
                        <label>Fecha Fin</label>
                        <input type="datetime-local" name="end_date" value={formState.end_date.substring(0, 16)} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600" />
                    </div>
                </div>
                <div>
                    <label>Presupuesto por Profesor (€)</label>
                    <input type="number" name="budget_per_teacher" value={formState.budget_per_teacher} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600" />
                </div>
                { (formState.type === 'Extraordinario' || formState.type === 'Servicio') && (
                     <div>
                        <label>Profesores Autorizados (dejar vacío para todos)</label>
                        <MultiSelectTeachers teachers={teachers} selected={formState.authorized_teachers || []} onChange={handleAuthTeacherChange} />
                    </div>
                )}
                
                <div>
                    <label className="block text-sm font-medium mb-1">Color del Evento</label>
                    <div className="flex flex-wrap gap-2">
                        {PRESET_COLORS.map(color => (
                            <button
                                key={color.value}
                                type="button"
                                onClick={() => setFormState({ ...formState, color: color.value })}
                                className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${formState.color === color.value ? 'border-primary-600 scale-110 shadow-md' : 'border-transparent'}`}
                                style={{ backgroundColor: color.value }}
                                title={color.name}
                            />
                        ))}
                    </div>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={onClose} className="bg-gray-200 dark:bg-gray-600 px-4 py-2 rounded-md">Cancelar</button>
                    <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-md">Guardar</button>
                </div>
            </form>
        </Modal>
    )
}