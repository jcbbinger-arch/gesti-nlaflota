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
    const upcomingEvents = events
        .filter(e => e.status !== 'Inactivo' && new Date(e.end_date) >= now)
        .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
    const activeEvents = upcomingEvents.slice(0, 3);

    const staffMealOrders = orders.filter(o => o.is_staff_meal && o.user_id === currentUser?.id);

    const getMyOrderForEvent = (event: AppEvent) => {
        const userId = isEconomatoMode ? 'mini-economato' : currentUser?.id;
        return orders.find(o => o.user_id === userId && o.event_id === event.id);
    };

    const handleExport = () => {
        const dataToExport = activeEvents.map(event => {
            const myOrder = getMyOrderForEvent(event);
            return {
                evento: event.name,
                finaliza: new Date(event.end_date).toLocaleString(),
                estado_mi_pedido: myOrder ? myOrder.status : 'No realizado'
            }
        });
        exportToCsv('eventos_activos.csv', dataToExport);
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">
                    {isEconomatoMode ? 'Portal de Pedidos: Mini-Economato' : 'Portal de Pedidos'}
                </h1>
                 <button onClick={handleExport} className="no-print bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 flex items-center">
                    <DownloadIcon className="w-5 h-5 mr-2" />
                    Exportar a CSV
                </button>
            </div>
            {isEconomatoMode && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                    <p className="text-blue-700 font-medium">Modo Reposición Mini-Economato</p>
                    <p className="text-sm text-blue-600">Los pedidos realizados aquí se cargarán al stock del Mini-Economato.</p>
                </div>
            )}
            <Card title="Eventos Activos">
                {activeEvents.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-center">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                <tr>
                                    <th className="px-4 py-2 text-left">Evento</th>
                                    <th className="px-4 py-2">Finaliza</th>
                                    <th className="px-4 py-2">{isEconomatoMode ? 'Estado Pedido Economato' : 'Estado de Mi Pedido'}</th>
                                    <th className="px-4 py-2">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeEvents.map(event => {
                                    const myOrder = getMyOrderForEvent(event);
                                    const linkSuffix = isEconomatoMode ? '?type=economato' : '';
                                    return (
                                        <tr key={event.id} className="border-b dark:border-gray-700">
                                            <td className="px-4 py-3 font-medium text-left">{event.name}</td>
                                            <td className="px-4 py-3">{new Date(event.end_date).toLocaleString()}</td>
                                            <td className="px-4 py-3">{myOrder ? myOrder.status : 'No realizado'}</td>
                                            <td className="px-4 py-3 no-print">
                                                {myOrder ? (
                                                    <Link to={`/teacher/order-portal/edit/${myOrder.id}${linkSuffix}`} className="text-primary-600 hover:underline">
                                                        {myOrder.status === 'Procesado' ? 'Ver' : 'Editar'}
                                                    </Link>
                                                ) : (
                                                    <Link to={`/teacher/order-portal/new/${event.id}${linkSuffix}`} className="text-green-600 hover:underline font-bold">Crear Pedido</Link>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="p-4 text-center text-gray-500">No hay eventos de pedido activos actualmente.</p>
                )}
            </Card>

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
