
import React, { useMemo, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../../components/Card';
import { Order, OrderStatus, Profile } from '../../types';
import { DownloadIcon } from '../../components/icons';
import { exportToCsv } from '../../utils/export';

export const OrderHistory: React.FC = () => {
    const { orders, users, events } = useData();
    const [filterStatus, setFilterStatus] = useState<OrderStatus | 'Todos'>('Todos');
    const [filterTeacher, setFilterTeacher] = useState<string>('Todos');

    const usersMap = useMemo(() => new Map(users.map(u => [u.id, u.name])), [users]);
    const eventsMap = useMemo(() => new Map(events.map(e => [e.id, e.name])), [events]);
    const teachers = useMemo(() => users.filter(u => u.profiles.includes(Profile.TEACHER)), [users]);

    const filteredOrders = useMemo(() => {
        return orders
            .filter(o => filterStatus === 'Todos' || o.status === filterStatus)
            .filter(o => filterTeacher === 'Todos' || o.user_id === filterTeacher)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [orders, filterStatus, filterTeacher]);

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
                <div className="flex flex-wrap gap-4 mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg no-print">
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
