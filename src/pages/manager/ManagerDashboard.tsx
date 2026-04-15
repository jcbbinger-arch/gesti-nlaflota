import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { Card } from '../../components/Card';
import { EventIcon, ProductIcon, SupplierIcon, HistoryIcon, DownloadIcon } from '../../components/icons';
import { printPage } from '../../utils/export';

const StatCard: React.FC<{ title: string; icon: React.ReactNode; value: string | number; color: string }> = ({ title, icon, value, color }) => (
    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 flex items-center border-t-4 border-primary-500">
        <div className={`p-3 rounded-full ${color} mr-4`}>
            {icon}
        </div>
        <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">{value}</p>
        </div>
    </div>
);

export const ManagerDashboard: React.FC = () => {
    const { events, orders, mini_economato_stock, products, suppliers, incidents, sales } = useData();
    const now = new Date();
    
    const pendingOrderCount = useMemo(() => {
        return orders.filter(o => o.status === 'Enviado').length;
    }, [orders]);

    const lowStockItems = useMemo(() => {
        return mini_economato_stock.filter(item => item.stock <= item.min_stock);
    }, [mini_economato_stock]);

    const activeEvents = events.filter(e => new Date(e.end_date) > now);

    const openIncidents = useMemo(() => {
        return incidents.filter(i => i.status !== 'Resuelta');
    }, [incidents]);

    const totalSalesThisMonth = useMemo(() => {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return sales
            .filter(s => new Date(s.date) >= startOfMonth)
            .reduce((sum, s) => sum + s.amount, 0);
    }, [sales, now]);

    const productsMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Panel del Encargado</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Resumen general y accesos rápidos a la gestión del centro.</p>
                </div>
                <button onClick={printPage} className="no-print bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 flex items-center transition-colors">
                    <DownloadIcon className="w-5 h-5 mr-2" />
                    Descargar PDF
                </button>
            </div>

            {/* Key Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                 <StatCard 
                    title="Pedidos Pendientes" 
                    icon={<ProductIcon className="w-6 h-6 text-white"/>} 
                    value={pendingOrderCount} 
                    color="bg-yellow-500" 
                />
                 <StatCard 
                    title="Eventos Activos" 
                    icon={<EventIcon className="w-6 h-6 text-white"/>} 
                    value={activeEvents.length} 
                    color="bg-blue-500" 
                />
                 <StatCard 
                    title="Incidencias Abiertas" 
                    icon={<HistoryIcon className="w-6 h-6 text-white"/>} 
                    value={openIncidents.length} 
                    color="bg-red-500" 
                />
                 <StatCard 
                    title="Ventas del Mes" 
                    icon={<DownloadIcon className="w-6 h-6 text-white rotate-180"/>} 
                    value={totalSalesThisMonth.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })} 
                    color="bg-green-500" 
                />
                 <StatCard 
                    title="Total Productos" 
                    icon={<ProductIcon className="w-6 h-6 text-white"/>} 
                    value={products.length} 
                    color="bg-indigo-500" 
                />
                 <StatCard 
                    title="Proveedores" 
                    icon={<SupplierIcon className="w-6 h-6 text-white"/>} 
                    value={suppliers.length} 
                    color="bg-purple-500" 
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Events and Stock */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Active Events with Pending Orders */}
                    <Card title="Eventos con Pedidos Pendientes">
                        {activeEvents.length > 0 ? (
                            <div className="space-y-4">
                                {(() => {
                                    const eventsWithPending = activeEvents.map(event => {
                                        const pendingCount = orders.filter(o => o.event_id === event.id && o.status === 'Enviado').length;
                                        if (pendingCount === 0) return null;
                                        return (
                                            <div key={event.id} className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-900/30 rounded-lg flex justify-between items-center">
                                                <div>
                                                    <p className="font-semibold text-gray-800 dark:text-gray-200">{event.name}</p>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">{pendingCount} pedidos de profesores pendientes de procesar.</p>
                                                </div>
                                                <Link to={`/almacen/process-orders/${event.id}`} className="bg-yellow-500 text-white py-2 px-4 rounded-md hover:bg-yellow-600 no-print transition-colors shadow-sm">
                                                    Procesar
                                                </Link>
                                            </div>
                                        );
                                    }).filter(Boolean);

                                    return eventsWithPending.length > 0 ? eventsWithPending : (
                                        <p className="text-gray-500 italic">No hay pedidos pendientes en los eventos activos.</p>
                                    );
                                })()}
                            </div>
                        ) : (
                            <p className="text-gray-500 italic">No hay eventos activos en este momento.</p>
                        )}
                    </Card>

                    {/* Low Stock Items */}
                    <Card title="Alertas de Stock (Mini-Economato)">
                        {lowStockItems.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                        <tr>
                                            <th className="px-4 py-2">Producto</th>
                                            <th className="px-4 py-2 text-center">Stock Actual</th>
                                            <th className="px-4 py-2 text-center">Mínimo</th>
                                            <th className="px-4 py-2 text-right">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {lowStockItems.map(item => {
                                            const product = productsMap.get(item.id);
                                            return (
                                                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{product?.name || 'Producto desconocido'}</td>
                                                    <td className="px-4 py-3 text-center">{item.stock} {product?.unit}</td>
                                                    <td className="px-4 py-3 text-center text-gray-500">{item.min_stock} {product?.unit}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.stock === 0 ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'}`}>
                                                            {item.stock === 0 ? 'Sin Stock' : 'Bajo Stock'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-gray-500 italic">Todos los productos del mini-economato tienen stock suficiente.</p>
                        )}
                        <div className="mt-4 flex justify-end">
                            <Link to="/almacen/mini-economato" className="text-primary-600 hover:underline text-sm font-medium">Gestionar Mini-Economato &rarr;</Link>
                        </div>
                    </Card>
                </div>

                {/* Right Column: Quick Actions and Recent Incidents */}
                <div className="space-y-8">
                    <Card title="Accesos Rápidos">
                        <div className="grid grid-cols-1 gap-3">
                            <Link to="/almacen/process-orders" className="flex items-center p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                                <div className="p-2 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-600 mr-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    <ProductIcon className="w-5 h-5" />
                                </div>
                                <span className="font-medium">Procesar Pedidos</span>
                            </Link>
                            <Link to="/almacen/economato" className="flex items-center p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                                <div className="p-2 rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-600 mr-3 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                    <SupplierIcon className="w-5 h-5" />
                                </div>
                                <span className="font-medium">Recepción y Economato</span>
                            </Link>
                            <Link to="/almacen/mini-economato" className="flex items-center p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                                <div className="p-2 rounded-md bg-green-100 dark:bg-green-900/30 text-green-600 mr-3 group-hover:bg-green-600 group-hover:text-white transition-colors">
                                    <HistoryIcon className="w-5 h-5" />
                                </div>
                                <span className="font-medium">Mini-Economato</span>
                            </Link>
                            <Link to="/almacen/warehouse-order" className="flex items-center p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                                <div className="p-2 rounded-md bg-orange-100 dark:bg-orange-900/30 text-orange-600 mr-3 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                                    <EventIcon className="w-5 h-5" />
                                </div>
                                <span className="font-medium">Pedido de Reposición</span>
                            </Link>
                            <Link to="/almacen/order-history" className="flex items-center p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                                <div className="p-2 rounded-md bg-gray-100 dark:bg-gray-900/30 text-gray-600 mr-3 group-hover:bg-gray-600 group-hover:text-white transition-colors">
                                    <HistoryIcon className="w-5 h-5" />
                                </div>
                                <span className="font-medium">Historial de Pedidos</span>
                            </Link>
                        </div>
                    </Card>

                    <Card title="Incidencias Recientes">
                        {openIncidents.length > 0 ? (
                            <div className="space-y-4">
                                {openIncidents.slice(0, 5).map(incident => (
                                    <div key={incident.id} className="text-sm border-l-4 border-red-500 pl-3 py-1">
                                        <p className="font-semibold text-gray-800 dark:text-gray-200">{incident.description}</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {new Date(incident.date).toLocaleDateString()} | {incident.status}
                                        </p>
                                    </div>
                                ))}
                                {openIncidents.length > 5 && (
                                    <p className="text-xs text-center text-gray-500 italic">Y {openIncidents.length - 5} más...</p>
                                )}
                            </div>
                        ) : (
                            <p className="text-gray-500 italic text-sm">No hay incidencias abiertas.</p>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
};