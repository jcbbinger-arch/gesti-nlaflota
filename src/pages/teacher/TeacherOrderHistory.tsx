
import React, { useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useCompany } from '../../contexts/CompanyContext';
import { Profile, Order, Product } from '../../types';
import { Card } from '../../components/Card';
import { DownloadIcon, PrinterIcon } from '../../components/icons';
import { printPage, exportIndividualOrderPdf } from '../../utils/export';
import { PrintHeader } from '../../components/PrintHeader';

export const TeacherOrderHistory: React.FC<{ hideTitle?: boolean }> = ({ hideTitle = false }) => {
    const { orders, events, products } = useData();
    const { currentUser, isOwner } = useAuth();
    const { companyInfo } = useCompany();
    
    const productsMap = useMemo(() => new Map<string, Product>(products.map(p => [p.id, p])), [products]);
    const eventsMap = useMemo(() => new Map(events.map(e => [e.id, e.name])), [events]);

    const isAlmacen = currentUser?.profiles.includes(Profile.ALMACEN);
    
    const myOrders = useMemo(() => {
        if (!currentUser) return [];
        return orders
            .filter(o => isOwner(o.user_id) || (isAlmacen && o.is_economato_order))
            .sort((a, b) => {
                const dateA = a.date ? new Date(a.date).getTime() : 0;
                const dateB = b.date ? new Date(b.date).getTime() : 0;
                return dateB - dateA;
            });
    }, [orders, currentUser, isAlmacen]);

    const handlePrintOrder = (e: React.MouseEvent, order: Order) => {
        e.preventDefault();
        e.stopPropagation();
        if (!companyInfo) return;
        
        const eventName = eventsMap.get(order.event_id) || 'Evento Desconocido';
        
        exportIndividualOrderPdf(
            order,
            eventName,
            productsMap,
            companyInfo,
            currentUser?.name || 'Usuario',
            'Manager Pro'
        );
    };

    return (
        <div>
            {companyInfo && (
                <PrintHeader 
                    companyInfo={companyInfo} 
                    currentUser={currentUser || undefined}
                />
            )}
            {!hideTitle && (
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Mi Historial de Pedidos</h1>
                    <button onClick={printPage} className="no-print bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 flex items-center">
                        <DownloadIcon className="w-5 h-5 mr-2" />
                        Descargar PDF
                    </button>
                </div>
            )}
            {hideTitle && (
                <div className="flex justify-end mb-4 no-print">
                    <button onClick={printPage} className="text-gray-500 hover:text-gray-700 flex items-center text-xs font-bold uppercase tracking-widest transition-colors">
                        <DownloadIcon className="w-4 h-4 mr-1" />
                        PDF
                    </button>
                </div>
            )}
            
            <Card>
                {myOrders.length > 0 ? (
                    <div className="space-y-4">
                        {myOrders.map(order => (
                            <details key={order.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg print:block print:p-0 print:border-b print:mb-4">
                                <summary className="font-semibold cursor-pointer flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span>Pedido para "{eventsMap.get(order.event_id)}" - {new Date(order.date).toLocaleDateString()}</span>
                                        {order.is_economato_order && (
                                            <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full border border-blue-200 uppercase font-bold">ECONOMATO</span>
                                        )}
                                        {order.order_type === 'service' && (
                                            <span className="bg-primary-100 text-primary-700 text-[10px] px-2 py-0.5 rounded-full border border-primary-200 uppercase font-bold">SERVICIO</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="font-mono text-sm">{order.status} - {order.cost?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
                                        <button 
                                            onClick={(e) => handlePrintOrder(e, order)}
                                            className="no-print p-1.5 bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100 transition-colors"
                                            title="Descargar PDF de este pedido"
                                        >
                                            <PrinterIcon className="w-4 h-4" />
                                        </button>
                                    </div>
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
