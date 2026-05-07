import React, { useMemo, useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useCompany } from '../../contexts/CompanyContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/Card';
import { Product, Supplier, Order, OrderItem, OrderStatus, Profile, NewProductRequest, Message, AppEvent } from '../../types';
import { generateOrderPdf } from '../../utils/export';
import { PlusIcon, TrashIcon, HistoryIcon, UserCircleIcon, TruckIcon, AppleIcon, MessageIcon } from '../../components/icons';
import { useCreator } from '../../contexts/CreatorContext';

type ViewMode = 'Global' | 'Teacher' | 'Supplier' | 'Reception';

type AggregatedProduct = {
    product: Product;
    total_quantity: number;
    orders: { order: Order; item: OrderItem }[];
}

// Selection component when no eventId is provided
const EventSelectionList: React.FC = () => {
    const { events, orders } = useData();
    const now = new Date();

    const processableEvents = useMemo(() => {
        const eventStatusMap = new Map<string, { orderCount: number; status: 'Procesado' | 'Enviado' }>();
        orders.forEach(o => {
            if (o.status === 'Enviado' || o.status === 'Procesado') {
                if (!eventStatusMap.has(o.event_id)) {
                    eventStatusMap.set(o.event_id, { orderCount: 0, status: 'Enviado' });
                }
                const info = eventStatusMap.get(o.event_id)!;
                info.orderCount++;
                if (o.status === 'Procesado') info.status = 'Procesado';
            }
        });
        const processable = events
            .filter(e => eventStatusMap.has(e.id))
            .map(e => ({ 
                id: e.id,
                name: e.name,
                start_date: e.start_date,
                end_date: e.end_date,
                ...eventStatusMap.get(e.id)! 
            }));
        
        if (eventStatusMap.has('STAFF_MEAL_EVENT')) {
            processable.push({
                id: 'STAFF_MEAL_EVENT',
                name: 'Comidas de Familia',
                start_date: new Date().toISOString(),
                end_date: new Date().toISOString(),
                ...eventStatusMap.get('STAFF_MEAL_EVENT')!
            });
        }
        return processable;
    }, [events, orders]);

    return (
        <div>
             <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6">Procesar Pedido General</h1>
             <Card title="Selecciona un Evento para Procesar">
                 <div className="space-y-3">
                    {processableEvents.length > 0 ? processableEvents.map(e => {
                        const isEventOpen = new Date(e.start_date) <= now && new Date(e.end_date) >= now;
                        return (
                        <Link to={`/almacen/process-orders/${e.id}`} key={e.id} className="block p-4 bg-gray-50 dark:bg-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="font-bold">{e.name}</p>
                                    <p className="text-sm">{e.orderCount} pedidos de profesores</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${isEventOpen ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                                        {isEventOpen ? 'Abierto' : 'Cerrado'}
                                    </span>
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${e.status === 'Enviado' ? 'bg-yellow-200 text-yellow-800' : 'bg-blue-200 text-blue-800'}`}>
                                        {e.status === 'Enviado' ? 'Pendiente' : 'Procesado'}
                                    </span>
                                </div>
                            </div>
                        </Link>
                    )}) : <p>No hay eventos con pedidos pendientes de procesar.</p>}
                 </div>
             </Card>
        </div>
    );
};

// Main Component
export const ProcessOrders: React.FC = () => {
    const { eventId } = useParams<{ eventId: string }>();

    if (!eventId) {
        return <EventSelectionList />;
    }
    
    // Detailed view for a specific event
    return <EventProcessingDetail eventId={eventId} />;
};


// Detail view component
const EventProcessingDetail: React.FC<{ eventId: string }> = ({ eventId }) => {
    const navigate = useNavigate();
    const { orders, setOrders, events, products, suppliers, users, setMessages, mini_economato_stock } = useData();
    const { companyInfo } = useCompany();
    const { currentUser } = useAuth();
    const { creatorInfo } = useCreator();

    const [viewMode, setViewMode] = useState<ViewMode>('Global');
    const [selectedTeacherId, setSelectedTeacherId] = useState<string>('all');
    const [selectedSupplierId, setSelectedSupplierId] = useState<string>('all');
    const [editedQuantities, setEditedQuantities] = useState<Record<string, number>>({});
    const [selectedSuppliers, setSelectedSuppliers] = useState<Record<string, string>>({});
    const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

    const productsMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);
    const suppliersMap = useMemo(() => new Map(suppliers.map(s => [s.id, s])), [suppliers]);
    const usersMap = useMemo(() => new Map(users.map(u => [u.id, u.name])), [users]);
    const teachers = useMemo(() => users.filter(u => u.profiles.includes(Profile.TEACHER)), [users]);
    const activeSuppliers = useMemo(() => suppliers.filter(s => s.status === 'Activo'), [suppliers]);
    
    const event = useMemo(() => {
        if (eventId === 'STAFF_MEAL_EVENT') return {
            id: 'STAFF_MEAL_EVENT',
            name: 'Comidas de Familia',
            type: 'Regular',
            start_date: new Date().toISOString(),
            end_date: new Date().toISOString(),
            budget_per_teacher: 9999,
            status: 'Activo'
        } as AppEvent;
        return events.find(e => e.id === eventId);
    }, [events, eventId]);
    const eventOrders = useMemo(() => orders.filter(o => o.event_id === eventId && (o.status === 'Enviado' || o.status === 'Procesado')), [orders, eventId]);
    
    // Total Weekly Gasto (including current edits)
    const totalWeeklyGasto = useMemo(() => {
        let total = 0;
        eventOrders.forEach(order => {
            order.items.forEach(item => {
                const product = productsMap.get(item.product_id);
                if (!product) return;
                const editedQty = editedQuantities[`${order.id}-${item.product_id}`] ?? item.quantity;
                const priceInfo = product.suppliers.find(s => s.supplier_id === selectedSuppliers[product.id]);
                const price = priceInfo?.price || item.price;
                total += (editedQty * price * (1 + item.tax / 100));
            });
        });
        return total;
    }, [eventOrders, editedQuantities, selectedSuppliers, productsMap]);

    const isProcessed = useMemo(() => eventOrders.length > 0 && eventOrders.every(o => o.status === 'Procesado'), [eventOrders]);

    const { aggregatedProducts, newProductRequests } = useMemo(() => {
        const productMap: Map<string, AggregatedProduct> = new Map();
        const requests: (NewProductRequest & { teacherName: string })[] = [];

        for (const order of eventOrders) {
            for (const item of order.items) {
                const product = productsMap.get(item.product_id);
                if (!product || product.status === 'Inactivo') continue;

                if (!productMap.has(product.id)) {
                    productMap.set(product.id, { product, total_quantity: 0, orders: [] });
                }
                const agg = productMap.get(product.id)!;
                agg.total_quantity += item.quantity;
                agg.orders.push({ order, item });
            }
            if (order.new_product_requests) {
                requests.push(...order.new_product_requests.map(r => ({...r, teacherName: usersMap.get(order.user_id) || 'Desconocido' })));
            }
        }
        return { aggregatedProducts: Array.from(productMap.values()), newProductRequests: requests };
    }, [eventOrders, productsMap, usersMap]);
    
    useEffect(() => {
        const initialSuppliers: Record<string, string> = {};
        aggregatedProducts.forEach(({ product }) => {
            const cheapestSupplier = product.suppliers
                .map(ps => ({ ...ps, supplier: suppliersMap.get(ps.supplier_id) }))
                .filter(ps => ps.supplier?.status === 'Activo')
                .sort((a, b) => a.price - b.price)[0];
            if (cheapestSupplier) {
                initialSuppliers[product.id] = cheapestSupplier.supplier_id;
            }
        });
        setSelectedSuppliers(initialSuppliers);
    }, [aggregatedProducts, suppliersMap]);

    const handleQuantityChange = (orderId: string, productId: string, newQuantity: number) => {
        setEditedQuantities(prev => ({ ...prev, [`${orderId}-${productId}`]: newQuantity < 0 ? 0 : newQuantity }));
    };

    const toggleExpand = (productId: string) => {
        const newSet = new Set(expandedProducts);
        if (newSet.has(productId)) {
            newSet.delete(productId);
        } else {
            newSet.add(productId);
        }
        setExpandedProducts(newSet);
    };

    const supplierSummary = useMemo(() => {
        const summary = new Map<string, { supplier: Supplier; items: Product[]; totalCost: number }>();
        aggregatedProducts.forEach(agg => {
            const supplierId = selectedSuppliers[agg.product.id];
            if (!supplierId || !suppliersMap.has(supplierId)) return;

            if (!summary.has(supplierId)) {
                summary.set(supplierId, { supplier: suppliersMap.get(supplierId)!, items: [], totalCost: 0 });
            }

            const totalQuantity = agg.orders.reduce((sum, detail) => sum + (editedQuantities[`${detail.order.id}-${agg.product.id}`] ?? detail.item.quantity), 0);
            const priceInfo = agg.product.suppliers.find(s => s.supplier_id === supplierId);
            const cost = totalQuantity * (priceInfo?.price || 0);

            const entry = summary.get(supplierId)!;
            entry.items.push(agg.product);
            entry.totalCost += cost;
        });
        return Array.from(summary.values());
    }, [aggregatedProducts, selectedSuppliers, suppliersMap, editedQuantities]);

    const handleGeneratePdfs = (isInternal: boolean = false) => {
         const ordersBySupplier = new Map<string, { product: Product; quantity: number; price: number }[]>();
        supplierSummary.forEach(({ supplier }) => {
            const itemsForSupplier = aggregatedProducts
                .filter(agg => selectedSuppliers[agg.product.id] === supplier.id)
                .map(agg => {
                    const totalQuantity = agg.orders.reduce((sum, detail) => sum + (editedQuantities[`${detail.order.id}-${agg.product.id}`] ?? detail.item.quantity), 0);
                    const priceInfo = agg.product.suppliers.find(s => s.supplier_id === supplier.id);
                    return { product: agg.product, quantity: totalQuantity, price: priceInfo?.price || 0 };
                })
                .filter(item => item.quantity > 0);
            if (itemsForSupplier.length > 0) {
                ordersBySupplier.set(supplier.id, itemsForSupplier);
            }
        });
        generateOrderPdf(ordersBySupplier, suppliersMap, companyInfo, currentUser || undefined, creatorInfo.app_name, undefined, isInternal);
    };

    const handleModifyOrders = () => {
        if (window.confirm("¿Seguro que quieres revertir este evento a 'Enviado'? Podrás volver a editar los pedidos de los profesores.")) {
             const newOrders = orders.map(order => {
                if (order.event_id === eventId && order.status === 'Procesado') {
                    return { ...order, status: 'Enviado' as OrderStatus };
                }
                return order;
            });
            setOrders(newOrders);
        }
    };
    
    const handleProcessOrders = () => {
        if (window.confirm("¿Seguro que quieres procesar estos pedidos? Su estado cambiará a 'Procesado' y ya no podrán ser editados hasta que reviertas esta acción.")) {
            const eventOrderIds = new Set(eventOrders.map(o => o.id));
            const newMessages: Message[] = [];
            
            const newOrders = orders.map(order => {
                if (eventOrderIds.has(order.id)) {
                    const originalOrder = eventOrders.find(o => o.id === order.id)!;

                    const updatedItems = order.items.map(item => {
                        const editedQty = editedQuantities[`${order.id}-${item.product_id}`];
                        return editedQty !== undefined ? { ...item, quantity: editedQty } : item;
                    }).filter(item => item.quantity > 0);

                    const updatedCost = updatedItems.reduce((sum, item) => {
                        const product = productsMap.get(item.product_id);
                        if (!product) return sum;
                        const priceInfo = product.suppliers.find(s => s.supplier_id === selectedSuppliers[product.id]);
                        const price = priceInfo?.price || item.price;
                        return sum + (item.quantity * price * (1 + item.tax / 100));
                    }, 0);
                    
                    // Generate automatic message if changes were made
                    let itemChanges: string[] = [];
                    updatedItems.forEach(updatedItem => {
                        const originalItem = originalOrder.items.find(i => i.product_id === updatedItem.product_id);
                        if (originalItem && originalItem.quantity !== updatedItem.quantity) {
                            itemChanges.push(`- ${productsMap.get(updatedItem.product_id)?.name}: Cantidad cambiada de ${originalItem.quantity} a ${updatedItem.quantity}.`);
                        }
                    });
                    originalOrder.items.forEach(originalItem => {
                        if (!updatedItems.some(i => i.product_id === originalItem.product_id)) {
                            itemChanges.push(`- ${productsMap.get(originalItem.product_id)?.name}: Eliminado del pedido.`);
                        }
                    });

                    if (itemChanges.length > 0) {
                        let changesDescription = `Tu pedido para "${event?.name}" ha sido procesado por ${currentUser?.name}.\n\nSe han realizado los siguientes ajustes:\n${itemChanges.join('\n')}`;
                        newMessages.push({
                            id: `msg-sys-${Date.now()}-${order.id}`,
                            sender_id: currentUser!.id,
                            recipient_ids: [order.user_id],
                            subject: `Actualización de tu pedido para el evento "${event?.name}"`,
                            body: changesDescription,
                            date: new Date().toISOString(),
                            read_by: {},
                        });
                    }


                    return { ...order, items: updatedItems, cost: updatedCost, status: 'Procesado' as OrderStatus };
                }
                return order;
            });
            setOrders(newOrders);
            setMessages(prev => [...prev, ...newMessages]);
            alert('¡Pedidos procesados con éxito!');
        }
    }

    const ordersByTeacher = useMemo(() => {
        const groups: Record<string, Order[]> = {};
        eventOrders.filter(o => selectedTeacherId === 'all' || o.user_id === selectedTeacherId).forEach(o => {
            if (!groups[o.user_id]) groups[o.user_id] = [];
            groups[o.user_id].push(o);
        });
        return groups;
    }, [eventOrders, selectedTeacherId]);

    const [expandedTeachers, setExpandedTeachers] = useState<Set<string>>(new Set());
    const toggleTeacherExpand = (teacherId: string) => {
        const newSet = new Set(expandedTeachers);
        if (newSet.has(teacherId)) newSet.delete(teacherId);
        else newSet.add(teacherId);
        setExpandedTeachers(newSet);
    };

    if (!event) return <Card title="Error">Evento no encontrado.</Card>;

    return (
        <div>
            <Link to="/almacen/process-orders" className="text-sm text-primary-600 hover:underline no-print">&larr; Volver a la selección de eventos</Link>
            
            <div className="flex justify-between items-start mt-2 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Procesar Pedido: {event.name}</h1>
                    <p className="text-gray-500">Agrupa, revisa y gestiona los pedidos realizados por el profesorado.</p>
                </div>
                <div className="text-right">
                    <p className="text-sm font-medium text-gray-500">Gasto Total Evento (Estimado)</p>
                    <p className="text-3xl font-bold text-primary-600">
                        {totalWeeklyGasto.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                    </p>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-6 no-print">
                <button onClick={() => setViewMode('Global')} className={`px-4 py-2 rounded-md flex items-center shadow-sm transition-all ${viewMode === 'Global' ? 'bg-primary-600 text-white ring-2 ring-primary-300' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border hover:bg-gray-50'}`}>
                    <HistoryIcon className="w-4 h-4 mr-2" /> Global (Requerimientos Totales)
                </button>
                <button onClick={() => setViewMode('Teacher')} className={`px-4 py-2 rounded-md flex items-center shadow-sm transition-all ${viewMode === 'Teacher' ? 'bg-primary-600 text-white ring-2 ring-primary-300' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border hover:bg-gray-50'}`}>
                    <UserCircleIcon className="w-4 h-4 mr-2" /> Por Profesor (Consolidado)
                </button>
                <button onClick={() => setViewMode('Supplier')} className={`px-4 py-2 rounded-md flex items-center shadow-sm transition-all ${viewMode === 'Supplier' ? 'bg-primary-600 text-white ring-2 ring-primary-300' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border hover:bg-gray-50'}`}>
                    <TruckIcon className="w-4 h-4 mr-2" /> Por Proveedor (Hojas de Compra)
                </button>
                <button onClick={() => setViewMode('Reception')} className={`px-4 py-2 rounded-md flex items-center shadow-sm transition-all ${viewMode === 'Reception' ? 'bg-primary-600 text-white ring-2 ring-primary-300' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border hover:bg-gray-50'}`}>
                    <TruckIcon className="w-4 h-4 mr-2" /> Recepción Directa (Check-in)
                </button>
            </div>

            {viewMode === 'Global' && (
                <div className="space-y-6">
                    <Card title="Resumen Global de Requerimientos">
                        <div className="bg-white/50 p-4 border-b text-sm text-gray-600">
                            Revisa las cantidades totales de cada producto. Si hay existencias en el <strong>minieconomato</strong>, aparecerá un aviso para que puedas aprovechar ese stock interno en lugar de pedirlo al proveedor externo.
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-3 py-2 text-left">Referencia</th>
                                        <th className="px-3 py-2 text-left">Producto</th>
                                        <th className="px-3 py-2 text-center">Cantidad Total</th>
                                        <th className="px-3 py-2 text-left">Proveedor Asignado</th>
                                        <th className="px-3 py-2 text-right">Coste Estimado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {aggregatedProducts.map(agg => {
                                        const totalQty = agg.orders.reduce((sum, detail) => sum + (editedQuantities[`${detail.order.id}-${agg.product.id}`] ?? detail.item.quantity), 0);
                                        if (totalQty <= 0) return null;
                                        
                                        const assignedSupplierId = selectedSuppliers[agg.product.id];
                                        const priceInfo = agg.product.suppliers.find(s => s.supplier_id === assignedSupplierId);
                                        
                                        const miniStock = mini_economato_stock.find(s => s.id === agg.product.id);
                                        const hasStock = miniStock && miniStock.stock > 0;

                                        return (
                                            <tr key={agg.product.id} className="hover:bg-gray-50">
                                                <td className="px-3 py-2 text-gray-500 font-mono text-xs">{agg.product.reference}</td>
                                                <td className="px-3 py-2">
                                                    <div className="font-medium">{agg.product.name}</div>
                                                    {hasStock && (
                                                        <div className="mt-1 inline-flex items-center text-[10px] font-bold text-orange-700 bg-orange-100 border border-orange-300 px-2 py-0.5 rounded-full">
                                                            ⚠️ ¡Hay {miniStock.stock} {agg.product.unit} en minieconomato!
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-center font-bold text-primary-700">{totalQty} {agg.product.unit}</td>
                                                <td className="px-3 py-2">
                                                    <select 
                                                        value={assignedSupplierId || ''}
                                                        onChange={e => setSelectedSuppliers(prev => ({ ...prev, [agg.product.id]: e.target.value }))}
                                                        className="w-full text-xs p-1.5 border border-gray-300 rounded shadow-sm focus:ring focus:ring-primary-200"
                                                    >
                                                        {agg.product.suppliers.map(s => {
                                                            const sup = suppliersMap.get(s.supplier_id);
                                                            if (sup?.status !== 'Activo') return null;
                                                            return <option key={s.supplier_id} value={s.supplier_id}>{sup.name} ({s.price.toFixed(2)}€)</option>;
                                                        })}
                                                    </select>
                                                </td>
                                                <td className="px-3 py-2 text-right">{(totalQty * (priceInfo?.price || 0)).toFixed(2)}€</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {viewMode === 'Teacher' && (
                <div className="space-y-6">
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4 text-sm text-blue-700">
                        <p className="font-bold">Vista de Economato Consolidada</p>
                        <p>Los pedidos de "Servicio" y "Semanales" de cada profesor se muestran agrupados para facilitar la preparación física de la mercancía.</p>
                    </div>

                    {Object.entries(ordersByTeacher).map(([teacherId, teacherOrders]) => {
                        const teacherName = usersMap.get(teacherId) || 'Desconocido';
                        const isExpanded = expandedTeachers.has(teacherId);
                        
                        // Consolidate items from all orders of this teacher
                        const consolidatedItems = new Map<string, { product_id: string; quantity: number; types: Set<string> }>();
                        teacherOrders.forEach(o => {
                            o.items.forEach(item => {
                                if (!consolidatedItems.has(item.product_id)) {
                                    consolidatedItems.set(item.product_id, { product_id: item.product_id, quantity: 0, types: new Set() });
                                }
                                const consolidated = consolidatedItems.get(item.product_id)!;
                                consolidated.quantity += (editedQuantities[`${o.id}-${item.product_id}`] ?? item.quantity);
                                consolidated.types.add(o.order_type || 'weekly');
                            });
                        });

                        return (
                            <Card key={teacherId} title={
                                <div className="flex justify-between items-center w-full">
                                    <div className="flex items-center">
                                        <UserCircleIcon className="w-5 h-5 mr-2 text-primary-500" />
                                        <span className="text-xl">{teacherName}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        {teacherOrders.some(o => o.is_economato_order) && (
                                            <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-1 rounded-full border border-blue-300">ECONOMATO</span>
                                        )}
                                        {teacherOrders.some(o => o.is_family_meal) && (
                                            <span className="bg-indigo-100 text-indigo-800 text-[10px] px-2 py-1 rounded-full border border-indigo-300">FAMILIA</span>
                                        )}
                                        {teacherOrders.some(o => o.order_type === 'service') && (
                                            <span className="bg-primary-100 text-primary-800 text-[10px] px-2 py-1 rounded-full border border-primary-300">SERVICIO</span>
                                        )}
                                        {teacherOrders.some(o => o.order_type === 'weekly' || !o.order_type) && (
                                            <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-1 rounded-full border border-amber-300">SEMANAL</span>
                                        )}
                                    </div>
                                </div>
                            }>
                                {!isExpanded ? (
                                    <div className="space-y-4">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead className="bg-gray-50 border-b">
                                                    <tr>
                                                        <th className="px-3 py-2 text-left">Producto (Consolidado)</th>
                                                        <th className="px-3 py-2 text-center">Cantidad Total</th>
                                                        <th className="px-3 py-2 text-center">Referencia</th>
                                                        <th className="px-3 py-2 text-right">Destinado a</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                    {Array.from(consolidatedItems.values()).map(cItem => {
                                                        const p = productsMap.get(cItem.product_id);
                                                        if (cItem.quantity <= 0) return null;
                                                        return (
                                                            <tr key={cItem.product_id} className="hover:bg-gray-50">
                                                                <td className="px-3 py-2 font-medium">{p?.name || 'N/A'}</td>
                                                                <td className="px-3 py-2 text-center font-mono font-bold text-primary-700">{cItem.quantity} {p?.unit}</td>
                                                                <td className="px-3 py-2 text-center text-gray-400 text-xs">{p?.reference}</td>
                                                                <td className="px-3 py-2 text-right">
                                                                    <div className="flex justify-end gap-1">
                                                                        {teacherOrders.some(o => o.is_family_meal && o.items.some(i => i.product_id === cItem.product_id)) && (
                                                                            <span className="text-[9px] px-1.5 py-0.5 rounded border bg-indigo-50 text-indigo-600 border-indigo-200">
                                                                                Familia
                                                                            </span>
                                                                        )}
                                                                        {teacherOrders.some(o => o.is_economato_order && o.items.some(i => i.product_id === cItem.product_id)) && (
                                                                            <span className="text-[9px] px-1.5 py-0.5 rounded border bg-blue-50 text-blue-600 border-blue-200">
                                                                                Economato
                                                                            </span>
                                                                        )}
                                                                        {Array.from(cItem.types).map(t => (
                                                                            <span key={t} className={`text-[9px] px-1.5 py-0.5 rounded border capitalize ${
                                                                                t === 'service' ? 'bg-primary-50 text-primary-600 border-primary-200' : 'bg-amber-50 text-amber-600 border-amber-200'
                                                                            }`}>
                                                                                {t === 'weekly' ? 'Semanal' : 'Servicio'}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="flex justify-between items-center pt-2 border-t mt-4">
                                            <p className="text-xs text-gray-500 italic">Este el el pedido unificado para {teacherName}.</p>
                                            <button 
                                                onClick={() => toggleTeacherExpand(teacherId)}
                                                className="text-primary-600 text-sm font-bold hover:underline"
                                            >
                                                Desglosar en Pedidos Individuales &rarr;
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center pb-2 border-b">
                                            <h3 className="font-bold text-gray-700">Desglose de Pedidos para {teacherName}</h3>
                                            <button 
                                                onClick={() => toggleTeacherExpand(teacherId)}
                                                className="text-gray-500 text-xs hover:underline"
                                            >
                                                &larr; Volver a vista consolidada
                                            </button>
                                        </div>
                                        {teacherOrders.map(order => (
                                            <div key={order.id} className={`p-4 rounded-lg border-l-4 ${order.is_family_meal ? 'border-indigo-500 bg-indigo-50/30' : order.order_type === 'service' ? 'border-primary-500 bg-primary-50/30' : 'border-amber-500 bg-amber-50/30'}`}>
                                                <div className="flex justify-between items-center mb-3">
                                                    <span className="font-bold uppercase text-xs">
                                                        Pedido {order.is_family_meal ? 'de Comida de Familia' : order.order_type === 'service' ? 'de Servicio' : 'Semanal'}
                                                    </span>
                                                    <span className="text-xs text-gray-500">{new Date(order.date).toLocaleString()}</span>
                                                </div>
                                                <table className="w-full text-xs">
                                                    <thead>
                                                        <tr className="border-b">
                                                            <th className="text-left py-1">Producto</th>
                                                            <th className="text-center py-1">Cantidad</th>
                                                            <th className="text-right py-1">Precio/U</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {order.items.map(item => {
                                                            const p = productsMap.get(item.product_id);
                                                            const editedQty = editedQuantities[`${order.id}-${item.product_id}`] ?? item.quantity;
                                                            return (
                                                                <tr key={item.product_id} className="border-b border-gray-100">
                                                                    <td className="py-2">
                                                                        <span className="block">{p?.name}</span>
                                                                        {(() => {
                                                                            const mStock = mini_economato_stock.find(m => m.id === item.product_id);
                                                                            if (mStock && mStock.stock > 0) {
                                                                                return (
                                                                                    <div className="mt-1 inline-flex items-center text-[9px] font-bold text-orange-700 bg-orange-100 border border-orange-300 px-1.5 py-0.5 rounded">
                                                                                        ⚠️ ¡Hay {mStock.stock} {p?.unit} en minieconomato!
                                                                                    </div>
                                                                                );
                                                                            }
                                                                            return null;
                                                                        })()}
                                                                    </td>
                                                                    <td className="py-2 text-center">
                                                                        <input 
                                                                            type="number" 
                                                                            step="0.01" 
                                                                            disabled={isProcessed}
                                                                            value={editedQty} 
                                                                            onChange={e => handleQuantityChange(order.id, item.product_id, parseFloat(e.target.value) || 0)}
                                                                            className="w-16 p-1 border rounded dark:bg-gray-700 text-center"
                                                                        />
                                                                    </td>
                                                                    <td className="py-2 text-right">{(p?.suppliers[0]?.price || 0).toFixed(2)}€</td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                                {order.notes && (
                                                    <div className="mt-2 text-xs italic text-gray-600 bg-white/50 p-2 rounded">
                                                        <strong>Notas específicas:</strong> {order.notes}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}

            {viewMode === 'Reception' && (
                <div className="space-y-6">
                    <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4 text-sm text-green-700">
                        <p className="font-bold">Modo de Recepción Interactiva</p>
                        <p>Usa esta vista para validar los productos conforme llegan del proveedor. Puedes actualizar precios en tiempo real y registrar incidencias que se guardarán en la ficha del proveedor.</p>
                    </div>
                    
                    {activeSuppliers.filter(s => supplierSummary.some(ss => ss.supplier.id === s.id)).map(supplier => {
                        const summary = supplierSummary.find(ss => ss.supplier.id === supplier.id)!;
                        return (
                            <SupplierReceptionCard 
                                key={supplier.id} 
                                supplier={supplier} 
                                aggregatedProducts={aggregatedProducts.filter(agg => selectedSuppliers[agg.product.id] === supplier.id)}
                                editedQuantities={editedQuantities}
                                eventId={eventId}
                            />
                        );
                    })}
                </div>
            )}
            {viewMode === 'Supplier' && (
                <div className="space-y-6">
                    {activeSuppliers.filter(s => supplierSummary.some(ss => ss.supplier.id === s.id)).map(supplier => {
                        const summary = supplierSummary.find(ss => ss.supplier.id === supplier.id)!;
                         return (
                             <Card key={supplier.id} title={`Proveedor: ${supplier.name}`}>
                                <div className="text-gray-500 text-xs mb-4">
                                    {summary.items.length} productos diferentes
                                </div>
                                <div className="space-y-4">
                                     <table className="w-full text-sm">
                                        <thead className="bg-gray-50 dark:bg-gray-700">
                                            <tr>
                                                <th className="px-2 py-2 text-left">Producto</th>
                                                <th className="px-2 py-2">Cantidad Total</th>
                                                <th className="px-2 py-2 text-right">Coste Est.</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {aggregatedProducts
                                                .filter(agg => selectedSuppliers[agg.product.id] === supplier.id)
                                                .map(agg => {
                                                    const totalQty = agg.orders.reduce((sum, d) => sum + (editedQuantities[`${d.order.id}-${agg.product.id}`] ?? d.item.quantity), 0);
                                                    const price = agg.product.suppliers.find(s => s.supplier_id === supplier.id)?.price || 0;
                                                    if (totalQty === 0) return null;
                                                    return (
                                                        <tr key={agg.product.id} className="border-b dark:border-gray-700">
                                                            <td className="p-2 font-medium">{agg.product.name}</td>
                                                            <td className="p-2">{totalQty} {agg.product.unit}</td>
                                                            <td className="p-2 text-right font-bold">{(totalQty * price).toFixed(2)}€</td>
                                                        </tr>
                                                    );
                                                })}
                                        </tbody>
                                     </table>
                                     <div className="text-right text-lg">
                                         Total estimado para {supplier.name}: <span className="font-bold text-primary-600">{summary.totalCost.toFixed(2)}€</span>
                                     </div>
                                </div>
                            </Card>
                         )
                    })}
                </div>
            )}

            {newProductRequests.length > 0 && (
                <Card title="Solicitudes de Nuevos Productos" className="mt-6 border-yellow-400">
                    {newProductRequests.map((req, i) => (
                        <div key={i} className="p-2 border-b dark:border-gray-700">
                           <p><strong>{req.product_name}</strong> x {req.quantity}</p>
                           <p className="text-sm">Pedido por: {req.teacherName}</p>
                           <p className="text-xs text-gray-500">Notas: {req.notes}</p>
                        </div>
                    ))}
                </Card>
            )}

            <Card title="Generar Pedidos por Proveedor" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {supplierSummary.map(({ supplier, items, totalCost }) => (
                        <div key={supplier.id} className="p-4 bg-blue-50 dark:bg-blue-900/50 rounded-md">
                            <h4 className="font-bold">{supplier.name}</h4>
                            <p className="text-sm">{items.length} productos</p>
                            <p className="text-lg font-semibold">{totalCost.toFixed(2)}€ <span className="text-xs">(sin IVA)</span></p>
                        </div>
                    ))}
                </div>
                 <div className="mt-6 flex justify-between items-center flex-wrap gap-4">
                     <div className="flex gap-2">
                        <button onClick={() => handleGeneratePdfs(false)} className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 text-sm font-bold uppercase">Hoja de Pedido (Proveedor)</button>
                        <button onClick={() => handleGeneratePdfs(true)} className="bg-indigo-600 text-white py-2 px-6 rounded-md hover:bg-indigo-700 text-sm font-bold uppercase">Hoja de Recepción (Interna)</button>
                    </div>
                    {isProcessed ? (
                        <button onClick={handleModifyOrders} className="bg-orange-600 text-white py-2 px-6 rounded-md hover:bg-orange-700">Modificar Pedidos Procesados</button>
                    ) : (
                        <button onClick={handleProcessOrders} className="bg-green-600 text-white py-2 px-6 rounded-md hover:bg-green-700">Procesar Pedidos Pendientes</button>
                    )}
                </div>
            </Card>
        </div>
    );
};

// --- New Components for Supplier Reception ---

const SupplierReceptionCard: React.FC<{
    supplier: Supplier;
    aggregatedProducts: AggregatedProduct[];
    editedQuantities: Record<string, number>;
    eventId: string;
}> = ({ supplier, aggregatedProducts, editedQuantities, eventId }) => {
    const { products, setProducts, suppliers, setSuppliers, setSupplierReceptions, supplier_receptions } = useData();
    const [receptionStates, setReceptionStates] = useState<Record<string, { price: number; is_correct: boolean; weight_diff: string; notes: string; received: number }>>({});
    const [generalNotes, setGeneralNotes] = useState('');
    const [isSaved, setIsSaved] = useState(false);

    // Initialize state
    useEffect(() => {
        const initial: Record<string, any> = {};
        aggregatedProducts.forEach(agg => {
            const priceInfo = agg.product.suppliers.find(s => s.supplier_id === supplier.id);
            const totalQty = agg.orders.reduce((sum, d) => sum + (editedQuantities[`${d.order.id}-${agg.product.id}`] ?? d.item.quantity), 0);
            
            initial[agg.product.id] = {
                price: priceInfo?.price || 0,
                is_correct: true,
                weight_diff: '',
                notes: '',
                received: totalQty
            };
        });
        setReceptionStates(initial);
    }, [aggregatedProducts, supplier.id, editedQuantities]);

    const handleUpdateField = (productId: string, field: string, value: any) => {
        setReceptionStates(prev => ({
            ...prev,
            [productId]: { ...prev[productId], [field]: value }
        }));
    };

    const handleSaveReception = async () => {
        if (!window.confirm("¿Confirmar recepción de pedido? Se actualizarán los precios de los productos y se guardarán las anotaciones en la ficha del proveedor.")) return;

        // 1. Update Product Prices if they changed
        const updatedProducts = products.map(p => {
             const state = receptionStates[p.id];
             if (state) {
                 const supplierIdx = p.suppliers.findIndex(s => s.supplier_id === supplier.id);
                 if (supplierIdx !== -1 && p.suppliers[supplierIdx].price !== state.price) {
                     const newSuppliers = [...p.suppliers];
                     newSuppliers[supplierIdx] = { ...newSuppliers[supplierIdx], price: state.price };
                     return { ...p, suppliers: newSuppliers };
                 }
             }
             return p;
        });

        setProducts(updatedProducts);

        // 2. Add to Supplier Reception History
        const receptionId = `rec-${Date.now()}-${supplier.id}`;
        const newReception = {
            id: receptionId,
            supplier_id: supplier.id,
            event_id: eventId,
            date: new Date().toISOString(),
            general_notes: generalNotes,
            items: Object.entries(receptionStates).map(([productId, state]) => ({
                product_id: productId,
                ordered_quantity: aggregatedProducts.find(agg => agg.product.id === productId)?.orders.reduce((sum, d) => sum + (editedQuantities[`${d.order.id}-${productId}`] ?? d.item.quantity), 0) || 0,
                received_quantity: state.received,
                price: state.price,
                is_correct: state.is_correct,
                weight_diff: state.weight_diff,
                notes: state.notes
            }))
        };

        setSupplierReceptions([...supplier_receptions, newReception]);

        // 3. Update Supplier notes/history
        const updatedSuppliers = suppliers.map(s => {
            if (s.id === supplier.id) {
                const currentDate = new Date().toLocaleDateString();
                const newNote = `\n[RECEPCIÓN ${currentDate}]: ${generalNotes || 'Sin notas generales'}`;
                return { 
                    ...s, 
                    notes: (s.notes || '') + newNote,
                    reception_history: [...(s.reception_history || []), receptionId]
                };
            }
            return s;
        });
        setSuppliers(updatedSuppliers);

        setIsSaved(true);
        alert("Recepción procesada correctamente. Precios actualizados e historial guardado.");
    };

    if (isSaved) {
        return (
            <Card title={`Recepción completada: ${supplier.name}`} className="bg-green-50 border-green-200">
                <div className="flex items-center text-green-700">
                    <CheckIcon className="w-6 h-6 mr-2" />
                    <span>La mercancía ha sido procesada y los datos se han guardado en el historial del proveedor.</span>
                </div>
                <button onClick={() => setIsSaved(false)} className="mt-4 text-sm text-green-600 underline font-bold uppercase">Volver a editar (solo local)</button>
            </Card>
        );
    }

    return (
        <Card title={
            <div className="flex justify-between items-center w-full">
                <span>Check-in: {supplier.name}</span>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500 font-mono">ID: {supplier.cif}</span>
            </div>
        }>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-100 border-b">
                        <tr>
                            <th className="px-3 py-2 text-left">Ref / Producto</th>
                            <th className="px-3 py-2 text-center">Cant. Pedida</th>
                            <th className="px-3 py-2 text-center">Precio App</th>
                            <th className="px-3 py-2 text-center w-24">Precio Real</th>
                            <th className="px-3 py-2 text-center">¿Correcto?</th>
                            <th className="px-3 py-2 text-left">Diferencia Peso/Obs.</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {aggregatedProducts.map(agg => {
                            const state = receptionStates[agg.product.id];
                            if (!state) return null;
                            const totalOrdered = agg.orders.reduce((sum, d) => sum + (editedQuantities[`${d.order.id}-${agg.product.id}`] ?? d.item.quantity), 0);
                            if (totalOrdered <= 0) return null;

                            return (
                                <tr key={agg.product.id} className={state.is_correct ? 'hover:bg-gray-50' : 'bg-red-50'}>
                                    <td className="px-3 py-3">
                                        <div className="font-bold text-gray-400 text-[10px] uppercase">{agg.product.reference}</div>
                                        <div className="font-semibold">{agg.product.name}</div>
                                    </td>
                                    <td className="px-3 py-3 text-center">
                                         <div className="font-bold text-primary-700">{totalOrdered} {agg.product.unit}</div>
                                         <div className="text-[10px] text-gray-400">Recibido: 
                                            <input 
                                                type="number" 
                                                className="w-12 ml-1 border rounded p-0 text-center" 
                                                value={state.received}
                                                onChange={(e) => handleUpdateField(agg.product.id, 'received', parseFloat(e.target.value) || 0)}
                                            />
                                         </div>
                                    </td>
                                    <td className="px-3 py-3 text-center font-mono text-gray-500">
                                        {agg.product.suppliers.find(s => s.supplier_id === supplier.id)?.price.toFixed(2)}€
                                    </td>
                                    <td className="px-3 py-3 text-center">
                                        <div className="flex items-center justify-center">
                                            <input 
                                                type="number" 
                                                step="0.01"
                                                className={`w-20 p-1 border rounded text-center font-bold ${state.price !== (agg.product.suppliers.find(s => s.supplier_id === supplier.id)?.price || 0) ? 'border-orange-500 bg-orange-50' : ''}`}
                                                value={state.price}
                                                onChange={(e) => handleUpdateField(agg.product.id, 'price', parseFloat(e.target.value) || 0)}
                                            />
                                            <span className="ml-1 text-xs">€</span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-3 text-center">
                                        <button 
                                            onClick={() => handleUpdateField(agg.product.id, 'is_correct', !state.is_correct)}
                                            className={`p-1 rounded-full ${state.is_correct ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'}`}
                                        >
                                            {state.is_correct ? <CheckIcon className="w-5 h-5" /> : <WarningIcon className="w-5 h-5" />}
                                        </button>
                                    </td>
                                    <td className="px-3 py-3 space-y-1">
                                        <input 
                                            type="text" 
                                            placeholder="Peso distinto..." 
                                            className="w-full text-xs p-1 border rounded"
                                            value={state.weight_diff}
                                            onChange={(e) => handleUpdateField(agg.product.id, 'weight_diff', e.target.value)}
                                        />
                                        <input 
                                            type="text" 
                                            placeholder="Otras anotaciones..." 
                                            className="w-full text-xs p-1 border rounded"
                                            value={state.notes}
                                            onChange={(e) => handleUpdateField(agg.product.id, 'notes', e.target.value)}
                                        />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Anotaciones Generales de la Recepción</label>
                <textarea 
                    className="w-full p-2 border rounded text-sm h-20"
                    placeholder="Escribe aquí cualquier incidencia global, comentarios sobre el transporte, retrasos, etc."
                    value={generalNotes}
                    onChange={(e) => setGeneralNotes(e.target.value)}
                />
            </div>

            <div className="mt-6 flex justify-end">
                <button 
                    onClick={handleSaveReception}
                    className="bg-green-600 text-white font-bold py-2 px-8 rounded shadow-md hover:bg-green-700 transition-all flex items-center"
                >
                    <CheckIcon className="w-5 h-5 mr-2" /> FINALIZAR RECEPCIÓN Y ACTUALIZAR DATOS
                </button>
            </div>
        </Card>
    );
};

export const CheckIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
  </svg>
);

export const WarningIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
);
