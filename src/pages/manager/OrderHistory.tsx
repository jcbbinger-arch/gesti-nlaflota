
import React, { useMemo, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../../components/Card';
import { Order, OrderStatus, Profile, Product, Supplier } from '../../types';
import { DownloadIcon, MagnifyingGlassIcon } from '../../components/icons';
import { exportToCsv } from '../../utils/export';

export const OrderHistory: React.FC = () => {
    const { orders, users, events, products, suppliers } = useData();
    const [filterStatus, setFilterStatus] = useState<OrderStatus | 'Todos'>('Todos');
    const [filterTeacher, setFilterTeacher] = useState<string>('Todos');
    const [filterSupplier, setFilterSupplier] = useState<string>('Todos');
    const [filterProduct, setFilterProduct] = useState<string>('Todos');
    const [searchTerm, setSearchTerm] = useState('');

    const usersMap = useMemo(() => new Map(users.map(u => [u.id, u.name])), [users]);
    const eventsMap = useMemo(() => new Map(events.map(e => [e.id, e.name])), [events]);
    const productsMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);
    const teachers = useMemo(() => users.filter(u => u.profiles.includes(Profile.TEACHER)), [users]);
    const activeSuppliers = useMemo(() => suppliers.filter(s => s.status === 'Activo'), [suppliers]);

    const filteredOrders = useMemo(() => {
        return orders
            .filter(o => filterStatus === 'Todos' || o.status === filterStatus)
            .filter(o => filterTeacher === 'Todos' || o.user_id === filterTeacher)
            .filter(o => {
                if (filterSupplier === 'Todos') return true;
                return o.items.some(item => {
                    const p = productsMap.get(item.product_id);
                    return p?.suppliers.some(s => s.supplier_id === filterSupplier);
                });
            })
            .filter(o => filterProduct === 'Todos' || o.items.some(item => item.product_id === filterProduct))
            .filter(o => {
                if (!searchTerm) return true;
                const teacherName = usersMap.get(o.user_id)?.toLowerCase() || '';
                const eventName = eventsMap.get(o.event_id)?.toLowerCase() || '';
                const productNames = o.items.map(i => productsMap.get(i.product_id)?.name?.toLowerCase() || '').join(' ');
                return teacherName.includes(searchTerm.toLowerCase()) || 
                       eventName.includes(searchTerm.toLowerCase()) ||
                       productNames.includes(searchTerm.toLowerCase()) ||
                       o.notes?.toLowerCase().includes(searchTerm.toLowerCase());
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [orders, filterStatus, filterTeacher, filterSupplier, filterProduct, searchTerm, usersMap, eventsMap, productsMap]);

    const handleExport = () => {
        const dataToExport = filteredOrders.map(o => ({
            fecha: new Date(o.date).toLocaleString(),
            profesor: usersMap.get(o.user_id) || 'N/A',
            evento: eventsMap.get(o.event_id) || 'N/A',
            estado: o.status,
            coste: o.cost?.toFixed(2) + '€',
            notas: o.notes
        }));
        exportToCsv('historial_pedidos_general.csv', dataToExport);
    }
    
    const allStatuses: OrderStatus[] = ['Borrador', 'Enviado', 'Procesado', 'Recibido Parcial', 'Recibido OK', 'Completado', 'Cancelado'];

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Historial de Pedidos</h1>
                <button onClick={handleExport} className="no-print bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 flex items-center">
                    <DownloadIcon className="w-5 h-5 mr-2" />
                    Exportar a CSV
                </button>
            </div>
            
            <Card>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg no-print">
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Buscar:</label>
                        <div className="relative mt-1">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                                type="text"
                                placeholder="Profesor, evento, producto..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-9 p-2 border rounded-md dark:bg-gray-800 dark:border-gray-600"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtrar por Estado:</label>
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} className="w-full mt-1 p-2 border rounded-md dark:bg-gray-800 dark:border-gray-600">
                            <option value="Todos">Todos</option>
                            {allStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtrar por Profesor:</label>
                        <select value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)} className="w-full mt-1 p-2 border rounded-md dark:bg-gray-800 dark:border-gray-600">
                            <option value="Todos">Todos</option>
                            {teachers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtrar por Proveedor:</label>
                        <select value={filterSupplier} onChange={e => setFilterSupplier(e.target.value)} className="w-full mt-1 p-2 border rounded-md dark:bg-gray-800 dark:border-gray-600">
                            <option value="Todos">Todos</option>
                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtrar por Producto:</label>
                        <select value={filterProduct} onChange={e => setFilterProduct(e.target.value)} className="w-full mt-1 p-2 border rounded-md dark:bg-gray-800 dark:border-gray-600">
                            <option value="Todos">Todos</option>
                            {products.filter(p => p.status === 'Activo').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                           <tr>
                                <th className="px-4 py-3">Fecha</th>
                                <th className="px-4 py-3">Profesor</th>
                                <th className="px-4 py-3">Evento</th>
                                <th className="px-4 py-3">Estado</th>
                                <th className="px-4 py-3 text-right">Coste</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.map(order => (
                                <tr key={order.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-4 py-2">{new Date(order.date).toLocaleDateString()}</td>
                                    <td className="px-4 py-2">{usersMap.get(order.user_id)}</td>
                                    <td className="px-4 py-2">{eventsMap.get(order.event_id)}</td>
                                    <td className="px-4 py-2">{order.status}</td>
                                    <td className="px-4 py-2 text-right font-mono">{order.cost?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};
