import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../../components/Card';
import { Modal } from '../../components/Modal';
import { PlusIcon, TrashIcon, WarningIcon, DownloadIcon } from '../../components/icons';
import { Event, User, Profile } from '../../types';
import { exportToCsv, printPage } from '../../utils/export';
// Fix: Added missing import for useCompany hook.
import { useCompany } from '../../contexts/CompanyContext';

const spanishMonths = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const getEventStatus = (event: Event) => {
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
    const { events, setEvents, users } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [deleteStep, setDeleteStep] = useState(1);
    const { companyInfo } = useCompany();

    const teachers = useMemo(() => users.filter(u => u.profiles.includes(Profile.TEACHER)), [users]);
    
    // Automatic event generation logic
    useEffect(() => {
        const generateAutomaticEvents = () => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const generatedEvents: Event[] = [];
            
            // Generate for the next 8 weeks
            for (let i = 0; i < 8; i++) {
                const targetDate = new Date(today);
                targetDate.setDate(today.getDate() + (i * 7));

                const monthName = spanishMonths[targetDate.getMonth()];
                const weekOfMonth = Math.ceil(targetDate.getDate() / 7);
                const eventName = `R - ${monthName} - semana ${weekOfMonth}`;

                const year = targetDate.getFullYear();
                const weekOfYear = Math.ceil((((targetDate.getTime() - new Date(year, 0, 1).getTime()) / 86400000) + new Date(year, 0, 1).getDay() + 1) / 7);

                // Check if an event with this name already exists
                const eventExists = events.some(e => e.name === eventName && e.type === 'Regular');

                if (!eventExists) {
                    const eventWeekMonday = new Date(targetDate);
                    eventWeekMonday.setDate(targetDate.getDate() - (targetDate.getDay() + 6) % 7);
                    
                    const orderCloseDate = new Date(eventWeekMonday);
                    orderCloseDate.setDate(eventWeekMonday.getDate() - 7); // Monday of the previous week
                    orderCloseDate.setHours(23, 59, 59, 999);

                    const orderOpenDate = new Date(orderCloseDate);
                    orderOpenDate.setDate(orderCloseDate.getDate() - 5); // Wednesday before that

                    const newEvent: Event = {
                        id: `evt-auto-${year}-${weekOfYear}`,
                        name: eventName,
                        type: 'Regular',
                        start_date: orderOpenDate.toISOString(),
                        end_date: orderCloseDate.toISOString(),
                        budget_per_teacher: companyInfo.default_budget || 300,
                        status: 'Inactivo',
                        authorized_teachers: [],
                    };
                    generatedEvents.push(newEvent);
                }
            }

            if (generatedEvents.length > 0) {
                setEvents(prevEvents => [...prevEvents, ...generatedEvents]);
            }
        };

        generateAutomaticEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run only once on component mount


    const handleOpenModal = (event: Event | null = null) => {
        setSelectedEvent(event);
        setIsModalOpen(true);
    };

    const handleSaveEvent = (event: Event) => {
        if (selectedEvent) {
            setEvents(events.map(e => (e.id === event.id ? event : e)));
        } else {
            setEvents([...events, { ...event, id: `evt-${Date.now()}` }]);
        }
        setIsModalOpen(false);
        setSelectedEvent(null);
    };

    const handleOpenDeleteModal = (event: Event) => {
        setSelectedEvent(event);
        setDeleteStep(1);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteEvent = () => {
        if (selectedEvent) {
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

    const sortedEvents = useMemo(() => [...events].sort((a,b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()), [events]);

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Gestión de Eventos</h1>
                <div className="no-print flex items-center space-x-2">
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
            
            <Card title="Listado de Eventos de Pedido">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th className="px-4 py-2">Nombre</th>
                                <th className="px-4 py-2">Tipo</th>
                                <th className="px-4 py-2">Fecha Inicio</th>
                                <th className="px-4 py-2">Fecha Fin</th>
                                <th className="px-4 py-2">Presupuesto</th>
                                <th className="px-4 py-2">Estado</th>
                                <th className="px-4 py-2">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedEvents.map(event => {
                                const status = getEventStatus(event);
                                return (
                                <tr key={event.id} className="border-b dark:border-gray-700">
                                    <td className="px-4 py-2 font-medium">{event.name}</td>
                                    <td className="px-4 py-2">{event.type}</td>
                                    <td className="px-4 py-2">{new Date(event.start_date).toLocaleString()}</td>
                                    <td className="px-4 py-2">{new Date(event.end_date).toLocaleString()}</td>
                                    <td className="px-4 py-2">{event.budget_per_teacher.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</td>
                                    <td className="px-4 py-2">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${status.color}`}>
                                            {status.text}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 no-print">
                                        <button onClick={() => handleOpenModal(event)} className="text-primary-600 hover:underline">Editar</button>
                                        <button onClick={() => handleOpenDeleteModal(event)} className="text-red-600 hover:underline ml-4">Eliminar</button>
                                    </td>
                                </tr>
                            )})}
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

const EventFormModal: React.FC<{ event: Event | null; onClose: () => void; onSave: (event: Event) => void; teachers: User[] }> = ({ event, onClose, onSave, teachers }) => {
    const { companyInfo } = useCompany();
    const [formState, setFormState] = useState<Event>(event || { 
        id: '', name: '', type: 'Regular', 
        start_date: new Date().toISOString(), 
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), 
        budget_per_teacher: companyInfo.default_budget || 300, 
        authorized_teachers: [],
        status: 'Activo'
    });

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
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label>Tipo</label>
                        <select name="type" value={formState.type} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600">
                            <option value="Regular">Regular</option>
                            <option value="Extraordinario">Extraordinario</option>
                        </select>
                    </div>
                     <div>
                        <label>Estado</label>
                        <select name="status" value={formState.status} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600">
                            <option value="Activo">Activo</option>
                            <option value="Inactivo">Inactivo</option>
                        </select>
                    </div>
                </div>
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
                {formState.type === 'Extraordinario' && (
                     <div>
                        <label>Profesores Autorizados (dejar vacío para todos)</label>
                        <MultiSelectTeachers teachers={teachers} selected={formState.authorized_teachers || []} onChange={handleAuthTeacherChange} />
                    </div>
                )}
                
                <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={onClose} className="bg-gray-200 dark:bg-gray-600 px-4 py-2 rounded-md">Cancelar</button>
                    <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-md">Guardar</button>
                </div>
            </form>
        </Modal>
    )
}