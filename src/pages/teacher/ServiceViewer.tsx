import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/Card';
import { Service, ServiceGroup, User, Profile, ServiceRole, Recipe, Order, AppEvent, ServiceMenuItem } from '../../types';
import { Modal } from '../../components/Modal';
import { PlusIcon, TrashIcon, PrinterIcon } from '../../components/icons';
import { useNavigate } from 'react-router-dom';
import { addHeaderToPdf } from '../../utils/export';
import { useCompany } from '../../contexts/CompanyContext';
import { ALLERGENS_LIST, ALLERGEN_ICONS, ALLERGEN_COLORS } from '../../lib/allergens';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const SERVICE_ROLES: ServiceRole[] = ['Cocina', 'Postres', 'Servicios (Sala)', 'Cafetería'];

// --- DETAIL VIEW COMPONENT ---
const ServiceDetailView: React.FC<{ service: Service; onBack: () => void }> = ({ service, onBack }) => {
    const { 
        services, setServices, service_groups, users, recipes, setRecipes, products, setOrders, events,
        orders: allOrders, transfers: allTransfers, reservations: allReservations, sale_items: allSaleItems, 
        dining_reservations: allDiningReservations, dining_services: allDiningServices 
    } = useData();
    const { companyInfo } = useCompany();
    const { currentUser } = useAuth();
    const [addStep, setAddStep] = useState<null | 'choice' | 'database' | 'manual'>(null);
    const navigate = useNavigate();

    const usersMap = useMemo(() => new Map<string, User>(users.map((u: any) => [u.id, u])), [users]);
    const recipesMap = useMemo(() => new Map(recipes.map((r: any) => [r.id, r])), [recipes]);
    const productsMap = useMemo(() => new Map(products.map((p: any) => [p.id, p])), [products]);

    const group = useMemo(() => service_groups.find((g: any) => g.id === service.service_group_id), [service_groups, service.service_group_id]);
    const teachersInGroup = useMemo(() => group?.teacher_ids.map(id => usersMap.get(id)).filter((u): u is User => !!u) || [], [group, usersMap]);

    const serviceCosts = useMemo(() => {
        const event = events.find(e => {
            return e.name === service.name && new Date(e.start_date).toDateString() === new Date(service.date).toDateString();
        });

        if (!event) return { orders: 0, transfers: 0, takeaway_rev: 0, dining_rev: 0, total: 0 };

        const serviceOrders = allOrders.filter(o => o.event_id === event.id && o.status === 'Completado');
        const serviceTransfers = allTransfers.filter(t => t.to_event_id === event.id);
        
        // Takeaway Revenue
        const takeawayRev = allReservations
            .filter(r => r.status === 'recogido')
            .reduce((sum, res) => {
                const item = allSaleItems.find(si => si.id === res.sale_item_id);
                if (item && item.event_id === event.id) {
                    return sum + (res.quantity * item.price);
                }
                return sum;
            }, 0);

        // Dining Revenue
        const diningRev = allDiningReservations.reduce((sum, res) => {
            const dService = allDiningServices.find(ds => ds.id === res.service_id);
            if (dService && dService.service_id === service.id) {
                return sum + (res.total_price || 0);
            }
            return sum;
        }, 0);

        const ordersCost = serviceOrders.reduce((sum, o) => sum + (o.cost || 0), 0);
        const transfersCost = serviceTransfers.reduce((sum, t) => sum + (t.amount || 0), 0);

        return {
            orders: ordersCost,
            transfers: transfersCost,
            takeaway_rev: takeawayRev,
            dining_rev: diningRev,
            total: (ordersCost + transfersCost) - (takeawayRev + diningRev)
        };
    }, [service, allOrders, allTransfers, allReservations, allSaleItems, allDiningReservations, allDiningServices, events]);

    const handleRoleChange = (role: ServiceRole, userId: string) => {
        const updatedService = { ...service, roles: { ...service.roles, [role]: userId } };
        setServices(services.map(s => s.id === service.id ? updatedService : s));
    };

    const handleAddRecipe = (recipe_id: string) => {
        const recipe = recipesMap.get(recipe_id);
        if (!recipe) return;

        if (service.menu.some(item => item.recipe_id === recipe_id)) return;
        
        const newItem: ServiceMenuItem = {
            id: `item-${Date.now()}`,
            recipe_id: recipe.id,
            name: recipe.name,
            category: recipe.category || 'Otros',
            order_number: service.menu.length + 1,
            work_area: currentUser?.work_area || 'Cocina',
            allergens: recipe.ingredients.flatMap((ing: any) => productsMap.get(ing.product_id)?.allergens || []),
            description: recipe.description
        };

        const updatedService = { ...service, menu: [...service.menu, newItem] };
        setServices(services.map(s => s.id === service.id ? updatedService : s));
        setAddStep(null);
    };

    const handleAddManualRecipe = (newRecipe: Recipe) => {
        setRecipes([...recipes, newRecipe]);
        
        const newItem: ServiceMenuItem = {
            id: `item-${Date.now()}`,
            recipe_id: newRecipe.id,
            name: newRecipe.name,
            category: newRecipe.category || 'Otros',
            order_number: service.menu.length + 1,
            work_area: currentUser?.work_area || 'Cocina',
            allergens: newRecipe.selected_allergens || [],
            description: newRecipe.description,
            is_custom: true
        };

        const updatedService = { ...service, menu: [...service.menu, newItem] };
        setServices(services.map(s => s.id === service.id ? updatedService : s));
        setAddStep(null);
    };

    const handleRemoveRecipe = (recipe_id: string) => {
        const updatedService = { ...service, menu: service.menu.filter(item => item.recipe_id !== recipe_id) };
        setServices(services.map(s => s.id === service.id ? updatedService : s));
    };

    const generateAllergenDoc = () => {
        const doc = new jsPDF();
        const date = new Date(service.date).toLocaleDateString();
        const startY = addHeaderToPdf(doc, companyInfo, 'INFORME DE ALÉRGENOS', `Servicio: ${service.name}\nFecha: ${date}`);

        const body = service.menu.flatMap(item => {
            const recipe = recipesMap.get(item.recipe_id || '');
            if (!recipe && !item.name) return [];
            
            return {
                name: item.name || recipe?.name || 'Plato',
                allergens: (item.allergens || []).join(', ') || 'Ninguno'
            };
        }).map(r => [r.name, r.allergens]);

        (doc as any).autoTable({ startY: startY + 10, head: [['Plato', 'Alérgenos']], body });
        doc.save(`alergenos_${service.name}.pdf`);
    };
    
    const generateServiceOrderDoc = () => {
        const doc = new jsPDF();
        const date = new Date(service.date).toLocaleDateString();
        const startY = addHeaderToPdf(doc, companyInfo, 'ORDEN DE SERVICIO', `Servicio: ${service.name}\nFecha: ${date}`);

        const body = service.menu.map(item => {
            const r = recipesMap.get(item.recipe_id || '');
            
            return [
                item.name || r?.name || 'Receta no encontrada',
                (item.allergens || []).join(', ') || '-',
                r?.presentation || '-',
                `${r?.temperature || '-'} / ${r?.service_time || '-'}`,
                r?.recommended_marking || '-',
                r?.service_type || '-',
                item.description || r?.client_description || '-'
            ];
        });

        (doc as any).autoTable({ startY: startY + 10, head: [['Plato', 'Alérgenos', 'Presentación', 'Temp/Pase', 'Marcaje', 'Servicio', 'Descripción Cliente']], body });
        doc.save(`orden_servicio_${service.name}.pdf`);
    };

    const generateDraftOrder = () => {
        const activeEvent = events.find(e => e.type === 'Regular' && new Date(e.end_date) > new Date());
        if (!activeEvent) {
            alert("No hay un evento de pedido 'Regular' activo para asociar el borrador.");
            return;
        }

        const aggregatedIngredients = new Map<string, number>();
        service.menu.forEach(item => {
            const recipe = recipesMap.get(item.recipe_id);
            recipe?.ingredients.forEach((ing: any) => {
                aggregatedIngredients.set(ing.product_id, (aggregatedIngredients.get(ing.product_id) || 0) + ing.quantity);
            });
        });

        const newOrder: Order = {
            id: `ord-draft-${Date.now()}`,
            user_id: group?.teacher_ids[0] || '', // Assign to first teacher in group
            date: new Date().toISOString(),
            status: 'Borrador',
            event_id: activeEvent.id,
            items: Array.from(aggregatedIngredients.entries()).map(([product_id, quantity]) => ({
                product_id, quantity, price: productsMap.get(product_id)?.suppliers[0]?.price || 0, tax: productsMap.get(product_id)?.tax || 0
            })),
            notes: `Borrador generado automáticamente desde el servicio: ${service.name}`
        };
        setOrders(prev => [...prev, newOrder]);
        alert('Borrador de pedido generado. Serás redirigido para editarlo.');
        navigate(`/teacher/orders-management/portal/edit/${newOrder.id}`);
    };

    return (
        <div>
            <button onClick={onBack} className="text-sm text-primary-600 hover:underline mb-4">&larr; Volver a mis servicios</button>
            <div className="grid grid-cols-1 gap-6">
                <div className="space-y-6">
                    <Card title="Menú del Servicio">
                        <button onClick={() => setAddStep('choice')} className="bg-blue-500 text-white px-3 py-1 rounded mb-4">Añadir Plato</button>
                        {service.menu.map(item => {
                            const recipe = recipesMap.get(item.recipe_id || '');
                            return <div key={item.id} className="flex justify-between items-center p-2 border-b dark:border-gray-600">{item.name || recipe?.name}<button onClick={() => handleRemoveRecipe(item.recipe_id || '')}><TrashIcon className="w-4 h-4 text-red-500"/></button></div>
                        })}
                        {service.menu.length === 0 && <p className="text-gray-500">Aún no se han añadido platos al menú.</p>}
                    </Card>
                    <Card title="Documentación de Salida">
                        <div className="flex space-x-4">
                            <button onClick={generateAllergenDoc} className="bg-gray-600 text-white py-2 px-4 rounded-md flex items-center"><PrinterIcon className="w-5 h-5 mr-1"/> Informe de Alérgenos</button>
                            <button onClick={generateServiceOrderDoc} className="bg-gray-600 text-white py-2 px-4 rounded-md flex items-center"><PrinterIcon className="w-5 h-5 mr-1"/> Orden de Servicio</button>
                        </div>
                    </Card>
                    <Card title="Generación de Pedido">
                         <button onClick={generateDraftOrder} className="bg-green-600 text-white py-2 px-4 rounded-md">Generar Borrador de Pedido</button>
                    </Card>
                    
                    <Card title="Resumen de Costes del Servicio">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600">Pedidos (Material):</span>
                                <span className="font-mono font-bold text-amber-700">{serviceCosts.orders.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600">Traspasos (Producción propia):</span>
                                <span className="font-mono font-bold text-indigo-700">{serviceCosts.transfers.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
                            </div>
                            {(serviceCosts.takeaway_rev > 0 || serviceCosts.dining_rev > 0) && (
                                <div className="pt-2 border-t space-y-2">
                                    {serviceCosts.takeaway_rev > 0 && (
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-600">Ingresos Take-Away:</span>
                                            <span className="font-mono font-bold text-green-600">+{serviceCosts.takeaway_rev.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
                                        </div>
                                    )}
                                    {serviceCosts.dining_rev > 0 && (
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-600">Ingresos Comedor:</span>
                                            <span className="font-mono font-bold text-green-600">+{serviceCosts.dining_rev.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="pt-2 border-t flex justify-between items-center">
                                <span className="font-bold text-gray-800 uppercase tracking-tighter">Neto Real:</span>
                                <span className={`font-mono font-bold text-xl ${serviceCosts.total > 0 ? 'text-primary-600' : 'text-green-600'}`}>
                                    {serviceCosts.total.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                                </span>
                            </div>
                            <p className="text-[10px] text-gray-500 italic">
                                * Los costes de pedidos solo incluyen aquellos marcados como "Completado". Los ingresos Take-Away solo incluyen raciones marcadas como "recogidas".
                            </p>
                        </div>
                    </Card>
                </div>
            </div>
            
            {addStep === 'choice' && (
                <Modal isOpen={true} onClose={() => setAddStep(null)} title="Añadir Plato">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
                        <button 
                            onClick={() => setAddStep('database')}
                            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all group"
                        >
                            <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mb-3 group-hover:bg-primary-600 group-hover:text-white transition-colors">
                                <PlusIcon className="w-6 h-6" />
                            </div>
                            <span className="font-bold text-gray-700">Base de Datos</span>
                            <p className="text-xs text-gray-500 text-center mt-1">Elegir una ficha existente</p>
                        </button>
                        
                        <button 
                            onClick={() => setAddStep('manual')}
                            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
                        >
                            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-3 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <PlusIcon className="w-6 h-6" />
                            </div>
                            <span className="font-bold text-gray-700">Ficha Manual</span>
                            <p className="text-xs text-gray-500 text-center mt-1">Introducir datos a mano</p>
                        </button>
                    </div>
                </Modal>
            )}

            {addStep === 'database' && <RecipeSelectorModal recipes={recipes} onSelect={handleAddRecipe} onClose={() => setAddStep('choice')} />}
            
            {addStep === 'manual' && (
                <ManualRecipeModal 
                    onSave={handleAddManualRecipe} 
                    onClose={() => setAddStep('choice')} 
                    authorId={currentUser?.id || ''}
                />
            )}
        </div>
    );
};

const ManualRecipeModal: React.FC<{ onSave: (recipe: Recipe) => void, onClose: () => void, authorId: string }> = ({ onSave, onClose, authorId }) => {
    const [name, setName] = useState('');
    const [presentation, setPresentation] = useState('');
    const [temperature, setTemperature] = useState<'Caliente' | 'Frio' | 'Ambiente'>('Caliente');
    const [serviceTime, setServiceTime] = useState('');
    const [recommendedMarking, setRecommendedMarking] = useState('');
    const [serviceType, setServiceType] = useState('');
    const [clientDescription, setClientDescription] = useState('');
    const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);

    const toggleAllergen = (allergen: string) => {
        setSelectedAllergens(prev => 
            prev.includes(allergen) 
                ? prev.filter(a => a !== allergen) 
                : [...prev, allergen]
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;

        const newRecipe: Recipe = {
            id: `rec-manual-${Date.now()}`,
            name,
            description: clientDescription,
            author_id: authorId,
            yield_amount: 1,
            yield_unit: 'Pase',
            category: 'Manual',
            ingredients: [],
            preparation_steps: 'Añadido manualmente al servicio',
            is_public: false,
            cost: 0,
            price: 0,
            presentation,
            temperature,
            service_time: serviceTime,
            recommended_marking: recommendedMarking,
            service_type: serviceType,
            client_description: clientDescription,
            selected_allergens: selectedAllergens
        };

        onSave(newRecipe);
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="Crear Ficha Manual">
            <form onSubmit={handleSubmit} className="space-y-4 p-1">
                <div>
                    <label className="block text-sm font-medium mb-1">Nombre del Plato *</label>
                    <input 
                        type="text" 
                        required 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        className="w-full p-2 border rounded dark:bg-gray-700" 
                        placeholder="Ej: Lubina a la sal"
                    />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Temperatura</label>
                        <select 
                            value={temperature} 
                            onChange={e => setTemperature(e.target.value as any)} 
                            className="w-full p-2 border rounded dark:bg-gray-700"
                        >
                            <option value="Caliente">Caliente</option>
                            <option value="Frio">Frío</option>
                            <option value="Ambiente">Ambiente</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Temp / Pase</label>
                        <input 
                            type="text" 
                            value={serviceTime} 
                            onChange={e => setServiceTime(e.target.value)} 
                            className="w-full p-2 border rounded dark:bg-gray-700" 
                            placeholder="Ej: 65°C / 13:30"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Presentación / Vajilla</label>
                    <input 
                        type="text" 
                        value={presentation} 
                        onChange={e => setPresentation(e.target.value)} 
                        className="w-full p-2 border rounded dark:bg-gray-700" 
                        placeholder="Ej: Plato trinchero blanco"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Marcaje recomendado</label>
                    <input 
                        type="text" 
                        value={recommendedMarking} 
                        onChange={e => setRecommendedMarking(e.target.value)} 
                        className="w-full p-2 border rounded dark:bg-gray-700" 
                        placeholder="Ej: Cuchara sopera"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Tipo de Servicio</label>
                    <input 
                        type="text" 
                        value={serviceType} 
                        onChange={e => setServiceType(e.target.value)} 
                        className="w-full p-2 border rounded dark:bg-gray-700" 
                        placeholder="Ej: Emplatado"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Descripción para el Cliente (Carta)</label>
                    <textarea 
                        value={clientDescription} 
                        onChange={e => setClientDescription(e.target.value)} 
                        className="w-full p-2 border rounded dark:bg-gray-700" 
                        rows={3}
                        placeholder="Descripción que aparecerá en la carta..."
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">Alérgenos</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {ALLERGENS_LIST.map(allergen => {
                            const isSelected = selectedAllergens.includes(allergen);
                            const Icon = ALLERGEN_ICONS[allergen];
                            const color = ALLERGEN_COLORS[allergen];
                            return (
                                <button
                                    key={allergen}
                                    type="button"
                                    onClick={() => toggleAllergen(allergen)}
                                    className={`flex items-center space-x-2 p-2 rounded-lg border transition-all ${
                                        isSelected 
                                            ? 'bg-white border-primary-500 shadow-sm' 
                                            : 'bg-gray-50 border-gray-200 opacity-60 grayscale'
                                    }`}
                                >
                                    <div 
                                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                                        style={{ backgroundColor: isSelected ? color : '#9ca3af' }}
                                    >
                                        <Icon className="w-4 h-4 text-white" />
                                    </div>
                                    <span className="text-[10px] font-bold truncate">{allergen}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                    <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700">Guardar e Insertar</button>
                </div>
            </form>
        </Modal>
    );
};

const RecipeSelectorModal: React.FC<{ recipes: Recipe[], onClose: () => void, onSelect: (recipe_id: string) => void }> = ({ recipes, onClose, onSelect }) => {
    return (
        <Modal isOpen={true} onClose={onClose} title="Seleccionar Receta">
            <div className="max-h-96 overflow-y-auto">
                {recipes.map(r => (
                    <div key={r.id} onClick={() => { onSelect(r.id); onClose(); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer">{r.name}</div>
                ))}
            </div>
        </Modal>
    );
};

// --- LIST VIEW COMPONENT ---
export const ServiceViewer: React.FC = () => {
    const { services, service_groups } = useData();
    const { currentUser } = useAuth();
    const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
    
    const selectedService = useMemo(() => services.find((s: any) => s.id === selectedServiceId), [services, selectedServiceId]);

    const myServices = useMemo(() => {
        if (!currentUser) return [];
        const myGroupIds = new Set(service_groups.filter((g: any) => g.teacher_ids.includes(currentUser.id)).map((g: any) => g.id));
        return services.filter((s: any) => myGroupIds.has(s.service_group_id));
    }, [services, service_groups, currentUser]);

    if (selectedService) {
        return <ServiceDetailView service={selectedService} onBack={() => setSelectedServiceId(null)} />;
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6">Planificador de Servicios</h1>
            <Card title="Mis Próximos Servicios">
                <div className="space-y-3">
                    {myServices.map(service => (
                        <div key={service.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg flex justify-between items-center">
                            <div>
                                <h3 className="font-bold">{service.name}</h3>
                                <p className="text-sm">{new Date(service.date).toLocaleDateString()}</p>
                            </div>
                            <button onClick={() => setSelectedServiceId(service.id)} className="bg-primary-600 text-white py-2 px-4 rounded-md">Gestionar Servicio</button>
                        </div>
                    ))}
                     {myServices.length === 0 && (
                        <p className="text-gray-500 text-center p-4">No estás asignado a ningún servicio próximo.</p>
                     )}
                </div>
            </Card>
        </div>
    );
};