
import React, { useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/Card';
import { DownloadIcon } from '../../components/icons';
import { printPage } from '../../utils/export';

export const TeacherOrderHistory: React.FC = () => {
    const { orders, events, products } = useData();
    const { currentUser } = useAuth();
    
    const productsMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);
    const eventsMap = useMemo(() => new Map(events.map(e => [e.id, e.name])), [events]);

    const myOrders = useMemo(() => {
        if (!currentUser) return [];
        return orders
            .filter(o => o.user_id === currentUser.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [orders, currentUser]);

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Mi Historial de Pedidos</h1>
                <button onClick={printPage} className="no-print bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 flex items-center">
                    <DownloadIcon className="w-5 h-5 mr-2" />
                    Descargar PDF
                </button>
            </div>
            
            <Card>
                {myOrders.length > 0 ? (
                    <div className="space-y-4">
                        {myOrders.map(order => (
                            <details key={order.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg print:block print:p-0 print:border-b print:mb-4">
                                <summary className="font-semibold cursor-pointer flex justify-between">
                                    <span>Pedido para "{eventsMap.get(order.event_id)}" - {new Date(order.date).toLocaleDateString()}</span>
                                    <span className="font-mono">{order.status} - {order.cost?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
                                </summary>
                                <div className="mt-4 pt-4 border-t dark:border-gray-600">
                                    <h4 className="font-bold">Artículos del Pedido:</h4>
                                    <ul className="list-disc list-inside text-sm mt-2">
                                        {order.items.map(item => {
                                            const product = productsMap.get(item.product_id);
                                            return (
                                            <li key={item.product_id}>
                                                {product?.name || 'Producto Desconocido'}: {item.quantity} {product?.unit} x {item.price.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                                            </li>
                                        )})}
                                    </ul>
                                    {order.new_product_requests && order.new_product_requests.length > 0 && (
                                        <>
                                            <h4 className="font-bold mt-3">Solicitudes de Nuevos Productos:</h4>
                                            <ul className="list-disc list-inside text-sm mt-2">
                                            {order.new_product_requests.map((req, index) => (
                                                <li key={index}>
                                                    {req.product_name} (x{req.quantity}) - Notas: {req.notes}
                                                </li>
                                            ))}
                                            </ul>
                                        </>
                                    )}
                                    {order.notes && <p className="mt-2 text-sm"><strong>Notas del pedido:</strong> {order.notes}</p>}
                                </div>
                            </details>
                        ))}
                    </div>
                ) : (
                    <p>No has realizado ningún pedido todavía.</p>
                )}
            </Card>
        </div>
    );
};
