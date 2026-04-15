import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/Card';
import { Service, ServiceGroup, User, Profile, ServiceRole, Recipe, Order, Event } from '../../types';
import { Modal } from '../../components/Modal';
import { PlusIcon, TrashIcon, PrinterIcon } from '../../components/icons';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const SERVICE_ROLES: ServiceRole[] = ['Cocina', 'Postres', 'Servicios (Sala)', 'Cafetería'];

// --- DETAIL VIEW COMPONENT ---
const ServiceDetailView: React.FC<{ service: Service; onBack: () => void }> = ({ service, onBack }) => {
    const { services, setServices, service_groups, users, recipes, products, setOrders, events } = useData();
    const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
    const navigate = useNavigate();

    const usersMap = useMemo(() => new Map<string, User>(users.map((u: any) => [u.id, u])), [users]);
    const recipesMap = useMemo(() => new Map(recipes.map((r: any) => [r.id, r])), [recipes]);
    const productsMap = useMemo(() => new Map(products.map((p: any) => [p.id, p])), [products]);

    const group = useMemo(() => service_groups.find((g: any) => g.id === service.service_group_id), [service_groups, service.service_group_id]);
    const teachersInGroup = useMemo(() => group?.teacher_ids.map(id => usersMap.get(id)).filter((u): u is User => !!u) || [], [group, usersMap]);

    const handleRoleChange = (role: ServiceRole, userId: string) => {
        const updatedService = { ...service, roles: { ...service.roles, [role]: userId } };
        setServices(services.map(s => s.id === service.id ? updatedService : s));
    };

    const handleAddRecipe = (recipe_id: string) => {
        if (service.menu.some(item => item.recipe_id === recipe_id)) return;
        const updatedService = { ...service, menu: [...service.menu, { recipe_id }] };
        setServices(services.map(s => s.id === service.id ? updatedService : s));
    };

    const handleRemoveRecipe = (recipe_id: string) => {
        const updatedService = { ...service, menu: service.menu.filter(item => item.recipe_id !== recipe_id) };
        setServices(services.map(s => s.id === service.id ? updatedService : s));
    };

    const generateAllergenDoc = () => {
        const doc = new jsPDF();
        doc.text(`Informe de Alérgenos - ${service.name}`, 14, 15);
        doc.text(`Fecha: ${new Date(service.date).toLocaleDateString()}`, 14, 22);

        const body = service.menu.flatMap(item => {
            const recipe = recipesMap.get(item.recipe_id);
            if (!recipe) return [];
            const allergens = new Set<string>();
            recipe.ingredients.forEach((ing: any) => {
                productsMap.get(ing.product_id)?.allergens.forEach((a: string) => allergens.add(a));
            });
            return {
                name: recipe.name,
                allergens: Array.from(allergens).join(', ') || 'Ninguno'
            };
        }).map(r => [r.name, r.allergens]);

        (doc as any).autoTable({ startY: 30, head: [['Plato', 'Alérgenos']], body });
        doc.save(`alergenos_${service.name}.pdf`);
    };
    
    const generateServiceOrderDoc = () => {
        const doc = new jsPDF();
        doc.text(`Orden de Servicio - ${service.name}`, 14, 15);
        doc.text(`Fecha: ${new Date(service.date).toLocaleDateString()}`, 14, 22);

        const body = service.menu.map(item => {
            const r = recipesMap.get(item.recipe_id);
            if (!r) return ['Receta no encontrada', '', '', '', '', '', ''];
            const allergens = new Set<string>();
            r.ingredients.forEach((ing: any) => {
                productsMap.get(ing.product_id)?.allergens.forEach((a: string) => allergens.add(a));
            });
            return [
                r.name,
                Array.from(allergens).join(', ') || '-',
                r.presentation || '-',
                `${r.temperature || '-'} / ${r.service_time || '-'}`,
                r.recommended_marking || '-',
                r.service_type || '-',
                r.client_description || '-'
            ];
        });

        (doc as any).autoTable({ startY: 30, head: [['Plato', 'Alérgenos', 'Presentación', 'Temp/Pase', 'Marcaje', 'Servicio', 'Descripción Cliente']], body });
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
        navigate(`/teacher/order-portal/edit/${newOrder.id}`);
    };

    return (
        <div>
            <button onClick={onBack} className="text-sm text-primary-600 hover:underline mb-4">&larr; Volver a mis servicios</button>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card title="Menú del Servicio">
                        <button onClick={() => setIsRecipeModalOpen(true)} className="bg-blue-500 text-white px-3 py-1 rounded mb-4">Añadir Plato</button>
                        {service.menu.map(item => {
                            const recipe = recipesMap.get(item.recipe_id);
                            if (!recipe) return null;
                            return <div key={item.recipe_id} className="flex justify-between items-center p-2 border-b dark:border-gray-600">{recipe.name}<button onClick={() => handleRemoveRecipe(item.recipe_id)}><TrashIcon className="w-4 h-4 text-red-500"/></button></div>
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
                </div>
                <div>
                    <Card title="Asignación de Roles para este Servicio">
                        {SERVICE_ROLES.map(role => (
                            <div key={role} className="mb-2">
                                <label className="text-sm font-semibold">{role}</label>
                                <select value={service.roles[role] || ''} onChange={e => handleRoleChange(role, e.target.value)} className="w-full p-1 border rounded dark:bg-gray-700">
                                    <option value="">-- Sin Asignar --</option>
                                    {teachersInGroup.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                        ))}
                    </Card>
                </div>
            </div>
            {isRecipeModalOpen && <RecipeSelectorModal recipes={recipes} onSelect={handleAddRecipe} onClose={() => setIsRecipeModalOpen(false)} />}
        </div>
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