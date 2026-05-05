import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/Card';
import { EventIcon, PlusIcon, HistoryIcon, RecipeIcon, SaleIcon, DownloadIcon, ChartIcon, CalendarIcon } from '../../components/icons';
import { printPage } from '../../utils/export';
import { Profile, SUPER_USER_EMAILS, AppEvent } from '../../types';

// Calendario Compacto
const CompactCalendar: React.FC<{ events: AppEvent[], selectedDate: Date, onSelectDate: (d: Date) => void }> = ({ events, selectedDate, onSelectDate }) => {
    const [viewMonth, setViewMonth] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    
    const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
    const firstDay = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1).getDay();
    const startingDay = firstDay === 0 ? 6 : firstDay - 1; // Ajustar a Lunes como primer día

    const handlePrevMonth = () => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1));
    const handleNextMonth = () => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1));

    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    // Calcular días y eventos
    const days = [];
    for (let i = 0; i < startingDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), i));

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">&lt;</button>
                <div className="font-bold text-sm uppercase">{monthNames[viewMonth.getMonth()]} {viewMonth.getFullYear()}</div>
                <button onClick={handleNextMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">&gt;</button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500 mb-2">
                <div>L</div><div>M</div><div>X</div><div>J</div><div>V</div><div>S</div><div>D</div>
            </div>
            <div className="grid grid-cols-7 gap-1">
                {days.map((d, i) => {
                    if (!d) return <div key={i} className="p-2" />;
                    
                    const isSelected = selectedDate.toDateString() === d.toDateString();
                    const isToday = new Date().toDateString() === d.toDateString();
                    
                    // Eventos en este día
                    const dayEvents = events.filter(e => {
                        const start = new Date(e.start_date);
                        const end = new Date(e.end_date);
                        // Truco para ajustar zonas horarias si es necesario
                        start.setHours(0,0,0,0);
                        end.setHours(23,59,59,999);
                        return d >= start && d <= end;
                    });

                    return (
                        <div 
                            key={i} 
                            onClick={() => onSelectDate(d)}
                            className={`p-1.5 min-h-[40px] flex flex-col items-center justify-start rounded-md cursor-pointer transition-colors relative border
                                ${isSelected ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'}
                                ${isToday ? 'bg-gray-100 dark:bg-gray-700' : ''}
                            `}
                        >
                            <span className={`text-xs ${isSelected ? 'font-bold text-primary-700 dark:text-primary-400' : ''}`}>{d.getDate()}</span>
                            <div className="flex gap-0.5 mt-1 flex-wrap justify-center w-full px-1">
                                {dayEvents.slice(0,3).map(e => (
                                    <div key={e.id} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: e.color || (e.type === 'Servicio' ? '#10b981' : e.type === 'Regular' ? '#3b82f6' : '#ef4444') }} />
                                ))}
                                {dayEvents.length > 3 && <div className="w-1 h-1 rounded-full bg-gray-400" />}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export const TeacherDashboard: React.FC = () => {
    const { events, orders, users, mini_economato_stock, assignments, groups, modules } = useData();
    const { currentUser, selectedProfile, effectiveUserId } = useAuth();
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());

    const myAssignments = assignments
        .filter(a => a.user_id === effectiveUserId)
        .map(a => {
            const group = groups.find(g => g.id === a.group_id);
            const module = modules.find(m => m.id === a.module_id);
            return {
                id: a.id,
                groupName: group?.name || 'Desconocido',
                moduleName: module?.name || 'Desconocido'
            };
        });

    const isStudent = selectedProfile === Profile.STUDENT;
    const basePath = isStudent ? '/student' : '/teacher';

    const now = new Date();
    const activeEvents = events.filter(e => {
        // Basic date check
        if (!(new Date(e.start_date) <= now && new Date(e.end_date) >= now)) return false;
        
        // Admins, Creators and Almacen see everything
        const isManagement = currentUser?.profiles.includes(Profile.ADMIN) || 
                           currentUser?.profiles.includes(Profile.CREATOR) ||
                           currentUser?.profiles.includes(Profile.ALMACEN);
        
        if (isManagement) return true;
        
        // Regular events are for everyone
        if (e.type === 'Regular') return true;
        
        // For Servicio and Extraordinario, check authorized_teachers
        if (e.authorized_teachers && e.authorized_teachers.length > 0) {
            return e.authorized_teachers.some(id => id === currentUser?.id || id === currentUser?.substituting_user_id);
        }
        
        // Extraordinario without authorized_teachers is for everyone
        if (e.type === 'Extraordinario') return true;
        
        // Servicio without authorized_teachers is hidden (must be assigned)
        return false;
    });
    
    const myRecentOrders = orders
        .filter(o => o.user_id === effectiveUserId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 3);
    
    const eventsMap = new Map(events.map(e => [e.id, e.name]));

    const activeTeachersCount = users.filter(u => 
        u.profiles.includes(Profile.TEACHER) && 
        !u.profiles.includes(Profile.ALMACEN) &&
        !SUPER_USER_EMAILS.includes(u.email) &&
        u.activity_status === 'Activo'
    ).length || 1;
    const miniEconomatoOrders = orders.filter(o => o.user_id === 'mini-economato' && o.status === 'Completado');
    const totalSharedCost = miniEconomatoOrders.reduce((sum, order) => {
        let sharedOnlyCost = 0;
        order.items.forEach(item => {
            const stockItem = mini_economato_stock.find((s: any) => s.id === item.product_id);
            if (stockItem?.is_shared) {
                sharedOnlyCost += (item.price * item.quantity) * (1 + (item.tax || 0) / 100);
            }
        });
        return sum + sharedOnlyCost;
    }, 0);
    const mySharedSpend = totalSharedCost / activeTeachersCount;

    const myAllOrders = useMemo(() => orders.filter(o => o.user_id === effectiveUserId && o.status !== 'Cancelado'), [orders, effectiveUserId]);
    const myTotalSpend = myAllOrders.reduce((sum, o) => sum + (o.cost || 0), 0);
    const spendByType = useMemo(() => myAllOrders.reduce((acc, order) => {
        const event = events.find(e => e.id === order.event_id);
        const type = event?.type || 'Otros';
        acc[type] = (acc[type] || 0) + (order.cost || 0);
        return acc;
    }, {} as Record<string, number>), [myAllOrders, events]);

    const selectedDayEvents = useMemo(() => activeEvents.filter(e => {
        const start = new Date(e.start_date);
        const end = new Date(e.end_date);
        start.setHours(0,0,0,0);
        end.setHours(23,59,59,999);
        return selectedDate >= start && selectedDate <= end;
    }), [activeEvents, selectedDate]);

    const currentDateString = new Date().toLocaleDateString('es-ES', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
    }).toUpperCase();

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div className="flex flex-col">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Bienvenido, {currentUser?.name}</h1>
                    <span className="text-xs font-bold text-primary-600 tracking-widest mt-1">
                        {currentDateString}
                    </span>
                </div>
                {!isStudent && (
                    <div className="flex items-center space-x-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-lg border border-blue-100 dark:border-blue-800">
                             <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase">Gasto Compartido</p>
                             <p className="text-lg font-bold text-blue-800 dark:text-blue-200">{mySharedSpend.toFixed(2)}€</p>
                        </div>
                        <button onClick={printPage} className="no-print bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 flex items-center h-fit">
                            <DownloadIcon className="w-5 h-5 mr-2" />
                            Descargar PDF
                        </button>
                    </div>
                )}
                {isStudent && (
                    <button onClick={printPage} className="no-print bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 flex items-center h-fit">
                        <DownloadIcon className="w-5 h-5 mr-2" />
                        Descargar PDF
                    </button>
                )}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card title="Calendario de Pedidos" icon={<CalendarIcon className="w-8 h-8"/>}>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                            <div className="w-full">
                                <CompactCalendar events={activeEvents} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
                            </div>
                            <div className="w-full">
                                <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-3 border-b dark:border-gray-700 pb-2 flex items-center">
                                    <EventIcon className="w-4 h-4 mr-2 text-primary-500" />
                                    Eventos el {selectedDate.toLocaleDateString()}
                                </h3>
                                {selectedDayEvents.length > 0 ? (
                                    <ul className="space-y-3 max-h-[250px] overflow-y-auto pr-2">
                                        {selectedDayEvents.map(event => (
                                            <li key={event.id} className="p-3 rounded-lg border-l-4 shadow-sm text-sm relative transition-shadow hover:shadow-md dark:bg-gray-800" style={{ borderColor: event.color || (event.type === 'Servicio' ? '#10b981' : event.type === 'Regular' ? '#3b82f6' : '#ef4444') }}>
                                                <p className="font-bold text-gray-800 dark:text-gray-200 leading-tight">{event.name}</p>
                                                <p className="text-[10px] text-gray-500 mt-1 uppercase font-medium">Tipo: {event.type} | Cierra a las {new Date(event.end_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                                <Link to={`${basePath}/order-portal/new/${event.id}`} className="mt-2 inline-block text-xs font-bold tracking-wide bg-primary-600 text-white py-1.5 px-3 rounded hover:bg-primary-700 w-full text-center transition-colors">
                                                    Hacer Pedido
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="text-center py-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
                                        <p className="text-sm text-gray-500 italic">No hay eventos activos.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>

                    <Card title="Análisis de Mis Gastos" icon={<ChartIcon className="w-8 h-8"/>}>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-center shadow-sm">
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider mb-1">Gasto Total</p>
                                <p className="text-2xl font-black text-gray-800 dark:text-gray-200">{myTotalSpend.toFixed(2)}€</p>
                            </div>
                            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/50 text-center shadow-sm">
                                <p className="text-[11px] text-blue-600 dark:text-blue-400 uppercase font-bold tracking-wider mb-1 whitespace-nowrap overflow-hidden text-ellipsis px-1" title="Módulos (Regular)">Módulos (Reg.)</p>
                                <p className="text-2xl font-black text-blue-700 dark:text-blue-300">{ (spendByType['Regular'] || 0).toFixed(2) }€</p>
                            </div>
                            <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-800/50 text-center shadow-sm">
                                <p className="text-[11px] text-green-600 dark:text-green-400 uppercase font-bold tracking-wider mb-1">Servicios</p>
                                <p className="text-2xl font-black text-green-700 dark:text-green-300">{ (spendByType['Servicio'] || 0).toFixed(2) }€</p>
                            </div>
                            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/50 text-center shadow-sm">
                                <p className="text-[11px] text-red-600 dark:text-red-400 uppercase font-bold tracking-wider mb-1">Extraord.</p>
                                <p className="text-2xl font-black text-red-700 dark:text-red-300">{ (spendByType['Extraordinario'] || 0).toFixed(2) }€</p>
                            </div>
                        </div>
                    </Card>
                </div>
                
                <div className="space-y-6">
                    <Card title="Acciones Rápidas" icon={<PlusIcon className="w-8 h-8"/>}>
                         <div className="flex flex-col space-y-3 no-print">
                            <Link to={`${basePath}/order-portal`} className="w-full justify-between items-center flex bg-primary-600 text-white py-3 px-4 rounded-lg shadow-sm hover:shadow-md hover:bg-primary-700 transition font-medium">
                                <span>Portal de Pedidos</span> <span className="opacity-70 text-lg">&rarr;</span>
                            </Link>
                            <Link to={`${basePath}/recipes`} className="w-full justify-between items-center flex bg-gray-800 dark:bg-gray-700 text-white py-3 px-4 rounded-lg shadow-sm hover:shadow-md hover:bg-gray-900 dark:hover:bg-gray-600 transition font-medium">
                                <span>Mis Recetas</span> <span className="opacity-70 text-lg">&rarr;</span>
                            </Link>
                            {!isStudent && (
                                <Link to={`${basePath}/sales`} className="w-full justify-between items-center flex bg-gray-800 dark:bg-gray-700 text-white py-3 px-4 rounded-lg shadow-sm hover:shadow-md hover:bg-gray-900 dark:hover:bg-gray-600 transition font-medium">
                                    <span>Ventas y Tienda</span> <span className="opacity-70 text-lg">&rarr;</span>
                                </Link>
                            )}
                            <Link to={`${basePath}/order-history`} className="w-full justify-between items-center flex border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2.5 px-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium mt-2">
                                <span>Historial de Pedidos</span> <HistoryIcon className="w-5 h-5 opacity-70" />
                            </Link>
                        </div>
                    </Card>

                    {myAssignments.length > 0 && (
                        <Card title="Mis Módulos y Grupos" icon={<HistoryIcon className="w-8 h-8 text-primary-600"/>}>
                            <div className="space-y-3">
                                {myAssignments.map(asg => (
                                    <div key={asg.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border-l-4 border-primary-500 shadow-sm">
                                        <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{asg.moduleName}</p>
                                        <p className="text-xs text-primary-600 dark:text-primary-400 font-medium uppercase tracking-wider mt-0.5">{asg.groupName}</p>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};