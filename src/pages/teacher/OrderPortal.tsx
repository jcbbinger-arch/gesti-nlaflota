import React from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/Card';
import { Event, Profile } from '../../types';
import { DownloadIcon } from '../../components/icons';
import { exportToCsv } from '../../utils/export';

export const OrderPortal: React.FC = () => {
    const { events, orders } = useData();
    const { currentUser } = useAuth();
    const isAlmacen = currentUser?.profiles.includes(Profile.ALMACEN);
    
    const now = new Date();
    const upcomingEvents = events
        .filter(e => e.status !== 'Inactivo' && new Date(e.end_date) >= now)
        .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
    const activeEvents = upcomingEvents.slice(0, 3);

    const getMyOrderForEvent = (event: Event) => {
        return orders.find(o => o.user_id === currentUser?.id && o.event_id === event.id);
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
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Portal de Pedidos</h1>
                 <button onClick={handleExport} className="no-print bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 flex items-center">
                    <DownloadIcon className="w-5 h-5 mr-2" />
                    Exportar a CSV
                </button>
            </div>
            <Card title="Eventos Activos">
                {activeEvents.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                <tr>
                                    <th className="px-4 py-2">Evento</th>
                                    <th className="px-4 py-2">Finaliza</th>
                                    <th className="px-4 py-2">Estado de Mi Pedido</th>
                                    <th className="px-4 py-2">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeEvents.map(event => {
                                    const myOrder = getMyOrderForEvent(event);
                                    return (
                                        <tr key={event.id} className="border-b dark:border-gray-700">
                                            <td className="px-4 py-3 font-medium">{event.name}</td>
                                            <td className="px-4 py-3">{new Date(event.end_date).toLocaleString()}</td>
                                            <td className="px-4 py-3">{myOrder ? myOrder.status : 'No realizado'}</td>
                                            <td className="px-4 py-3 no-print">
                                                {myOrder ? (
                                                    <Link to={`/teacher/order-portal/edit/${myOrder.id}`} className="text-primary-600 hover:underline">
                                                        {myOrder.status === 'Procesado' ? 'Ver' : 'Editar'}
                                                    </Link>
                                                ) : (
                                                    <Link to={`/teacher/order-portal/new/${event.id}`} className="text-green-600 hover:underline">Crear Pedido</Link>
                                                )}
                                                <span className="ml-2 text-sm text-gray-500">{myOrder?.status}</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p>No hay eventos de pedido activos actualmente.</p>
                )}
            </Card>
        </div>
    );
};
