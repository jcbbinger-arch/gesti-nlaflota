import React from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/Card';
import { EventIcon, PlusIcon, HistoryIcon, RecipeIcon, SaleIcon, DownloadIcon } from '../../components/icons';
import { printPage } from '../../utils/export';
import { Profile } from '../../types';

export const TeacherDashboard: React.FC = () => {
    const { events, orders } = useData();
    const { currentUser, selectedProfile } = useAuth();

    const isStudent = selectedProfile === Profile.STUDENT;
    const basePath = isStudent ? '/student' : '/teacher';

    const now = new Date();
    const activeEvents = events.filter(e => new Date(e.start_date) <= now && new Date(e.end_date) >= now);
    
    const myRecentOrders = orders
        .filter(o => o.user_id === currentUser?.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 3);
    
    const eventsMap = new Map(events.map(e => [e.id, e.name]));

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Bienvenido, {currentUser?.name}</h1>
                <button onClick={printPage} className="no-print bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 flex items-center">
                    <DownloadIcon className="w-5 h-5 mr-2" />
                    Descargar PDF
                </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card title="Eventos de Pedido Activos" icon={<EventIcon className="w-8 h-8"/>}>
                        {activeEvents.length > 0 ? (
                            <ul className="space-y-3">
                                {activeEvents.map(event => (
                                    <li key={event.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg flex justify-between items-center">
                                        <div>
                                            <p className="font-semibold">{event.name}</p>
                                            <p className="text-sm text-gray-500">Finaliza el {new Date(event.end_date).toLocaleDateString()}</p>
                                        </div>
                                        <Link to={`${basePath}/order-portal/new/${event.id}`} className="bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 no-print">
                                            Realizar Pedido
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p>No hay eventos de pedido activos en este momento.</p>
                        )}
                    </Card>
                    <Card title="Mis Últimos Pedidos" icon={<HistoryIcon className="w-8 h-8"/>}>
                        {myRecentOrders.length > 0 ? (
                             <ul className="space-y-2">
                                {myRecentOrders.map(order => (
                                    <li key={order.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md flex justify-between">
                                        <span>Pedido para <strong>{eventsMap.get(order.event_id) || 'Evento desconocido'}</strong></span>
                                        <span className="font-mono">{order.cost?.toFixed(2)}€</span>
                                    </li>
                                ))}
                            </ul>
                        ) : <p>Aún no has realizado ningún pedido.</p>}
                         <Link to={`${basePath}/order-history`} className="text-primary-600 hover:underline mt-4 block text-center no-print">Ver todos mis pedidos</Link>
                    </Card>
                </div>
                <div>
                    <Card title="Acciones Rápidas" icon={<PlusIcon className="w-8 h-8"/>}>
                         <div className="flex flex-col space-y-3 no-print">
                            <Link to={`${basePath}/order-portal`} className="w-full text-center bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 transition">Portal de Pedidos</Link>
                            <Link to={`${basePath}/recipes`} className="w-full text-center bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition">Mis Recetas</Link>
                            {!isStudent && (
                                <Link to={`${basePath}/sales`} className="w-full text-center bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition">Ventas</Link>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};