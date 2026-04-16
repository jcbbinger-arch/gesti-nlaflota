import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/Card';
import { Event, Order, OrderItem, Product, NewProductRequest, Profile } from '../../types';
import { BlockedAccess } from '../shared/BlockedAccess';
import { TrashIcon, PlusIcon } from '../../components/icons';

export const OrderForm: React.FC = () => {
    const { eventId, orderId } = useParams<{ eventId?: string; orderId?: string }>();
    const [searchParams] = useSearchParams();
    const isEconomatoOrder = searchParams.get('type') === 'economato';
    const navigate = useNavigate();
    const { events, products, orders, setOrders, mini_economato_stock, setMiniEconomatoStock } = useData();
    const { currentUser } = useAuth();
    
    const [orderItems, setOrderItems] = useState<Map<string, number>>(new Map());
    const [pendingQuantities, setPendingQuantities] = useState<Record<string, number>>({});
    const [notes, setNotes] = useState('');
    const [new_requests, set_new_requests] = useState<NewProductRequest[]>([]);
    const [new_request_form, set_new_request_form] = useState({ product_name: '', quantity: 1, notes: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const [isDirty, setIsDirty] = useState(false);

    const existingOrder = useMemo(() => orderId ? orders.find(o => o.id === orderId) : null, [orders, orderId]);
    const isAlmacen = currentUser?.profiles.includes(Profile.ALMACEN);
    const isOwner = currentUser?.id === existingOrder?.user_id;

    const event = useMemo(() => {
        // If it's an economato order, we might need a default event or handle it differently.
        // For now, let's find the first active Regular event.
        if (isEconomatoOrder) {
            const now = new Date();
            return events.find(e => e.type === 'Regular' && new Date(e.start_date) <= now && new Date(e.end_date) >= now);
        }
        return events.find(e => {
            const matchesId = e.id === eventId;
            const matchesOrder = orderId && orders.find(o => o.id === orderId)?.event_id === e.id;
            return matchesId || matchesOrder;
        });
    }, [events, eventId, orderId, orders, isEconomatoOrder]);

    const isEditable = useMemo(() => {
        if (!existingOrder) return true; // New order
        if (existingOrder.status === 'Procesado') return false;
        if (existingOrder.status === 'Cerrado') return !!isAlmacen;
        return !!(isOwner || isAlmacen);
    }, [existingOrder, isAlmacen, isOwner]);
    
    const productsMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);

    const filteredProducts = useMemo(() => {
        if (searchTerm.trim() === '') return [];
        return products.filter(p => 
            p.status === 'Activo' && 
            p.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [products, searchTerm]);

    const groupedProducts = useMemo(() => {
        const groups: Record<string, Product[]> = {};
        filteredProducts.forEach(p => {
            const family = p.family || 'Sin familia';
            if (!groups[family]) groups[family] = [];
            groups[family].push(p);
        });
        return groups;
    }, [filteredProducts]);

    useEffect(() => {
        if (existingOrder) {
            const itemsMap = new Map<string, number>();
            const pendingMap: Record<string, number> = {};
            existingOrder.items.forEach(item => {
                itemsMap.set(item.product_id, item.quantity);
                pendingMap[item.product_id] = item.quantity;
            });
            setOrderItems(itemsMap);
            setPendingQuantities(pendingMap);
            setNotes(existingOrder.notes || '');
            set_new_requests(existingOrder.new_product_requests || []);
        }
    }, [existingOrder]);
    
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);


    const handleQuantityChange = (product_id: string, quantity: number) => {
        setIsDirty(true);
        const newItems = new Map(orderItems);
        if (quantity > 0) {
            newItems.set(product_id, quantity);
        } else {
            newItems.delete(product_id);
        }
        setOrderItems(newItems);
    };
    
    const handleAddRequest = (e: React.FormEvent) => {
        e.preventDefault();
        if(new_request_form.product_name && new_request_form.quantity > 0) {
            setIsDirty(true);
            set_new_requests([...new_requests, { ...new_request_form, quantity: Number(new_request_form.quantity) }]);
            set_new_request_form({ product_name: '', quantity: 1, notes: '' });
        }
    };

    const handleRemoveRequest = (index: number) => {
        setIsDirty(true);
        set_new_requests(new_requests.filter((_, i) => i !== index));
    };

    const calculateTotalCost = useMemo(() => {
        let total = 0;
        orderItems.forEach((quantity, product_id) => {
            const product = productsMap.get(product_id);
            if (product && product.suppliers.length > 0) {
                const price = product.suppliers[0].price; // Simplified: use first supplier's price
                const itemCost = price * quantity;
                const itemCostWithTax = itemCost * (1 + product.tax / 100);
                total += itemCostWithTax;
            }
        });
        return total;
    }, [orderItems, productsMap]);

    const isOverBudget = event ? calculateTotalCost > event.budget_per_teacher : false;

    if (!event) return <Card title="Error">Evento no encontrado.</Card>;

    const handleSubmit = (status: 'Borrador' | 'Enviado' | 'Cerrado') => {
        if (!currentUser) return;
        
        setIsDirty(false);

        const newOrderItems: OrderItem[] = Array.from(orderItems.entries()).map(([product_id, quantity]) => {
            const product = productsMap.get(product_id)!;
            return {
                product_id,
                quantity,
                price: product.suppliers[0]?.price || 0,
                tax: product.tax,
            };
        });

        const orderToSave: Order = {
            id: existingOrder?.id || `ord-${Date.now()}`,
            user_id: isEconomatoOrder ? 'mini-economato' : currentUser.id,
            date: new Date().toISOString(),
            status,
            event_id: event.id,
            items: newOrderItems,
            new_product_requests: new_requests,
            cost: calculateTotalCost,
            notes: notes,
        };
        
        const newOrders = existingOrder 
            ? orders.map(o => o.id === existingOrder.id ? orderToSave : o)
            : [...orders, orderToSave];

        setOrders(newOrders);

        // If it's an economato order, add to mini_economato_stock
        if (isEconomatoOrder && status === 'Enviado') {
            newOrderItems.forEach(item => {
                setMiniEconomatoStock(prev => {
                    const existingItem = prev.find(s => s.id === item.product_id);
                    if (existingItem) {
                        return prev.map(s => s.id === item.product_id ? { ...s, stock: s.stock + item.quantity } : s);
                    } else {
                        return [...prev, { id: item.product_id, stock: item.quantity, min_stock: 0 }];
                    }
                });
            });
        }
        
        setTimeout(() => {
            alert(`Pedido ${status === 'Borrador' ? 'guardado como borrador' : 'enviado'}.`);
            navigate(isEconomatoOrder ? '/almacen/mini-economato' : '/teacher/order-portal');
        }, 100);
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6">Pedido para: {event.name}</h1>
            
            {isOverBudget && (
                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6" role="alert">
                    <p className="font-bold">Aviso de Presupuesto</p>
                    <p>Has superado el tope de gasto de {event.budget_per_teacher.toLocaleString('es-ES', {style: 'currency', currency: 'EUR'})}.</p>
                </div>
            )}

            <Card title="Añadir Productos del Catálogo">
                <div className="flex gap-2 mb-4">
                    <input 
                        type="text" 
                        placeholder="Buscar producto..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full p-2 border rounded dark:bg-gray-700"
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="bg-gray-200 px-4 py-2 rounded">Limpiar</button>
                    )}
                </div>
                {searchTerm.trim() !== '' && Object.entries(groupedProducts).map(([family, familyProducts]) => (
                    <div key={family} className="mb-6">
                        <h3 className="text-lg font-bold mb-3 text-gray-700 dark:text-gray-300 border-b pb-1">{family}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {familyProducts.map(product => (
                                <div key={product.id} className="p-3 border rounded-lg dark:border-gray-600 flex flex-col h-full">
                                    <div className="w-full h-32 mb-3 rounded-md overflow-hidden bg-gray-100">
                                        <img 
                                            src={product.image || `https://picsum.photos/seed/${encodeURIComponent(product.name)}/400/300`} 
                                            alt={product.name} 
                                            className="w-full h-full object-cover" 
                                            referrerPolicy="no-referrer"
                                        />
                                    </div>
                                    <h4 className="font-semibold">{product.name}</h4>
                                    {product.description && (
                                        <p className="text-xs text-gray-400 mt-1 line-clamp-2 italic" title={product.description}>
                                            {product.description}
                                        </p>
                                    )}
                                    <p className="text-sm text-gray-500 mt-auto pt-2">{product.suppliers[0]?.price.toFixed(2) || 'N/A'}€ / {product.unit}</p>
                                    <div className="flex gap-2 mt-2">
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            disabled={!isEditable}
                                            value={pendingQuantities[product.id] || ''}
                                            onChange={e => setPendingQuantities({...pendingQuantities, [product.id]: parseFloat(e.target.value) || 0})}
                                            className="w-full p-1 border rounded dark:bg-gray-700"
                                            placeholder="Cantidad"
                                        />
                                        <button 
                                            disabled={!isEditable}
                                            onClick={() => {
                                                handleQuantityChange(product.id, pendingQuantities[product.id] || 0);
                                                setPendingQuantities({...pendingQuantities, [product.id]: 0});
                                            }}
                                            className="bg-blue-500 text-white px-2 py-1 rounded"
                                        >
                                            Agregar
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </Card>
            <Card title="Productos Agregados al Pedido" className="mt-6">
                {orderItems.size === 0 ? (
                    <p className="text-gray-500">No hay productos agregados.</p>
                ) : (
                    <div className="space-y-2">
                        {Array.from(orderItems.entries()).map(([product_id, quantity]) => {
                            const product = productsMap.get(product_id);
                            return product ? (
                                <div key={product_id} className="flex justify-between items-center p-2 border rounded">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                                            <img 
                                                src={product.image || `https://picsum.photos/seed/${encodeURIComponent(product.name)}/100/100`} 
                                                alt={product.name} 
                                                className="w-full h-full object-cover" 
                                                referrerPolicy="no-referrer"
                                            />
                                        </div>
                                        <span className="font-medium">{product.name} - {quantity} {product.unit}</span>
                                    </div>
                                    {isEditable && (
                                        <button onClick={() => handleQuantityChange(product_id, 0)} className="text-red-500">
                                            <TrashIcon className="w-5 h-5"/>
                                        </button>
                                    )}
                                </div>
                            ) : null;
                        })}
                    </div>
                )}
            </Card>
            <Card title="Solicitar Nuevo Producto (fuera de catálogo)" className="mt-6">
                 <form onSubmit={handleAddRequest} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                    <div className="md:col-span-2">
                        <label className="text-sm">Nombre del Producto</label>
                        <input type="text" disabled={!isEditable} value={new_request_form.product_name} onChange={e => set_new_request_form({...new_request_form, product_name: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700"/>
                    </div>
                    <div>
                        <label className="text-sm">Cantidad</label>
                        <input type="number" disabled={!isEditable} value={new_request_form.quantity} min="1" onChange={e => set_new_request_form({...new_request_form, quantity: Number(e.target.value)})} className="w-full p-2 border rounded dark:bg-gray-700"/>
                    </div>
                    <div>
                        <button type="submit" disabled={!isEditable} className="w-full bg-blue-500 text-white p-2 rounded flex items-center justify-center"><PlusIcon className="w-5 h-5 mr-1"/> Añadir Solicitud</button>
                    </div>
                    <div className="md:col-span-4">
                        <label className="text-sm">Notas (proveedor/precio sugerido)</label>
                        <input type="text" disabled={!isEditable} value={new_request_form.notes} onChange={e => set_new_request_form({...new_request_form, notes: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700"/>
                    </div>
                </form>
                <div className="mt-4 space-y-2">
                    {new_requests.map((req, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-blue-50 dark:bg-blue-900/50 rounded">
                            <div>
                                <p><strong>{req.product_name}</strong> x {req.quantity}</p>
                                <p className="text-xs text-gray-500">{req.notes}</p>
                            </div>
                            {isEditable && <button onClick={() => handleRemoveRequest(index)} className="text-red-500"><TrashIcon className="w-5 h-5"/></button>}
                        </div>
                    ))}
                </div>
            </Card>
            <Card title="Resumen y Notas" className="mt-6">
                 <div>
                    <label>Notas Adicionales para el Encargado</label>
                    <textarea 
                        value={notes}
                        disabled={!isEditable}
                        onChange={e => { setNotes(e.target.value); setIsDirty(true); }}
                        rows={3}
                        className="w-full mt-1 p-2 border rounded dark:bg-gray-700"
                    />
                </div>
                <div className="mt-4 text-xl font-bold">
                    Coste Total (Catálogo): {calculateTotalCost.toLocaleString('es-ES', {style: 'currency', currency: 'EUR'})}
                </div>
                {isEditable && (
                    <div className="mt-6 flex justify-end space-x-3">
                        <button onClick={() => handleSubmit('Borrador')} className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600">Guardar Borrador</button>
                        <button onClick={() => handleSubmit('Enviado')} className="bg-primary-600 text-white px-6 py-2 rounded-md hover:bg-primary-700">Enviar Pedido</button>
                        {isAlmacen && <button onClick={() => handleSubmit('Cerrado')} className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700">Cerrar Pedido</button>}
                    </div>
                )}
            </Card>
        </div>
    );
};
