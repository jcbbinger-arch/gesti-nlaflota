import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { Card } from '../../components/Card';
import { UsersIcon, ProductIcon, SupplierIcon, EventIcon, DownloadIcon, ChartIcon, CalendarIcon, PlusIcon, HistoryIcon } from '../../components/icons';
import { Profile, AppEvent } from '../../types';
import { printPage } from '../../utils/export';

// Calendario Compacto (Componente compartido conceptualmente)
const CompactCalendar: React.FC<{ events: AppEvent[], selectedDate: Date, onSelectDate: (d: Date) => void }> = ({ events, selectedDate, onSelectDate }) => {
    const [viewMonth, setViewMonth] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    
    const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
    const firstDay = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1).getDay();
    const startingDay = firstDay === 0 ? 6 : firstDay - 1;

    const handlePrevMonth = () => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1));
    const handleNextMonth = () => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1));

    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

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
                    
                    const dayEvents = events.filter(e => {
                        const start = new Date(e.start_date);
                        const end = new Date(e.end_date);
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
                                ${isToday ? 'bg-gray-100 dark:bg-gray-700 font-bold' : ''}
                            `}
                        >
                            <span className={`text-xs ${isSelected ? 'font-bold text-primary-700' : ''}`}>{d.getDate()}</span>
                            <div className="flex gap-0.5 mt-1 flex-wrap justify-center w-full px-1">
                                {dayEvents.slice(0,3).map(e => (
                                    <div key={e.id} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: e.color || (e.type === 'Servicio' ? '#10b981' : e.type === 'Regular' ? '#3b82f6' : '#ef4444') }} />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const StatCard: React.FC<{ title: string; icon: React.ReactNode; value: string | number; color: string; label?: string }> = ({ title, icon, value, color, label }) => (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-xl p-4 flex items-center border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-shadow">
        <div className={`p-3 rounded-xl ${color} mr-4`}>
            {icon}
        </div>
        <div>
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{title}</p>
            <p className="text-xl font-black text-gray-800 dark:text-gray-100">{value}</p>
            {label && <p className="text-[9px] text-gray-500 mt-0.5 font-medium">{label}</p>}
        </div>
    </div>
);

export const AdminDashboard: React.FC = () => {
  const { users, products, suppliers, events, orders } = useData();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const teacherCount = users.filter(u => u.profiles.includes(Profile.TEACHER) && u.activity_status === 'Activo').length;
  const productCount = products.length;
  const supplierCount = suppliers.filter(s => s.status === 'Activo').length;
  
  // Análisis Global de Gastos
  const globalAllOrders = useMemo(() => orders.filter(o => o.status !== 'Cancelado'), [orders]);
  const totalGlobalSpend = globalAllOrders.reduce((sum, o) => sum + (o.cost || 0), 0);
  
  const spendByType = useMemo(() => globalAllOrders.reduce((acc, order) => {
      const event = events.find(e => e.id === order.event_id);
      const type = event?.type || 'Otros';
      acc[type] = (acc[type] || 0) + (order.cost || 0);
      return acc;
  }, {} as Record<string, number>), [globalAllOrders, events]);

  const selectedDayEvents = useMemo(() => events.filter(e => {
      const start = new Date(e.start_date);
      const end = new Date(e.end_date);
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);
      return selectedDate >= start && selectedDate <= end;
  }), [events, selectedDate]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Panel de Control</h1>
           <p className="text-xs font-bold text-primary-600 uppercase tracking-widest mt-1">Visión General del Centro</p>
        </div>
        <button onClick={printPage} className="no-print bg-gray-800 dark:bg-gray-700 text-white py-2.5 px-5 rounded-lg hover:bg-black transition-colors flex items-center shadow-sm font-medium">
            <DownloadIcon className="w-5 h-5 mr-2" />
            Descargar Reporte PDF
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Profesores" icon={<UsersIcon className="w-6 h-6 text-white"/>} value={teacherCount} color="bg-blue-600" label="Personal activo" />
        <StatCard title="Gasto Total" icon={<ChartIcon className="w-6 h-6 text-white"/>} value={`${totalGlobalSpend.toFixed(2)}€`} color="bg-primary-600" label="Presupuesto ejecutado" />
        <StatCard title="Productos" icon={<ProductIcon className="w-6 h-6 text-white"/>} value={productCount} color="bg-emerald-600" label="En catálogo" />
        <StatCard title="Proveedores" icon={<SupplierIcon className="w-6 h-6 text-white"/>} value={supplierCount} color="bg-amber-500" label="Activos" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Planificación de Eventos" icon={<CalendarIcon className="w-8 h-8"/>}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
               <div className="w-full">
                  <CompactCalendar events={events} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
               </div>
               <div className="w-full">
                  <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-3 border-b dark:border-gray-700 pb-2 flex items-center text-sm">
                      <EventIcon className="w-4 h-4 mr-2 text-primary-500" />
                      Actividad el {selectedDate.toLocaleDateString()}
                  </h3>
                  {selectedDayEvents.length > 0 ? (
                      <ul className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                          {selectedDayEvents.map(event => (
                              <li key={event.id} className="p-3 rounded-lg border-l-4 shadow-sm text-sm dark:bg-gray-800/50 hover:shadow-md transition-shadow" style={{ borderColor: event.color || '#primary' }}>
                                  <Link to={`/admin/events`} className="font-bold text-gray-800 dark:text-gray-200 block hover:text-primary-600">{event.name}</Link>
                                  <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-tight">
                                    {event.type} | Estado: <span className={event.status === 'Activo' ? 'text-green-600' : 'text-red-500'}>{event.status}</span>
                                  </p>
                              </li>
                          ))}
                      </ul>
                  ) : (
                      <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                          <p className="text-sm text-gray-400 italic">Sin eventos configurados para hoy</p>
                      </div>
                  )}
               </div>
            </div>
          </Card>

          <Card title="Gasto por Categoría de Evento" icon={<ChartIcon className="w-8 h-8"/>}>
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/50">
                     <p className="text-[10px] text-blue-600 uppercase font-black mb-1">Módulos (Reg.)</p>
                     <p className="text-2xl font-black text-blue-700 dark:text-blue-300">{(spendByType['Regular'] || 0).toFixed(2)}€</p>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/50">
                     <p className="text-[10px] text-emerald-600 uppercase font-black mb-1">Servicios</p>
                     <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{(spendByType['Servicio'] || 0).toFixed(2)}€</p>
                  </div>
                  <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800/50">
                     <p className="text-[10px] text-rose-600 uppercase font-black mb-1">Extraord.</p>
                     <p className="text-2xl font-black text-rose-700 dark:text-rose-300">{(spendByType['Extraordinario'] || 0).toFixed(2)}€</p>
                  </div>
               </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Acciones Rápidas" icon={<PlusIcon className="w-8 h-8"/>}>
             <div className="flex flex-col space-y-2.5">
                <Link to="/admin/events" className="group flex items-center justify-between p-3 rounded-lg bg-primary-600 hover:bg-primary-700 text-white transition-all shadow-sm">
                   <div className="flex items-center">
                      <EventIcon className="w-5 h-5 mr-3 opacity-90" />
                      <span className="font-bold text-sm">Gestionar Eventos</span>
                   </div>
                   <span className="opacity-0 group-hover:opacity-100 transition-opacity font-bold">&rarr;</span>
                </Link>
                <Link to="/admin/products" className="group flex items-center justify-between p-3 rounded-lg bg-gray-800 dark:bg-gray-700 hover:bg-black transition-all shadow-sm text-white">
                   <div className="flex items-center">
                      <ProductIcon className="w-5 h-5 mr-3 opacity-90" />
                      <span className="font-bold text-sm">Catálogo de Productos</span>
                   </div>
                   <span className="opacity-0 group-hover:opacity-100 transition-opacity font-bold">&rarr;</span>
                </Link>
                <Link to="/admin/staff" className="group flex items-center justify-between p-3 rounded-lg bg-gray-800 dark:bg-gray-700 hover:bg-black transition-all shadow-sm text-white">
                   <div className="flex items-center">
                      <UsersIcon className="w-5 h-5 mr-3 opacity-90" />
                      <span className="font-bold text-sm">Gestión de Personal</span>
                   </div>
                   <span className="opacity-0 group-hover:opacity-100 transition-opacity font-bold">&rarr;</span>
                </Link>
                <Link to="/admin/suppliers" className="group flex items-center justify-between p-3 rounded-lg border-2 border-gray-100 dark:border-gray-700 hover:border-primary-500 transition-all text-gray-700 dark:text-gray-300">
                   <div className="flex items-center">
                      <SupplierIcon className="w-5 h-5 mr-3 opacity-70" />
                      <span className="font-bold text-sm">Proveedores</span>
                   </div>
                   <span className="opacity-0 group-hover:opacity-100 transition-opacity font-bold">&rarr;</span>
                </Link>
                <Link to="/admin/expenses" className="group flex items-center justify-between p-3 rounded-lg border-2 border-gray-100 dark:border-gray-700 hover:border-primary-500 transition-all text-gray-700 dark:text-gray-300">
                   <div className="flex items-center">
                      <ChartIcon className="w-5 h-5 mr-3 opacity-70" />
                      <span className="font-bold text-sm">Control de Gastos</span>
                   </div>
                   <span className="opacity-0 group-hover:opacity-100 transition-opacity font-bold">&rarr;</span>
                </Link>
             </div>
          </Card>

          <Card title="Resumen de Sistema" icon={<HistoryIcon className="w-8 h-8 text-gray-400"/>}>
             <div className="space-y-4">
                <div className="flex justify-between items-center text-xs pb-2 border-b dark:border-gray-700">
                   <span className="text-gray-500 uppercase font-bold tracking-tighter">Últimos Pedidos</span>
                   <Link to="/manager/history" className="text-primary-600 hover:underline">Ver Historial</Link>
                </div>
                {globalAllOrders.slice(0, 5).map(order => (
                  <div key={order.id} className="flex justify-between items-center text-sm">
                    <span className="truncate max-w-[150px] text-gray-700 dark:text-gray-300 font-medium">{users.find(u => u.id === order.user_id)?.name || 'Profesor'}</span>
                    <span className="font-mono text-xs font-bold bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{(order.cost || 0).toFixed(2)}€</span>
                  </div>
                ))}
             </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
