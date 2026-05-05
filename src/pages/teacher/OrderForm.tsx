import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/Card';
import { AppEvent, Order, OrderItem, Product, NewProductRequest, Profile } from '../../types';
import { BlockedAccess } from '../shared/BlockedAccess';
import { TrashIcon, PlusIcon, MinusIcon, LockIcon, WarningIcon } from '../../components/icons';

export const OrderForm: React.FC = () => {
    const { eventId, orderId } = useParams<{ eventId?: string; orderId?: string }>();
    const [searchParams] = useSearchParams();
    const isEconomatoOrder = searchParams.get('type') === 'economato';
    const isFamilyMeal = searchParams.get('is_family_meal') === 'true';
    const ds_id = searchParams.get('ds_id');
    const navigate = useNavigate();
    const { events, products, orders, setOrders, mini_economato_stock, setMiniEconomatoStock, isPastYear, dining_services } = useData();
    const { currentUser, isOwner, effectiveUserId } = useAuth();
    
    const diningService = useMemo(() => {
        if (ds_id) return dining_services.find(d => d.id === ds_id);
        if (isFamilyMeal && eventId) return dining_services.find(d => d.service_id === eventId);
        return null;
    }, [ds_id, isFamilyMeal, eventId, dining_services]);

    const isAuthorizedForFamilyMeal = useMemo(() => {
        if (!isFamilyMeal) return true;
        if (!diningService) return false;
        return diningService.family_meal_authorized_teachers?.includes(currentUser?.id || '') || false;
    }, [isFamilyMeal, diningService, currentUser]);
    
    const [orderType, setOrderType] = useState<'weekly' | 'service'>(
        (searchParams.get('order_type') as 'weekly' | 'service') || 'weekly'
    );
    const [orderItems, setOrderItems] = useState<Map<string, number>>(new Map());
    const [pendingQuantities, setPendingQuantities] = useState<Record<string, number>>({});
    const [notes, setNotes] = useState('');
    const [new_requests, set_new_requests] = useState<NewProductRequest[]>([]);
    const [new_request_form, set_new_request_form] = useState({ product_name: '', quantity: 1, unit: 'uds', notes: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDirty, setIsDirty] = useState(false);

    const existingOrder = useMemo(() => orderId ? orders.find(o => o.id === orderId) : null, [orders, orderId]);
    const isAlmacen = currentUser?.profiles.includes(Profile.ALMACEN);

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
        }) || (existingOrder?.event_id === 'STAFF_MEAL_EVENT' ? {
            id: 'STAFF_MEAL_EVENT',
            name: 'Comida de Familia',
            type: 'Regular',
            start_date: new Date().toISOString(),
            end_date: new Date(Date.now() + 86400000 * 365).toISOString(),
            budget_per_teacher: 9999, // High budget for staff meals as they are collective
            status: 'Activo'
        } as AppEvent : null);
    }, [events, eventId, orderId, orders, isEconomatoOrder, existingOrder]);

    const isEditable = useMemo(() => {
        if (isPastYear) return false;
        if (!existingOrder) return true; // New order
        if (existingOrder.status === 'Procesado' || existingOrder.status === 'Cerrado' || existingOrder.status === 'Recibido OK') return false;
        return isOwner(existingOrder.user_id) || isAlmacen;
    }, [existingOrder, isAlmacen, isOwner]);
    
    const productsMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);

    const filteredProducts = useMemo(() => {
        if (searchTerm.trim() === '') return [];
        return products
            .filter(p => 
                p.status === 'Activo' && 
                p.name.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
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

    const [isScannerOpen, setIsScannerOpen] = useState(false); // Placeholder if added later
    
    useEffect(() => {
        const productId = searchParams.get('productId');
        const quantity = parseFloat(searchParams.get('quantity') || '0');
        if (productId && quantity > 0 && !orderId) {
            handleQuantityChange(productId, quantity);
        }
    }, [searchParams, orderId]);

    useEffect(() => {
        if (existingOrder) {
            const itemsMap = new Map<string, number>();
            existingOrder.items.forEach(item => {
                itemsMap.set(item.product_id, item.quantity);
            });
            setOrderItems(itemsMap);
            setPendingQuantities({});
            setNotes(existingOrder.notes || '');
            set_new_requests(existingOrder.new_product_requests || []);
            if (existingOrder.order_type) {
                setOrderType(existingOrder.order_type);
            }
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


    const handleQuantityChange = (product_id: string, quantity: number, append: boolean = false) => {
        setIsDirty(true);
        const newItems = new Map(orderItems);
        if (quantity > 0) {
            if (append) {
                const current = newItems.get(product_id) || 0;
                newItems.set(product_id, current + quantity);
            } else {
                newItems.set(product_id, quantity);
            }
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
            set_new_request_form({ product_name: '', quantity: 1, unit: 'uds', notes: '' });
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

    if (isFamilyMeal && !isAuthorizedForFamilyMeal) {
        return (
            <BlockedAccess 
                message="No tienes autorización para realizar pedidos de Comida de Familia para este servicio. Por favor, contacta con el administrador si crees que esto es un error."
            />
        );
    }

    if (!event) return <Card title="Error">Evento no encontrado.</Card>;

    const handleSubmit = async (status: 'Enviado' | 'Cerrado') => {
        if (!currentUser) return;
        
        setIsSubmitting(true);
        try {
            setIsDirty(false);

            const newOrderItems: OrderItem[] = Array.from(orderItems.entries()).map(([product_id, quantity]) => {
                const product = productsMap.get(product_id)!;
                return {
                    product_id,
                    quantity,
                    price: product.suppliers[0]?.price || 0,
                    tax: product.tax || 0,
                };
            });

            const orderToSave: Order = {
                id: existingOrder?.id || `ord-${Date.now()}`,
                user_id: effectiveUserId || currentUser.id,
                date: new Date().toISOString(),
                status,
                event_id: event.id,
                order_type: orderType,
                items: newOrderItems,
                new_product_requests: new_requests,
                cost: calculateTotalCost,
                notes: notes,
                is_economato_order: !!isEconomatoOrder,
                is_family_meal: !!isFamilyMeal || existingOrder?.is_family_meal,
                dining_service_id: isFamilyMeal ? (ds_id || diningService?.id) : (existingOrder?.dining_service_id),
                academic_year_id: event.academic_year_id || existingOrder?.academic_year_id
            };

            // Add optional fields only if they exist to avoid Firestore undefined error
            if (existingOrder?.is_staff_meal !== undefined) orderToSave.is_staff_meal = existingOrder.is_staff_meal;
            if (existingOrder?.dining_service_id !== undefined) orderToSave.dining_service_id = existingOrder.dining_service_id;
            
            const newOrders = existingOrder 
                ? orders.map(o => o.id === existingOrder.id ? orderToSave : o)
                : [...orders, orderToSave];

            await setOrders(newOrders);

            // Logic: Stock update happens when Almacen closes/processes the order, 
            // but if the user wants it "delivered" to economato upon sending, we keep it here.
            // However, to allow the teacher to modify it, we should probably only update stock 
            // when it becomes 'Cerrado' or 'Procesado' from the Warehouse side.
            // But if the user explicitly wants stock to update now, we keep it.
            
            alert(`Pedido ${status === 'Enviado' ? 'enviado' : 'cerrado'} correctamente.`);
            navigate(isEconomatoOrder ? '/almacen/mini-economato' : '/teacher/order-portal');
        } catch (error) {
            console.error("Error saving order:", error);
            alert("Error al guardar el pedido. Por favor, revisa tu conexión.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div>
            <div className="mb-6">
                <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">
                        {isFamilyMeal ? 'Pedido: Comida de Familia' : `Pedido para: ${event.name}`}
                    </h1>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                        isFamilyMeal ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' :
                        orderType === 'service' ? 'bg-primary-100 text-primary-700 border border-primary-200' : 'bg-amber-100 text-amber-700 border border-amber-200'
                    }`}>
                        {isFamilyMeal ? 'Gestión Familia' : (orderType === 'service' ? 'Práctica de Servicio' : 'Reposición Semanal')}
                    </span>
                </div>
                <p className="mt-2 text-red-600 font-semibold bg-red-50 p-2 rounded border border-red-200 inline-block">
                    Nota: El pedido se cierra el {new Date(event.end_date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} 
                    a las {new Date(event.end_date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}.
                </p>
            </div>
            
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
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                            {familyProducts.map(product => (
                                <div key={product.id} className="p-2 border rounded-lg dark:border-gray-600 flex flex-col h-full bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="w-full h-20 mb-2 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                                        <img 
                                            src={product.image || `https://picsum.photos/seed/${encodeURIComponent(product.name)}/200/200`} 
                                            alt={product.name} 
                                            className="w-full h-full object-cover" 
                                            referrerPolicy="no-referrer"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-bold text-[11px] leading-tight line-clamp-2 min-h-[2.2em] flex-1">{product.name}</h4>
                                        {product.allergens && product.allergens.length > 0 && (
                                            <div 
                                                title={`Alérgenos: ${product.allergens.join(', ')}`}
                                                className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 cursor-help flex-shrink-0"
                                            >
                                                <WarningIcon className="w-2.5 h-2.5" />
                                            </div>
                                        )}
                                    </div>
                                    
                                    {product.description && (
                                        <p className="text-[9px] text-gray-400 mt-0.5 line-clamp-2 italic leading-tight" title={product.description}>
                                            {product.description}
                                        </p>
                                    )}
                                    
                                    <div className="mt-1">
                                        <p className="text-[10px] font-bold text-gray-700 dark:text-gray-300">
                                            {product.suppliers[0]?.price.toFixed(2) || 'N/A'}€ <span className="font-normal text-gray-500 text-[9px]">/ {product.unit}</span>
                                        </p>
                                    </div>

                                    {(() => {
                                        const stock = mini_economato_stock.find(s => s.id === product.id);
                                        if (stock && stock.stock > 0) {
                                            return (
                                                <div className="mt-1">
                                                    <span className="text-[8px] bg-blue-50 text-blue-600 font-bold px-1 py-0.5 rounded border border-blue-100 block text-center">
                                                        S: {stock.stock.toFixed(1)}
                                                    </span>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}

                                    <div className="flex gap-1 mt-auto pt-2">
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            disabled={!isEditable || isSubmitting}
                                            value={pendingQuantities[product.id] || ''}
                                            onChange={e => setPendingQuantities({...pendingQuantities, [product.id]: parseFloat(e.target.value) || 0})}
                                            className="w-full p-1 border rounded text-[10px] bg-gray-50 dark:bg-gray-700 focus:ring-1 focus:ring-blue-500 outline-none"
                                            placeholder="Cant."
                                        />
                                        <button 
                                            disabled={!isEditable || isSubmitting}
                                            onClick={() => {
                                                const qty = pendingQuantities[product.id] || 0;
                                                if (qty > 0) {
                                                    handleQuantityChange(product.id, qty, true);
                                                    setPendingQuantities({...pendingQuantities, [product.id]: 0});
                                                }
                                            }}
                                            className="bg-primary-600 text-white px-1.5 py-1 rounded text-[10px] font-bold active:bg-primary-700"
                                        >
                                            {orderItems.has(product.id) ? 'Add' : 'Ok'}
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
                                <div key={product_id} className="flex justify-between items-center p-3 border rounded-lg bg-white dark:bg-gray-800 shadow-sm">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-12 h-12 rounded overflow-hidden bg-gray-100 flex-shrink-0 border dark:border-gray-700">
                                            <img 
                                                src={product.image || `https://picsum.photos/seed/${encodeURIComponent(product.name)}/100/100`} 
                                                alt={product.name} 
                                                className="w-full h-full object-cover" 
                                                referrerPolicy="no-referrer"
                                            />
                                        </div>
                                        <div>
                                            <div className="flex items-center space-x-2">
                                                <p className="font-semibold text-gray-800 dark:text-gray-200">{product.name}</p>
                                                {product.allergens && product.allergens.length > 0 && (
                                                    <div 
                                                        title={`Alérgenos: ${product.allergens.join(', ')}`}
                                                        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 cursor-help"
                                                    >
                                                        <WarningIcon className="w-2.5 h-2.5" />
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500">{product.unit}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <div className="flex items-center border rounded-md dark:border-gray-600">
                                            <button 
                                                disabled={!isEditable}
                                                onClick={() => handleQuantityChange(product_id, Math.max(0, quantity - 1))}
                                                className="p-1 px-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                                            >
                                                <MinusIcon className="w-4 h-4" />
                                            </button>
                                            <input 
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                disabled={!isEditable}
                                                value={quantity}
                                                onChange={(e) => handleQuantityChange(product_id, parseFloat(e.target.value) || 0)}
                                                className="w-16 text-center border-x dark:border-gray-600 py-1 bg-transparent text-sm focus:outline-none"
                                            />
                                            <button 
                                                disabled={!isEditable}
                                                onClick={() => handleQuantityChange(product_id, quantity + 1)}
                                                className="p-1 px-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                                            >
                                                <PlusIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                        {isEditable && (
                                            <button 
                                                onClick={() => handleQuantityChange(product_id, 0)} 
                                                className="text-red-500 hover:text-red-700 transition-colors p-1"
                                                title="Eliminar del pedido"
                                            >
                                                <TrashIcon className="w-5 h-5"/>
                                            </button>
                                        )}
                                    </div>
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
                        <label className="text-sm">Unidad (kg, L, etc.)</label>
                        <input type="text" disabled={!isEditable} value={new_request_form.unit} onChange={e => set_new_request_form({...new_request_form, unit: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700"/>
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
                                <p><strong>{req.product_name}</strong> - {req.quantity} {req.unit}</p>
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
                        <button 
                            disabled={isSubmitting}
                            onClick={() => handleSubmit('Enviado')} 
                            className="bg-primary-600 text-white px-6 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Procesando...' : (existingOrder ? 'Actualizar y Enviar' : 'Enviar Pedido')}
                        </button>
                        {isAlmacen && (
                            <button 
                                disabled={isSubmitting}
                                onClick={() => handleSubmit('Cerrado')} 
                                className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
                            >
                                {isSubmitting ? 'Cerrando...' : 'Cerrar Pedido'}
                            </button>
                        )}
                    </div>
                )}
                {isPastYear && (
                    <div className="mt-6 bg-amber-50 text-amber-800 p-4 rounded-md border border-amber-200 font-bold text-center flex items-center justify-center">
                        <LockIcon className="w-5 h-5 mr-2" /> MODO HISTÓRICO: Este pedido pertenece a un curso cerrado y no se puede modificar.
                    </div>
                )}
            </Card>
        </div>
    );
};
