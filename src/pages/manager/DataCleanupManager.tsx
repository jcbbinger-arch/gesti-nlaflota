import React, { useMemo, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../../components/Card';
import { TrashIcon } from '../../components/icons';
import { Order } from '../../types';

export const DataCleanupManager: React.FC = () => {
    const { orders, users, setOrders } = useData();
    const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());

    const ghostOrders = useMemo(() => {
        const userIds = new Set(users.map(u => u.id));
        return orders.filter(order => {
            const hasNoAuthor = !order.user_id || !userIds.has(order.user_id);
            const hasNoItems = order.items.length === 0;
            const isOldDraft = order.status === 'Borrador' && new Date(order.date).getTime() < Date.now() - (30 * 24 * 60 * 60 * 1000);
            return hasNoAuthor || hasNoItems || isOldDraft;
        });
    }, [orders, users]);

    const handleToggleOrder = (orderId: string) => {
        const newSet = new Set(selectedOrders);
        if (newSet.has(orderId)) newSet.delete(orderId);
        else newSet.add(orderId);
        setSelectedOrders(newSet);
    };

    const handleBulkDelete = () => {
        if (selectedOrders.size === 0) return;
        if (window.confirm(`¿Estás seguro de que quieres borrar ${selectedOrders.size} pedidos seleccionados? Esta acción no se puede deshacer.`)) {
            const newOrders = orders.filter(o => !selectedOrders.has(o.id));
            setOrders(newOrders);
            setSelectedOrders(new Set());
            alert('Pedidos eliminados exitosamente.');
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6">Limpieza de Pedidos Fantasma</h1>
            
            <Card title={`Pedidos Detectados para Limpieza (${ghostOrders.length})`}>
                {ghostOrders.length === 0 ? (
                    <p className="text-green-600">No se encontraron pedidos fantasma. ¡Todo está limpio!</p>
                ) : (
                    <>
                        <div className="mb-4 flex justify-between items-center">
                            <p className="text-sm text-gray-600">Selecciona los pedidos que deseas eliminar permanentemente.</p>
                            <button 
                                onClick={handleBulkDelete}
                                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 font-bold flex items-center"
                                disabled={selectedOrders.size === 0}
                            >
                                <TrashIcon className="w-5 h-5 mr-2" /> Borrar Seleccionados ({selectedOrders.size})
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-100 dark:bg-gray-700">
                                    <tr>
                                        <th className="p-2 w-10"></th>
                                        <th className="p-2">Fecha</th>
                                        <th className="p-2">Autor ID</th>
                                        <th className="p-2">Items</th>
                                        <th className="p-2">Estado</th>
                                        <th className="p-2">Razón</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {ghostOrders.map(order => {
                                        const userExists = users.some(u => u.id === order.user_id);
                                        const reasons = [];
                                        if (!order.user_id || !userExists) reasons.push('Sin autor válido');
                                        if (order.items.length === 0) reasons.push('Sin ítems');
                                        if (order.status === 'Borrador') reasons.push('Borrador antiguo');
                                        
                                        return (
                                            <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                <td className="p-2">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedOrders.has(order.id)}
                                                        onChange={() => handleToggleOrder(order.id)}
                                                    />
                                                </td>
                                                <td className="p-2">{new Date(order.date).toLocaleDateString()}</td>
                                                <td className="p-2">{order.user_id || 'N/A'}</td>
                                                <td className="p-2">{order.items.length}</td>
                                                <td className="p-2">{order.status}</td>
                                                <td className="p-2 text-red-600">{reasons.join(', ')}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </Card>
        </div>
    );
};
