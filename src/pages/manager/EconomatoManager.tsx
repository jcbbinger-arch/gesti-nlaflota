import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../../components/Card';
import { Order, OrderStatus, Incident, Supplier, Event, Product, ReceptionItem } from '../../types';
import { Modal } from '../../components/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { DownloadIcon } from '../../components/icons';
import { generateReceptionSheetPdf } from '../../utils/export';
import { useCompany } from '../../contexts/CompanyContext';
import { useCreator } from '../../contexts/CreatorContext';

type ReceptionLineStatus = 'pendiente' | 'ok' | 'parcial' | 'incidencia';

export const EconomatoManager: React.FC = () => {
    const { orders, setOrders, products, suppliers, incidents, setIncidents, events, users } = useData();
    const { currentUser } = useAuth();
    const { companyInfo } = useCompany();
    const { creatorInfo } = useCreator();

    // View state
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Detail view state
    const [receptionItems, setReceptionItems] = useState<Map<string, ReceptionItem>>(new Map());
    const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
    const [incidentDescription, setIncidentDescription] = useState('');
    const [incidentTarget, setIncidentTarget] = useState<{ productId: string } | null>(null);
    
    const productsMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);
    const suppliersMap = useMemo(() => new Map(suppliers.map(s => [s.id, s])), [suppliers]);
    const managerUser = useMemo(() => users.find(u => u.id === companyInfo.manager_user_id), [users, companyInfo]);

    // Data for List View
    const processableEvents = useMemo(() => {
        const eventInfoMap = new Map<string, { totalCost: number; verificationStatus: 'Pendiente' | 'Verificado', firstProcessedDate: string }>();

        orders.forEach(order => {
            if (['Procesado', 'Recibido Parcial', 'Recibido OK', 'Completado'].includes(order.status)) {
                if (!eventInfoMap.has(order.event_id)) {
                    eventInfoMap.set(order.event_id, { totalCost: 0, verificationStatus: 'Verificado', firstProcessedDate: order.date });
                }
                const info = eventInfoMap.get(order.event_id)!;
                info.totalCost += order.cost || 0;
                if (['Procesado', 'Recibido Parcial'].includes(order.status)) {
                    info.verificationStatus = 'Pendiente';
                }
            }
        });

        return events
            .filter(e => eventInfoMap.has(e.id))
            .map(e => ({ ...e, ...eventInfoMap.get(e.id)! }))
            .sort((a, b) => new Date(b.firstProcessedDate).getTime() - new Date(a.firstProcessedDate).getTime());
    }, [orders, events]);
    
    const filteredEvents = useMemo(() => 
        processableEvents.filter(e => e.name.toLowerCase().includes(searchQuery.toLowerCase()))
    , [processableEvents, searchQuery]);

    // Data for Detail View
    const aggregatedProductsForSelectedEvent = useMemo(() => {
        if (!selectedEventId) return [];
        const itemsMap = new Map<string, { product: Product, quantity: number }>();
        orders
            .filter(o => o.event_id === selectedEventId && ['Procesado', 'Recibido Parcial'].includes(o.status))
            .forEach(order => {
                order.items.forEach(item => {
                    const product = productsMap.get(item.product_id);
                    if (product) {
                        const existing = itemsMap.get(item.product_id) || { product, quantity: 0 };
                        existing.quantity += item.quantity;
                        itemsMap.set(item.product_id, existing);
                    }
                });
            });
        return Array.from(itemsMap.values());
    }, [selectedEventId, orders, productsMap]);

    // Initialize reception state when an event is selected
    useEffect(() => {
        if (selectedEventId) {
            const initialReceptionItems = new Map<string, ReceptionItem>();
            aggregatedProductsForSelectedEvent.forEach(({ product, quantity }) => {
                initialReceptionItems.set(product.id, {
                    status: 'pendiente',
                    ordered_quantity: quantity,
                    received_quantity: quantity,
                });
            });
            setReceptionItems(initialReceptionItems);
        }
    }, [selectedEventId, aggregatedProductsForSelectedEvent]);

    // --- Handlers for Detail View ---
    const handleReceivedQuantityChange = (productId: string, value: string) => {
        const newQuantity = parseInt(value, 10);
        if (isNaN(newQuantity) || newQuantity < 0) return;

        // FIX: Explicitly type `prev` to resolve type inference issue.
        setReceptionItems((prev: Map<string, ReceptionItem>) => {
            const newMap = new Map(prev);
            const item = newMap.get(productId);
            if (item) {
                const newStatus = newQuantity < item.ordered_quantity ? 'parcial' : 'ok';
                newMap.set(productId, { ...item, received_quantity: newQuantity, status: item.status === 'incidencia' ? 'incidencia' : newStatus });
            }
            return newMap;
        });
    };

    const handleSetStatus = (productId: string, status: ReceptionLineStatus) => {
        // FIX: Explicitly type `prev` to resolve type inference issue.
        setReceptionItems((prev: Map<string, ReceptionItem>) => {
            const newMap = new Map(prev);
            const item = newMap.get(productId);
            if (item) {
                newMap.set(productId, { ...item, status });
            }
            return newMap;
        });
    };
    
    const handleOpenIncidentModal = (productId: string) => {
        setIncidentTarget({ productId });
        setIsIncidentModalOpen(true);
    };
    
    const handleSaveIncident = () => {
        if (!incidentTarget || !incidentDescription || !selectedEventId || !currentUser) return;
        
        handleSetStatus(incidentTarget.productId, 'incidencia');
        
        const product = productsMap.get(incidentTarget.productId);
        const bestSupplierInfo = product?.suppliers.sort((a,b) => a.price - b.price)[0];

        const newIncident: Incident = {
            id: `inc-${Date.now()}`, date: new Date().toISOString(), description: incidentDescription,
            reported_by: currentUser.id, status: 'Abierta', supplier_id: bestSupplierInfo?.supplier_id || 'unknown',
            product_id: incidentTarget.productId, event_id: selectedEventId,
        };

        setIncidents([...incidents, newIncident]);
        setIsIncidentModalOpen(false);
        setIncidentDescription('');
        setIncidentTarget(null);
    };

    const handleFinalizeReception = () => {
        if (!selectedEventId) return;

        const hasPartialOrIncident = Array.from(receptionItems.values()).some((item: ReceptionItem) => item.status === 'parcial' || item.status === 'incidencia');
        const finalStatus: OrderStatus = hasPartialOrIncident ? 'Recibido Parcial' : 'Recibido OK';

        setOrders(orders.map(o => {
            if (o.event_id === selectedEventId && ['Procesado', 'Recibido Parcial'].includes(o.status)) {
                return { ...o, status: finalStatus };
            }
            return o;
        }));
        
        alert(`Recepción finalizada. El estado del pedido general es: ${finalStatus}`);
        setSelectedEventId(null);
    };
    
    const handleDownloadSheet = () => {
        const event = events.find(e => e.id === selectedEventId);
        if (!event) return;
        
        const receptionData = aggregatedProductsForSelectedEvent.map(({ product }) => ({
            product,
            receptionInfo: receptionItems.get(product.id)!
        }));
        
        const incidentsForEvent = incidents.filter(inc => 
            // FIX: Explicitly typed `d` parameter to resolve type inference issue.
            receptionData.some((d: { product: Product; receptionInfo: ReceptionItem }) => d.product.id === inc.product_id && d.receptionInfo.status === 'incidencia')
        );

        generateReceptionSheetPdf(event, receptionData, incidentsForEvent, companyInfo, managerUser, creatorInfo.app_name);
    }

    const allItemsVerified = useMemo(() => 
        // FIX: Explicitly type `item` to resolve type inference issue where it was treated as `unknown`.
        Array.from(receptionItems.values()).every((item: ReceptionItem) => item.status !== 'pendiente'), 
    [receptionItems]);


    // --- RENDER LOGIC ---

    if (!selectedEventId) {
        // LIST VIEW
        return (
            <div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6">Gestión de Economato y Recepción</h1>
                <Card title="Historial de Pedidos Procesados">
                    <input 
                        type="text"
                        placeholder="Buscar pedido por nombre..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full p-2 mb-4 border rounded-md dark:bg-gray-700"
                    />
                    <div className="space-y-3">
                        {filteredEvents.map(event => (
                            <div key={event.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-lg">{event.name}</p>
                                    <p className="text-sm text-gray-500">Procesado: {new Date(event.firstProcessedDate).toLocaleDateString()} | Coste: {event.totalCost.toLocaleString('es-ES', {style: 'currency', currency: 'EUR'})}</p>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${event.verificationStatus === 'Pendiente' ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'}`}>
                                        {event.verificationStatus}
                                    </span>
                                    {event.verificationStatus === 'Pendiente' && 
                                        <button onClick={() => setSelectedEventId(event.id)} className="bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700">
                                            Gestionar Recepción
                                        </button>
                                    }
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        );
    }

    // DETAIL VIEW
    const event = events.find(e => e.id === selectedEventId);
    if (!event) return null;

    return (
        <div>
            <button onClick={() => setSelectedEventId(null)} className="text-sm text-primary-600 hover:underline mb-2">&larr; Volver al historial</button>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Recepción: {event.name}</h1>
            </div>
            <Card title="Verificación de Productos">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                         <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th className="px-2 py-2">Producto</th>
                                <th className="px-2 py-2">Cant. Pedida</th>
                                <th className="px-2 py-2">Cant. Recibida</th>
                                <th className="px-2 py-2 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {aggregatedProductsForSelectedEvent.map(({product}) => {
                                const itemState = receptionItems.get(product.id);
                                if (!itemState) return null;

                                const statusClasses = {
                                    pendiente: '',
                                    ok: 'bg-green-100 dark:bg-green-900/50',
                                    parcial: 'bg-yellow-100 dark:bg-yellow-900/50',
                                    incidencia: 'bg-red-100 dark:bg-red-900/50'
                                };

                                return (
                                    <tr key={product.id} className={`border-b dark:border-gray-700 ${statusClasses[itemState.status]}`}>
                                        <td className="p-2 font-semibold">{product.name}</td>
                                        <td className="p-2">{itemState.ordered_quantity}</td>
                                        <td className="p-2">
                                            <input 
                                                type="number" 
                                                value={itemState.received_quantity} 
                                                onChange={e => handleReceivedQuantityChange(product.id, e.target.value)}
                                                className="w-24 p-1 border rounded dark:bg-gray-800"
                                            />
                                        </td>
                                        <td className="p-2 text-center space-x-2">
                                            <button onClick={() => handleSetStatus(product.id, 'ok')} className="text-xs bg-green-500 text-white px-3 py-1 rounded">OK</button>
                                            <button onClick={() => handleOpenIncidentModal(product.id)} className="text-xs bg-red-500 text-white px-3 py-1 rounded">Incidencia</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <div className="mt-6 flex justify-between items-center flex-wrap gap-4">
                    <button onClick={handleDownloadSheet} className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 flex items-center">
                        <DownloadIcon className="w-5 h-5 mr-2" /> Descargar Hoja de Recepción
                    </button>
                    <button 
                        onClick={handleFinalizeReception} 
                        disabled={!allItemsVerified}
                        className="bg-green-600 text-white py-2 px-6 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        Finalizar Verificación
                    </button>
                </div>
            </Card>

            {isIncidentModalOpen && (
                <Modal isOpen={true} onClose={() => setIsIncidentModalOpen(false)} title={`Registrar Incidencia para ${productsMap.get(incidentTarget?.productId || '')?.name}`}>
                    <form onSubmit={(e) => { e.preventDefault(); handleSaveIncident(); }}>
                        <label>Descripción del Problema</label>
                        <textarea value={incidentDescription} onChange={e => setIncidentDescription(e.target.value)} rows={4} className="w-full mt-1 p-2 border rounded" required autoFocus/>
                        <div className="flex justify-end mt-4">
                            <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-md">Guardar Incidencia</button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
};
