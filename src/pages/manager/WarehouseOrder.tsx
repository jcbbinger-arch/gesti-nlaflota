import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useCompany } from '../../contexts/CompanyContext';
import { useCreator } from '../../contexts/CreatorContext';
import { Card } from '../../components/Card';
import { Order, Product, StockItem, Message } from '../../types';
import { Trash2, Printer, Eye } from 'lucide-react';
import { exportIndividualOrderPdf } from '../../utils/export';

// Component to select an order
const OrderSelector: React.FC = () => {
    const { orders, users, setOrders, products, events } = useData();
    const { companyInfo } = useCompany();
    const { creatorInfo } = useCreator();
    const now = new Date();
    
    // Show all orders that are not 'Procesado' (active or future)
    const activeOrders = orders.filter(o => o.status !== 'Procesado');

    const handleDeleteOrder = (e: React.MouseEvent, orderId: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (window.confirm('¿Estás seguro de que deseas eliminar este pedido?')) {
            setOrders(prev => prev.filter(o => o.id !== orderId));
        }
    };

    const handlePrintOrder = (e: React.MouseEvent, order: Order) => {
        e.preventDefault();
        e.stopPropagation();
        const user = users.find(u => u.id === order.user_id);
        const event = events.find(e => e.id === order.event_id);
        const productsMap = new Map(products.map(p => [p.id, p]));
        
        exportIndividualOrderPdf(
            order,
            event?.name || 'General',
            productsMap,
            companyInfo,
            user?.name || 'Desconocido',
            creatorInfo.app_name
        );
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6">Asignación de Stock a Pedidos</h1>
            <Card title="Selecciona un Pedido Activo">
                {activeOrders.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3">
                        {activeOrders.map(order => {
                            const user = users.find(u => u.id === order.user_id);
                            return (
                                <div key={order.id} className="group relative flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-all border border-transparent hover:border-primary-100">
                                    <Link to={`/almacen/warehouse-order/${order.id}`} className="flex-grow">
                                        <p className="font-bold text-gray-900 dark:text-white">Pedido {order.id} - {user?.name || 'Desconocido'}</p>
                                        <p className="text-sm text-gray-500">Estado: {order.status} | Fecha: {new Date(order.date).toLocaleDateString()}</p>
                                    </Link>
                                    <div className="flex items-center space-x-2 no-print">
                                        <button 
                                            onClick={(e) => handlePrintOrder(e, order)}
                                            className="p-2 text-gray-400 hover:text-primary-600 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-colors"
                                            title="Imprimir / Ver PDF"
                                        >
                                            <Printer className="w-5 h-5" />
                                        </button>
                                        <button 
                                            onClick={(e) => handleDeleteOrder(e, order.id)}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-colors"
                                            title="Eliminar Pedido"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                        <Link 
                                            to={`/almacen/warehouse-order/${order.id}`}
                                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-colors"
                                            title="Gestionar Stock"
                                        >
                                            <Eye className="w-5 h-5" />
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : <p className="text-center py-10 text-gray-400">No hay pedidos activos en este momento.</p>}
            </Card>
        </div>
    );
};



// Component for the assignment form
const AssignmentForm: React.FC<{ order: Order }> = ({ order }) => {
    const navigate = useNavigate();
    const { products, mini_economato_stock, setOrders, setMiniEconomatoStock, setMessages, users } = useData();
    const [selectedProductId, setSelectedProductId] = useState('');
    const [quantity, setQuantity] = useState(1);
    
    const productsMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);
    const stockMap = useMemo(() => new Map(mini_economato_stock.map(s => [s.id, s])), [mini_economato_stock]);

    const handleAssign = () => {
        const product = productsMap.get(selectedProductId);
        const stockItem = stockMap.get(selectedProductId);
        
        if (!product || !stockItem || stockItem.stock < quantity) {
            alert("Producto no encontrado o stock insuficiente.");
            return;
        }

        // 1. Update order
        const updatedOrder = {
            ...order,
            items: [...order.items, { product_id: selectedProductId, quantity, price: 0, tax: product.tax }], // Assigned as extra
            cost: (order.cost || 0) // Should ideally update cost
        };
        setOrders(prev => prev.map(o => o.id === order.id ? updatedOrder : o));

        // 2. Update stock
        setMiniEconomatoStock(prev => prev.map(s => s.id === selectedProductId ? { ...s, stock: s.stock - quantity } : s));

        // 3. Send message
        const newMessage: Message = {
            id: `msg-${Date.now()}`,
            sender_id: '0', // Warehouse ID
            recipient_ids: [order.user_id],
            subject: 'Asignación de Stock Extra',
            body: `Se le han asignado ${quantity} ${product.unit} de ${product.name} a su pedido de la semana.`,
            date: new Date().toISOString(),
            read_by: {}
        };
        setMessages(prev => [...prev, newMessage]);

        alert('Stock asignado y mensaje enviado.');
        navigate('/almacen/warehouse-order');
    };

    return (
        <div>
            <Link to="/almacen/warehouse-order" className="text-sm text-primary-600 hover:underline mb-4 block">&larr; Cambiar pedido</Link>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6">Asignar Stock al Pedido: {order.id}</h1>
            
            <Card title="Resumen del Pedido" className="mb-6">
                <p><strong>Profesor:</strong> {users.find(u => u.id === order.user_id)?.name}</p>
                <p><strong>Estado:</strong> {order.status}</p>
                <div className="mt-2 space-y-2">
                    {order.items.map(item => {
                        const product = productsMap.get(item.product_id);
                        return (
                            <div key={item.product_id} className="text-sm flex items-center space-x-3 p-1 border-b border-gray-100 dark:border-gray-700 last:border-0">
                                <div className="w-8 h-8 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                                    <img 
                                        src={product?.image || `https://picsum.photos/seed/${encodeURIComponent(product?.name || '')}/80/80`} 
                                        alt={product?.name} 
                                        className="w-full h-full object-cover" 
                                        referrerPolicy="no-referrer"
                                    />
                                </div>
                                <span>{product?.name}: {item.quantity} {product?.unit}</span>
                            </div>
                        );
                    })}
                </div>
            </Card>

            <Card title="Buscar y Asignar Producto del Stock">
                <div className="space-y-4">
                    <select 
                        className="w-full p-2 border rounded dark:bg-gray-700"
                        value={selectedProductId}
                        onChange={e => setSelectedProductId(e.target.value)}
                    >
                        <option value="">Selecciona un producto del stock...</option>
                        {mini_economato_stock.map(s => {
                            const product = productsMap.get(s.id);
                            return product ? (
                                <option key={s.id} value={s.id}>{product.name} (Stock: {s.stock})</option>
                            ) : null;
                        })}
                    </select>
                    <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={e => setQuantity(Number(e.target.value))}
                        className="w-full p-2 border rounded dark:bg-gray-700"
                        placeholder="Cantidad"
                    />
                    <button 
                        onClick={handleAssign} 
                        disabled={order.status !== 'Cerrado'}
                        className={`w-full text-white p-2 rounded ${order.status === 'Cerrado' ? 'bg-primary-600 hover:bg-primary-700' : 'bg-gray-400 cursor-not-allowed'}`}
                    >
                        {order.status === 'Cerrado' ? 'Asignar al Pedido' : 'Pedido no cerrado'}
                    </button>
                </div>
            </Card>
        </div>
    );
};

// Main component
export const WarehouseOrder: React.FC = () => {
    const { orderId } = useParams<{ orderId?: string }>();
    const { orders } = useData();
    const order = useMemo(() => orders.find(o => o.id === orderId), [orders, orderId]);

    if (orderId && order) {
        return <AssignmentForm order={order} />;
    }
    return <OrderSelector />;
};
