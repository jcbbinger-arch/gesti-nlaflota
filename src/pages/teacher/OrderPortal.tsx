import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/Card';
import { AppEvent, Profile } from '../../types';
import { DownloadIcon } from '../../components/icons';
import { exportToCsv } from '../../utils/export';

export const OrderPortal: React.FC = () => {
    const { events, orders } = useData();
    const { currentUser } = useAuth();
    const [searchParams] = useSearchParams();
    const isEconomatoMode = searchParams.get('type') === 'economato';
    const isAlmacen = currentUser?.profiles.includes(Profile.ALMACEN);
    
    const now = new Date();

    // Filter events based on authorized_teachers
    const filteredEvents = events.filter(e => {
        // Admins, Creators and Almacen see everything
        const isManagement = currentUser?.profiles.includes(Profile.ADMIN) || 
                           currentUser?.profiles.includes(Profile.CREATOR) ||
                           currentUser?.profiles.includes(Profile.ALMACEN);
        
        if (isManagement) return true;
        
        // Regular events are for everyone
        if (e.type === 'Regular') return true;
        
        // For Servicio and Extraordinario, check authorized_teachers
        if (e.authorized_teachers && e.authorized_teachers.length > 0) {
            return e.authorized_teachers.includes(currentUser?.id || '');
        }
        
        // Extraordinario without authorized_teachers is for everyone
        if (e.type === 'Extraordinario') return true;
        
        // Servicio without authorized_teachers is hidden (must be assigned)
        return false;
    });
    
    // Eventos que están en su rango de fechas y están activos
    const activeEvents = filteredEvents
        .filter(e => e.status === 'Activo' && new Date(e.start_date) <= now && new Date(e.end_date) >= now)
        .sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime());
    
    // Eventos programados para el futuro (activos pero aún no han empezado)
    const futureEvents = filteredEvents
        .filter(e => e.status === 'Activo' && new Date(e.start_date) > now)
        .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
        .slice(0, 6); // Limit to next 6 events to avoid saturation

    const staffMealOrders = orders.filter(o => o.is_staff_meal && o.user_id === currentUser?.id);

    const getMyOrderForEvent = (event: AppEvent, type?: 'weekly' | 'service') => {
        const userId = currentUser?.id;
        if (!type && !isEconomatoMode) {
            return orders.find(o => o.user_id === userId && o.event_id === event.id && !o.is_economato_order);
        }
        return orders.find(o => 
            o.user_id === userId && 
            o.event_id === event.id && 
            (isEconomatoMode ? o.is_economato_order : (o.order_type === type && !o.is_economato_order))
        );
    };

    const handleExport = () => {
        const dataToExport = activeEvents.flatMap(event => {
            const types: ('weekly' | 'service')[] = ['service', 'weekly'];
            return types.map(type => {
                const myOrder = getMyOrderForEvent(event, type);
                return {
                    evento: event.name,
                    tipo: type === 'service' ? 'Servicio Comedor' : 'Pedido Semanal',
                    finaliza: new Date(event.end_date).toLocaleString(),
                    estado: myOrder ? myOrder.status : 'No realizado'
                };
            });
        });
        exportToCsv('eventos_pedidos.csv', dataToExport);
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">
                    {isEconomatoMode ? 'Portal de Pedidos: Mini-Economato' : 'Portal de Pedidos'}
                </h1>
                 <button onClick={handleExport} className="no-print bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 flex items-center shadow-sm transition-colors">
                    <DownloadIcon className="w-5 h-5 mr-2" />
                    Exportar a CSV
                </button>
            </div>
            {isEconomatoMode && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 shadow-sm">
                    <p className="text-blue-700 font-medium">Modo Reposición Mini-Economato</p>
                    <p className="text-sm text-blue-600">Los pedidos realizados aquí se cargarán al stock del Mini-Economato.</p>
                </div>
            )}

            <Card title="Eventos de Pedido Abiertos">
                <div className="p-4 bg-gray-50 border-b text-sm text-gray-600">
                    <p>Selecciona el tipo de pedido que deseas realizar. Los pedidos de <strong>Servicio</strong> son para las prácticas de comedor, mientras que los <strong>Semanales</strong> son para reposición de aula.</p>
                </div>
                {activeEvents.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-100 text-gray-600 text-xs uppercase font-semibold">
                                <tr>
                                    <th className="px-6 py-3 text-left">Evento / Fecha de Cierre</th>
                                    <th className="px-6 py-3 text-center">Pedido de SERVICIO</th>
                                    <th className="px-6 py-3 text-center">Pedido SEMANAL</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {activeEvents.map(event => {
                                    const weeklyOrder = getMyOrderForEvent(event, 'weekly');
                                    const serviceOrder = getMyOrderForEvent(event, 'service');
                                    const linkSuffix = isEconomatoMode ? '&type=economato' : '';
                                    
                                    return (
                                        <tr key={event.id} className={`hover:opacity-90 transition-colors border-l-4 ${event.type === 'Regular' ? 'bg-blue-50/30' : event.type === 'Servicio' ? 'bg-green-50/30' : 'bg-red-50/30'}`} style={{ borderLeftColor: event.color || '#6b7280' }}>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-800 flex items-center">
                                                    {event.name}
                                                </div>
                                                <div className="text-xs text-gray-500 italic">Abierto hasta: {new Date(event.end_date).toLocaleString()}</div>
                                            </td>
                                            
                                            {/* Pedido de Servicio */}
                                            <td className="px-6 py-4 text-center">
                                                {serviceOrder ? (
                                                    <div className="flex flex-col items-center">
                                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full mb-1 ${
                                                            serviceOrder.status === 'Procesado' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                                        }`}>
                                                            {serviceOrder.status}
                                                        </span>
                                                        <Link 
                                                            to={`/teacher/order-portal/edit/${serviceOrder.id}?order_type=service${linkSuffix}`} 
                                                            className="text-primary-600 hover:text-primary-800 text-sm font-bold"
                                                        >
                                                            {serviceOrder.status === 'Procesado' ? 'Ver' : 'Modificar'}
                                                        </Link>
                                                    </div>
                                                ) : (
                                                    <Link 
                                                        to={`/teacher/order-portal/new/${event.id}?order_type=service${linkSuffix}`} 
                                                        className="inline-block bg-primary-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-primary-700 shadow-sm"
                                                    >
                                                        Crear Servicio
                                                    </Link>
                                                )}
                                            </td>
                                            
                                            {/* Pedido Semanal */}
                                            <td className="px-6 py-4 text-center">
                                                {weeklyOrder ? (
                                                    <div className="flex flex-col items-center">
                                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full mb-1 ${
                                                            weeklyOrder.status === 'Procesado' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                                        }`}>
                                                            {weeklyOrder.status}
                                                        </span>
                                                        <Link 
                                                            to={`/teacher/order-portal/edit/${weeklyOrder.id}?order_type=weekly${linkSuffix}`} 
                                                            className="text-primary-600 hover:text-primary-800 text-sm font-bold"
                                                        >
                                                            {weeklyOrder.status === 'Procesado' ? 'Ver' : 'Modificar'}
                                                        </Link>
                                                    </div>
                                                ) : (
                                                    <Link 
                                                        to={`/teacher/order-portal/new/${event.id}?order_type=weekly${linkSuffix}`} 
                                                        className="inline-block border border-primary-600 text-primary-600 px-3 py-1.5 rounded text-xs font-bold hover:bg-primary-50 transition-colors"
                                                    >
                                                        Crear Semanal
                                                    </Link>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-10 text-center text-gray-500 italic">
                        No hay eventos de pedido abiertos actualmente.
                    </div>
                )}
            </Card>

            {futureEvents.length > 0 && (
                <Card title="Próximos Eventos (Pronto se abrirán)">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {futureEvents.map(event => (
                            <div key={event.id} className={`p-4 border border-l-4 rounded-lg opacity-75 ${event.type === 'Regular' ? 'bg-blue-50/20' : event.type === 'Servicio' ? 'bg-green-50/20' : 'bg-red-50/20'}`} style={{ borderLeftColor: event.color || '#6b7280' }}>
                                <h3 className="font-bold text-gray-700">{event.name}</h3>
                                <div className="text-xs space-y-1 mt-2 text-gray-500">
                                    <p><span className="font-medium">Se abre el:</span> {new Date(event.start_date).toLocaleString()}</p>
                                    <p><span className="font-medium">Se cierra el:</span> {new Date(event.end_date).toLocaleString()}</p>
                                </div>
                                <div className="mt-3">
                                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold uppercase tracking-wider">
                                        Programado
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {staffMealOrders.length > 0 && (
                <Card title="Pedidos de Comida de Familia (Automáticos)" className="mt-6 border-l-4 border-amber-500">
                    <p className="text-sm text-gray-500 mb-4">Estos pedidos se generan automáticamente cuando se programa un servicio de comedor.</p>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                <tr>
                                    <th className="px-4 py-2">Servicio / Fecha</th>
                                    <th className="px-4 py-2">Estado</th>
                                    <th className="px-4 py-2">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {staffMealOrders.map(order => (
                                    <tr key={order.id} className="border-b dark:border-gray-700">
                                        <td className="px-4 py-3 font-medium">
                                            {order.notes?.replace('Pedido de Comida de Familia para el servicio del ', '') || order.id}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                order.status === 'Borrador' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                                            }`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Link 
                                                to={`/teacher/order-portal/edit/${order.id}`} 
                                                className="text-primary-600 font-bold hover:underline"
                                            >
                                                {order.status === 'Borrador' ? 'Rellenar Pedido' : 'Ver/Modificar'}
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    );
};
