import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/Card';
import { Service, ServiceGroup, User, Profile, ServiceRole, Recipe, Order, AppEvent, ServiceMenuItem } from '../../types';
import { Modal } from '../../components/Modal';
import { 
    Plus as PlusIcon, 
    Trash2 as TrashIcon, 
    Printer as PrinterIcon, 
    ChevronUp, 
    ChevronDown, 
    X, 
    Plus,
    Info,
    AlertTriangle,
    Edit2,
    Save
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { addHeaderToPdf } from '../../utils/export';
import { useCompany } from '../../contexts/CompanyContext';
import { ALLERGENS_LIST, ALLERGEN_ICONS, ALLERGEN_COLORS } from '../../lib/allergens';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const SERVICE_ROLES: ServiceRole[] = ['Cocina', 'Postres', 'Servicios (Sala)', 'Cafetería', 'Pan del servicio', 'Mignardises'];

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
    const [targetMenuItemId, setTargetMenuItemId] = useState<string | null>(null);
    const [editingMenuItemId, setEditingMenuItemId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<ServiceRole | 'Global'>('Global');
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

    const SECTIONS: ServiceRole[] = ['Servicios (Sala)', 'Cafetería', 'Cocina', 'Postres', 'Mignardises', 'Pan del servicio'];

    // Toggle collapse state for a card
    const toggleCollapse = (itemId: string) => {
        setCollapsedSections(prev => ({ ...prev, [itemId]: !prev[itemId] }));
    };
    const navigate = useNavigate();

    const usersMap = useMemo(() => new Map<string, User>(users.map((u: any) => [u.id, u])), [users]);
    const recipesMap = useMemo(() => new Map(recipes.map((r: any) => [r.id, r])), [recipes]);
    const productsMap = useMemo(() => new Map(products.map((p: any) => [p.id, p])), [products]);

    const group = useMemo(() => service_groups.find((g: any) => g.id === service.service_group_id), [service_groups, service.service_group_id]);
    
    // Identify current user's role(s) in this service
    const myRoles = useMemo(() => {
        if (!currentUser) return [];
        return Object.entries(service.roles)
            .filter(([_, uid]) => uid === currentUser.id)
            .map(([role]) => role as ServiceRole);
    }, [service.roles, currentUser]);

    const isFOH = myRoles.includes('Servicios (Sala)') || currentUser?.role === 'admin';

    const handleRoleSubmission = (role: ServiceRole) => {
        const completedRoles = service.completed_roles || [];
        if (completedRoles.includes(role)) return;
        
        const updatedService = { ...service, completed_roles: [...completedRoles, role] };
        setServices(services.map(s => s.id === service.id ? updatedService : s));
    };

    const toggleRoleInactivity = (role: ServiceRole) => {
        if (!isFOH) return;
        const inactiveRoles = service.inactive_roles || [];
        const isCurrentlyInactive = inactiveRoles.includes(role);
        
        const updatedService = { 
            ...service, 
            inactive_roles: isCurrentlyInactive 
                ? inactiveRoles.filter(r => r !== role) 
                : [...inactiveRoles, role] 
        };
        setServices(services.map(s => s.id === service.id ? updatedService : s));
    };

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

    const handleDistribute = () => {
        const updatedService = { ...service, status: 'Confirmado' as const };
        setServices(services.map(s => s.id === service.id ? updatedService : s));
        alert('Menú distribuido a la vista de comedor.');
    };

    const handleToggleClosedRole = (role: ServiceRole) => {
        const closedRoles = service.closed_roles || [];
        const isClosed = closedRoles.includes(role);
        
        const updatedService = { 
            ...service, 
            closed_roles: isClosed 
                ? closedRoles.filter((r: ServiceRole) => r !== role) 
                : [...closedRoles, role] 
        };
        setServices(services.map(s => s.id === service.id ? updatedService : s));
    };

    const isRoleClosed = (role: ServiceRole) => (service.closed_roles || []).includes(role);

    const handleAddRecipe = (recipe_id: string) => {
        const recipe = recipesMap.get(recipe_id);
        if (!recipe) return;

        const roleForNewItem = activeTab !== 'Global' ? activeTab : (myRoles[0] || 'Cocina');

        if (targetMenuItemId) {
            // Adding component to existing dish
            const updatedMenu = service.menu.map(item => {
                if (item.id === targetMenuItemId) {
                    const currentIds = item.recipe_ids || (item.recipe_id ? [item.recipe_id] : []);
                    if (currentIds.includes(recipe_id)) return item;
                    return { ...item, recipe_ids: [...currentIds, recipe_id] };
                }
                return item;
            });
            const updatedService = { ...service, menu: updatedMenu };
            setServices(services.map(s => s.id === service.id ? updatedService : s));
            setTargetMenuItemId(null);
            setAddStep(null);
            return;
        }

        if (service.menu.some(item => (item.recipe_ids || (item.recipe_id ? [item.recipe_id] : [])).includes(recipe_id))) return;
        
        const newItem: ServiceMenuItem = {
            id: `item-${Date.now()}`,
            recipe_id: recipe.id,
            recipe_ids: [recipe.id],
            name: recipe.name,
            category: recipe.category || 'Otros',
            order_number: service.menu.length + 1,
            work_area: currentUser?.work_area || 'Cocina',
            role: roleForNewItem,
            allergens: recipe.ingredients.flatMap((ing: any) => productsMap.get(ing.product_id)?.allergens || []),
            description: recipe.description
        };

        const updatedService = { ...service, menu: [...service.menu, newItem] };
        setServices(services.map(s => s.id === service.id ? updatedService : s));
        setAddStep(null);
    };

    const handleAddManualRecipe = (newRecipe: Recipe, assignedRole: ServiceRole) => {
        setRecipes([...recipes, newRecipe]);
        
        const newItem: ServiceMenuItem = {
            id: `item-${Date.now()}`,
            recipe_id: newRecipe.id,
            recipe_ids: [newRecipe.id],
            name: newRecipe.name,
            category: newRecipe.category || 'Otros',
            order_number: service.menu.length + 1,
            work_area: currentUser?.work_area || 'Cocina',
            role: assignedRole,
            allergens: newRecipe.selected_allergens || [],
            description: newRecipe.description,
            is_custom: true
        };

        const updatedService = { ...service, menu: [...service.menu, newItem] };
        setServices(services.map(s => s.id === service.id ? updatedService : s));
        setAddStep(null);
    };

    const handleRemoveRecipe = (itemId: string) => {
        const updatedService = { ...service, menu: service.menu.filter(item => item.id !== itemId) };
        setServices(services.map(s => s.id === service.id ? updatedService : s));
    };

    const generateAllergenDoc = () => {
        const doc = new jsPDF();
        const date = new Date(service.date).toLocaleDateString();
        const startY = addHeaderToPdf(doc, companyInfo, 'INFORME DE ALÉRGENOS', `Servicio: ${service.name}\nFecha: ${date}`);

        const body = service.menu.flatMap(item => {
            const recipeIds = item.recipe_ids || (item.recipe_id ? [item.recipe_id] : []);
            const recipes = recipeIds.map(rid => recipesMap.get(rid)).filter((r): r is Recipe => !!r);
            
            const itemAllergens = new Set(item.allergens || []);
            recipes.forEach(r => (r.selected_allergens || []).forEach(a => itemAllergens.add(a)));

            return {
                name: item.name || recipes[0]?.name || 'Plato',
                allergens: Array.from(itemAllergens).join(', ') || 'Ninguno'
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
            const recipeIds = item.recipe_ids || (item.recipe_id ? [item.recipe_id] : []);
            const recipes = recipeIds.map(rid => recipesMap.get(rid)).filter((r): r is Recipe => !!r);
            const r = recipes[0];
            
            const allAllergens = new Set(item.allergens || []);
            recipes.forEach(rec => (rec.selected_allergens || []).forEach(a => allAllergens.add(a)));

            return [
                item.name || r?.name || 'Receta no encontrada',
                Array.from(allAllergens).join(', ') || '-',
                item.presentation || r?.presentation || '-',
                `${item.temperature || r?.temperature || '-'} / ${item.service_time || r?.service_time || '-'}`,
                item.cutlery_required || r?.recommended_marking || '-',
                item.service_type || r?.service_type || '-',
                item.description || r?.client_description || '-'
            ];
        });

        (doc as any).autoTable({ startY: startY + 10, head: [['Plato', 'Alérgenos', 'Presentación', 'Temp/Pase', 'Marcaje', 'Servicio', 'Descripción Cliente']], body });
        doc.save(`orden_servicio_${service.name}.pdf`);
    };

    const handleExportStudentSheets = () => {
        const doc = new jsPDF();
        const dateStr = new Date(service.date).toLocaleDateString();
        
        // Find reservations for this service to track allergens
        const dService = allDiningServices.find(ds => ds.service_id === service.id);
        const serviceReservations = dService ? allDiningReservations.filter(res => res.service_id === dService.id) : [];

        service.menu.forEach((item, index) => {
            if (index > 0) doc.addPage();
            
            const startY = addHeaderToPdf(
                doc, 
                companyInfo, 
                'FICHA TÉCNICA DE SERVICIO (ALUMNOS)', 
                `Plato: ${item.name.toUpperCase()}\nCategoría: ${item.category}\nServicio: ${service.name}\nProtocolo Global: ${service.global_setup?.service_type || 'Estándar'}\nFecha: ${dateStr}`
            );

            let currentY = startY + 10;

            // Find diners with allergens matching this dish
            const dishAllergens = new Set(item.allergens || []);
            const dinersWithAlerts: { mesa: string; name: string; allergens: string[] }[] = [];
            
            serviceReservations.forEach(res => {
                res.diners_allergens.forEach(diner => {
                    const matchingAllergens = diner.allergens.filter(a => dishAllergens.has(a));
                    if (matchingAllergens.length > 0) {
                        dinersWithAlerts.push({
                            mesa: res.table_number || 'S/N',
                            name: diner.diner_name || 'Comensal',
                            allergens: matchingAllergens
                        });
                    }
                });
            });

            // 1. Composition
            doc.setFontSize(10);
            doc.setTextColor(37, 99, 235);
            doc.text('1. COMPOSICIÓN Y RECETAS', 14, currentY);
            currentY += 5;

            const recipeIds = item.recipe_ids || (item.recipe_id ? [item.recipe_id] : []);
            const itemRecipes = recipeIds.map(rid => recipesMap.get(rid)).filter((r): r is Recipe => !!r);

            if (itemRecipes.length > 0) {
                (doc as any).autoTable({
                    startY: currentY,
                    head: [['Receta', 'Descripción', 'Alérgenos']],
                    body: itemRecipes.map(r => [
                        r.name,
                        r.description || '-',
                        (r.selected_allergens || []).join(', ') || 'Sin alérgenos'
                    ]),
                    theme: 'grid',
                    headStyles: { fillColor: [37, 99, 235], fontSize: 8 },
                    bodyStyles: { fontSize: 7 },
                    margin: { left: 14, right: 14 }
                });
                currentY = (doc as any).lastAutoTable.finalY + 8;
            } else {
                doc.setFontSize(8);
                doc.setTextColor(100);
                doc.text('Sin recetas vinculadas.', 14, currentY);
                currentY += 8;
            }

            // 2. Service Details
            doc.setFontSize(10);
            doc.setTextColor(217, 119, 6);
            doc.text('2. INSTRUCCIONES DE SERVICIO', 14, currentY);
            currentY += 5;

            const firstRecipe = itemRecipes[0];
            const serviceData = [
                ['Explicación', item.service_explanation || firstRecipe?.service_explanation || item.description || '-'],
                ['Temp/Pase', item.temperature || firstRecipe?.temperature || '-'],
                ['Protocolo', item.service_type || firstRecipe?.service_type || '-'],
                ['Marcaje', item.cutlery_required || firstRecipe?.cutlery_required || firstRecipe?.recommended_marking || '-'],
                ['Acabado', item.presentation || firstRecipe?.presentation || '-']
            ];

            (doc as any).autoTable({
                startY: currentY,
                body: serviceData,
                theme: 'striped',
                bodyStyles: { fontSize: 7 },
                columnStyles: {
                    0: { cellWidth: 35, fontStyle: 'bold', fillColor: [243, 244, 246] }
                },
                margin: { left: 14, right: 14 }
            });

            currentY = (doc as any).lastAutoTable.finalY + 8;

            // 3. Allergen Alerts
            if (dinersWithAlerts.length > 0) {
                doc.setFontSize(10);
                doc.setTextColor(220, 38, 38);
                doc.text('(!) ALERTAS DE ALÉRGENOS POR MESA', 14, currentY);
                currentY += 5;

                (doc as any).autoTable({
                    startY: currentY,
                    head: [['Mesa', 'Comensal', 'Alérgenos']],
                    body: dinersWithAlerts.map(d => [d.mesa, d.name, d.allergens.join(', ')]),
                    theme: 'grid',
                    headStyles: { fillColor: [220, 38, 38], fontSize: 8 },
                    bodyStyles: { fontSize: 7, fontWeight: 'bold' },
                    margin: { left: 14, right: 14 }
                });
                currentY = (doc as any).lastAutoTable.finalY + 8;
            }

            // 4. Observations
            if (service.global_setup?.general_observations) {
                doc.setFontSize(9);
                doc.setTextColor(100);
                doc.text('OBSERVACIONES GENERALES:', 14, currentY);
                currentY += 4;
                doc.setFontSize(7);
                doc.text(service.global_setup.general_observations, 14, currentY, { maxWidth: 180 });
            }
        });

        doc.save(`fichas_alumnos_${service.name.replace(/\s+/g, '_')}.pdf`);
    };

    const generateDraftOrder = () => {
        const activeEvent = events.find(e => e.type === 'Regular' && new Date(e.end_date) > new Date());
        if (!activeEvent) {
            alert("No hay un evento de pedido 'Regular' activo para asociar el borrador.");
            return;
        }

        const aggregatedIngredients = new Map<string, number>();
        service.menu.forEach(item => {
            const recipeIds = item.recipe_ids || (item.recipe_id ? [item.recipe_id] : []);
            recipeIds.forEach(rid => {
                const recipe = recipesMap.get(rid);
                recipe?.ingredients.forEach((ing: any) => {
                    aggregatedIngredients.set(ing.product_id, (aggregatedIngredients.get(ing.product_id) || 0) + ing.quantity);
                });
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

    const isLocked = useMemo(() => {
        const activeRoles = SERVICE_ROLES.filter(r => !(service.inactive_roles || []).includes(r));
        const completedRoles = service.completed_roles || [];
        return activeRoles.every(r => completedRoles.includes(r));
    }, [service.inactive_roles, service.completed_roles]);

    return (
        <div>
            <button onClick={onBack} className="text-sm text-primary-600 hover:underline mb-4">&larr; Volver a mis servicios</button>
            
            {/* Roles Status Bar */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-6">
                {SERVICE_ROLES.map(role => {
                    const isInactive = (service.inactive_roles || []).includes(role);
                    const isCompleted = (service.completed_roles || []).includes(role);
                    const teacherId = service.roles[role];
                    const teacher = teacherId ? usersMap.get(teacherId) : null;
                    const isMyRole = myRoles.includes(role);

                    return (
                        <div 
                            key={role}
                            className={`p-2 rounded-xl border-2 transition-all ${
                                isInactive 
                                    ? 'bg-gray-50 border-gray-100 opacity-50' 
                                    : isCompleted 
                                        ? 'bg-green-50 border-green-200' 
                                        : 'bg-white border-blue-100'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-[9px] font-black uppercase tracking-tighter text-gray-500">{role}</span>
                                {isFOH && (
                                    <button 
                                        onClick={() => toggleRoleInactivity(role)}
                                        className={`text-[8px] px-1 rounded font-bold ${isInactive ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'}`}
                                    >
                                        {isInactive ? 'Activar' : 'Omitir'}
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center">
                                <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isInactive ? 'bg-gray-300' : isCompleted ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-amber-400 animate-pulse'}`} />
                                <span className="text-[10px] font-bold text-gray-700 truncate">{teacher?.name || 'S/A'}</span>
                            </div>
                            {isMyRole && !isInactive && !isCompleted && (
                                <button 
                                    onClick={() => handleRoleSubmission(role)}
                                    className="w-full mt-2 py-1 bg-green-600 text-white text-[9px] font-black uppercase rounded shadow-sm hover:bg-green-700"
                                >
                                    Enviar Parte
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 gap-6">
                <div className="space-y-6">
                    <Card title="Menú del Servicio">
                        <div className="flex border-b mb-6 overflow-x-auto no-scrollbar">
                            <button 
                                onClick={() => setActiveTab('Global')}
                                className={`px-4 py-2 text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'Global' ? 'border-b-2 border-primary-600 text-primary-600 bg-primary-50/50' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                VISTA GLOBAL
                            </button>
                            {SERVICE_ROLES.filter(r => !(service.inactive_roles || []).includes(r)).map(role => {
                                const isAllowed = currentUser?.role === 'admin' || myRoles.includes(role);
                                return (
                                    <button 
                                    onClick={() => isAllowed && setActiveTab(role)}
                                    className={`px-4 py-2 text-xs font-bold transition-all whitespace-nowrap ${
                                        activeTab === role 
                                        ? 'border-b-2 border-amber-600 text-amber-600 bg-amber-50/50' 
                                        : isAllowed 
                                            ? 'text-gray-500 hover:text-gray-700' 
                                            : 'text-gray-300'
                                    }`}
                                >
                                        {role.toUpperCase()}
                                    </button>
                                );
                            })}
                        </div>
                            {activeTab === 'Global' && (currentUser?.profiles.includes(Profile.TEACHER) || currentUser?.role === 'admin') && (
                                <div className="mb-6 pb-6 border-b border-gray-100 dark:border-gray-700/50">
                                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Configuración General del Servicio</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div className="lg:col-span-2">
                                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Tipo de Servicio Global del Comedor</label>
                                            <input 
                                                type="text"
                                                value={service.global_setup?.service_type || ''}
                                                placeholder="Ej: Servicio a la Americana"
                                                onChange={(e) => {
                                                    const updatedService = { 
                                                        ...service, 
                                                        global_setup: { ...(service.global_setup || {}), service_type: e.target.value } 
                                                    };
                                                    setServices(services.map(s => s.id === service.id ? updatedService : s));
                                                }}
                                                className="w-full p-2 text-sm font-bold border rounded-lg dark:bg-gray-700"
                                            />
                                        </div>
                                        <div className="lg:col-span-2">
                                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Observaciones Generales para todo el equipo</label>
                                            <input 
                                                type="text"
                                                value={service.global_setup?.general_observations || ''}
                                                placeholder="Notas importantes para todo el equipo..."
                                                onChange={(e) => {
                                                    const updatedService = { 
                                                        ...service, 
                                                        global_setup: { ...(service.global_setup || {}), general_observations: e.target.value } 
                                                    };
                                                    setServices(services.map(s => s.id === service.id ? updatedService : s));
                                                }}
                                                className="w-full p-2 text-sm border rounded-lg dark:bg-gray-700"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                        {activeTab !== 'Global' && (
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex space-x-2">
                                    {!isRoleClosed(activeTab) && (
                                        <button 
                                            onClick={() => setAddStep('choice')} 
                                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-bold shadow-sm transition-colors flex items-center"
                                        >
                                            <PlusIcon className="w-4 h-4 mr-2" />
                                            Añadir Pase
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => handleToggleClosedRole(activeTab)} 
                                        className={`${isRoleClosed(activeTab) ? 'bg-green-600' : 'bg-gray-500'} text-white px-4 py-2 rounded-lg font-bold shadow-sm transition-colors flex items-center`}
                                    >
                                        {isRoleClosed(activeTab) ? 'Abrir Configuración' : 'Cerrar Sección'}
                                    </button>
                                </div>
                            </div>
                        )}
                        {isFOH && activeTab === 'Global' && service.menu.length > 0 && (
                            <div className="flex justify-start mb-4">
                                <button 
                                    onClick={handleDistribute}
                                    disabled={!isLocked}
                                    className={`${!isLocked ? 'bg-gray-300 cursor-not-allowed' : service.status === 'Confirmado' ? 'bg-gray-100 text-gray-600 border' : 'bg-green-600 text-white'} px-4 py-2 rounded-lg font-bold shadow-sm transition-colors flex items-center`}
                                >
                                    {!isLocked ? 'Puzzle Incompleto' : service.status === 'Confirmado' ? 'Re-Distribuir a Comedor' : 'Distribuir a Comedor'}
                                </button>
                            </div>
                        )}
                    </Card>
                    <div className="space-y-6">
                            {(activeTab === 'Global' ? SECTIONS : [activeTab]).map(sectionRole => {
                                const sectionItems = service.menu
                                    .filter(item => {
                                        if (item.role === sectionRole) return true;
                                        // Fallback mapping if role is missing
                                        if (!item.role) {
                                            if (sectionRole === 'Cocina' && item.work_area === 'Cocina') return true;
                                            if (sectionRole === 'Postres' && item.work_area === 'Pastelería') return true;
                                            if (sectionRole === 'Servicios (Sala)' && item.work_area === 'Servicios') return true;
                                            if (sectionRole === 'Pan del servicio' && item.work_area === 'Panadería') return true;
                                        }
                                        return false;
                                    })
                                    .sort((a, b) => (a.order_number || 0) - (b.order_number || 0));

                                if (sectionItems.length === 0 && activeTab === 'Global') return null;
                                if (sectionItems.length === 0 && activeTab !== 'Global') return null;

                                return (
                                    <div key={sectionRole} className="space-y-2">
                                        <div className="flex justify-between items-center bg-gray-100 dark:bg-gray-800 p-2 rounded-lg">
                                            <h3 className="text-xs font-black uppercase text-gray-600">{sectionRole}</h3>
                                            {(currentUser?.role === 'admin' || myRoles.includes(sectionRole)) && !isRoleClosed(sectionRole) && (
                                                <button 
                                                    onClick={() => { setAddStep('choice'); setActiveTab(sectionRole); }}
                                                    className="bg-primary-600 text-white text-[10px] font-bold px-2 py-1 rounded"
                                                >
                                                    + Añadir
                                                </button>
                                            )}
                                        </div>
                                        {sectionItems.map((item) => {
                                            const recipeIds = item.recipe_ids || (item.recipe_id ? [item.recipe_id] : []);
                                            const itemsRecipes = recipeIds.map(rid => recipesMap.get(rid)).filter((r): r is Recipe => !!r);
                                            const canEdit = currentUser?.role === 'admin' || (myRoles.includes(item.role));
                                            const isCollapsed = collapsedSections[item.id];
                                            const isSectionClosed = isRoleClosed(item.role);

                                            return (
                                                <div key={item.id} className="space-y-2 border-b dark:border-gray-700 pb-2">
                                                    <div className={`flex items-center p-2 bg-white dark:bg-gray-800 border rounded-lg shadow-sm group ${isCollapsed ? 'opacity-80' : ''}`}>
                                                        <button onClick={() => toggleCollapse(item.id)} className="mr-2 text-gray-400">
                                                            {isCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                                                        </button>
                                                        <span className="font-bold text-xs text-primary-600 mr-2">{item.order_number}</span>
                                                        <span className="font-bold text-sm text-gray-800 dark:text-white flex-1">{item.name}</span>
                                                        
                                                        {canEdit && !isSectionClosed && (
                                                            <button onClick={() => handleRemoveRecipe(item.id)} className="p-1 text-gray-400 hover:text-red-500">
                                                                <TrashIcon className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                    
                                                    {!isCollapsed && (
                                                        <div className="ml-8 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-xs space-y-2">
                                                            <div><span className="font-bold text-gray-500">Explicación:</span> {item.service_explanation || itemsRecipes[0]?.service_explanation || item.description || '-'}</div>
                                                            <div><span className="font-bold text-gray-500">Temp/Pase:</span> {item.temperature || itemsRecipes[0]?.temperature || '-'}</div>
                                                            <div><span className="font-bold text-gray-500">Marcaje:</span> {item.cutlery_required || itemsRecipes[0]?.cutlery_required || '-'}</div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        
                        {service.menu.length === 0 && (
                            <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                                <p className="text-gray-500 font-medium">Aún no se han añadido platos al menú.</p>
                                <p className="text-xs text-gray-400 mt-1 italic">Pulsa "Añadir Plato" para empezar.</p>
                            </div>
                        )}
                        </div>
                    <Card title="Documentación de Salida">
                        <div className="flex flex-wrap gap-2">
                            <button 
                                onClick={handleExportStudentSheets} 
                                disabled={!isLocked}
                                className={`py-2.5 px-6 rounded-xl flex items-center transition-all shadow-md font-bold text-sm ${!isLocked ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                            >
                                <PrinterIcon className="w-5 h-5 mr-2"/> Fichas para Alumnos (PDF)
                            </button>
                            <button 
                                onClick={generateAllergenDoc} 
                                disabled={!isLocked}
                                className={`py-2.5 px-6 rounded-xl flex items-center transition-all font-bold text-sm border ${!isLocked ? 'bg-gray-50 text-gray-400 cursor-not-allowed opacity-50' : 'bg-white hover:bg-gray-50 text-gray-700'}`}
                            >
                                <PrinterIcon className="w-5 h-5 mr-2"/> Informe de Alérgenos
                            </button>
                            <button 
                                onClick={generateServiceOrderDoc} 
                                disabled={!isLocked}
                                className={`py-2.5 px-6 rounded-xl flex items-center transition-all font-bold text-sm border ${!isLocked ? 'bg-gray-50 text-gray-400 cursor-not-allowed opacity-50' : 'bg-white hover:bg-gray-50 text-gray-700'}`}
                            >
                                <PrinterIcon className="w-5 h-5 mr-2"/> Orden de Servicio
                            </button>
                            {!isLocked && (
                                <div className="flex items-center text-[11px] text-amber-600 font-black bg-amber-50 px-4 py-2.5 rounded-xl border border-amber-200 animate-pulse">
                                    <AlertTriangle className="w-4 h-4 mr-2 shrink-0" />
                                    PUZZLE INCOMPLETO: Faltan áreas por confirmar su servicio.
                                </div>
                            )}
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
                    initialRole={activeTab !== 'Global' ? activeTab : (myRoles[0] || 'Cocina')}
                />
            )}
        </div>
    );
};

const ManualRecipeModal: React.FC<{ onSave: (recipe: Recipe, role: ServiceRole) => void, onClose: () => void, authorId: string, initialRole?: ServiceRole }> = ({ onSave, onClose, authorId, initialRole }) => {
    const [name, setName] = useState('');
    const [presentation, setPresentation] = useState('');
    const [temperature, setTemperature] = useState<'Caliente' | 'Frio' | 'Ambiente'>('Caliente');
    const [serviceTime, setServiceTime] = useState('');
    const [recommendedMarking, setRecommendedMarking] = useState('');
    const [serviceType, setServiceType] = useState('');
    const [clientDescription, setClientDescription] = useState('');
    const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
    const [category, setCategory] = useState('Entrante');
    const [isCustomCategory, setIsCustomCategory] = useState(false);
    const [assignedRole, setAssignedRole] = useState<ServiceRole>(initialRole || 'Cocina');

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
            category: category,
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

        onSave(newRecipe, assignedRole);
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="Editar Plato del Menú">
            <form onSubmit={handleSubmit} className="space-y-4 p-1">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Área de Producción</label>
                        <select 
                            value={assignedRole}
                            onChange={e => setAssignedRole(e.target.value as ServiceRole)}
                            className="w-full p-2 border rounded-lg dark:bg-gray-700 font-bold text-sm"
                        >
                            {SERVICE_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Orden en el Menú</label>
                        <input type="number" defaultValue={1} className="w-full p-2 border rounded-lg dark:bg-gray-700 font-bold text-sm" />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Categoría</label>
                        <div className="space-y-1">
                            <select 
                                value={isCustomCategory ? 'Otros' : category} 
                                onChange={e => {
                                    if (e.target.value === 'Otros') {
                                        setIsCustomCategory(true);
                                    } else {
                                        setIsCustomCategory(false);
                                        setCategory(e.target.value);
                                    }
                                }} 
                                className="w-full p-2 border rounded-lg dark:bg-gray-700 font-bold text-sm"
                            >
                                <option value="Aperitivo">Aperitivo</option>
                                <option value="Entrante">Entrante</option>
                                <option value="Pescado">Pescado</option>
                                <option value="Carne">Carne</option>
                                <option value="Postre">Postre</option>
                                <option value="Bebida">Bebida</option>
                                <option value="Otros">Personalizada / Otros...</option>
                            </select>
                            {(isCustomCategory || !['Aperitivo', 'Entrante', 'Pescado', 'Carne', 'Postre', 'Bebida'].includes(category)) && (
                                <input 
                                    type="text"
                                    value={category}
                                    onChange={e => setCategory(e.target.value)}
                                    placeholder="Nombre de la categoría..."
                                    className="w-full p-2 border rounded-lg dark:bg-gray-700 text-xs font-bold"
                                    autoFocus
                                />
                            )}
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Nombre del Plato / Pase</label>
                        <input 
                            type="text" 
                            required 
                            value={name} 
                            onChange={e => setName(e.target.value)} 
                            className="w-full p-2 border rounded-lg dark:bg-gray-700" 
                            placeholder="Introduce el nombre..."
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Temperatura</label>
                        <select 
                            value={temperature} 
                            onChange={e => setTemperature(e.target.value as any)} 
                            className="w-full p-2 border rounded-lg dark:bg-gray-700 text-sm font-bold"
                        >
                            <option value="Caliente">Caliente</option>
                            <option value="Frio">Frío</option>
                            <option value="Ambiente">Ambiente</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Temp / Pase</label>
                        <input 
                            type="text" 
                            value={serviceTime} 
                            onChange={e => setServiceTime(e.target.value)} 
                            className="w-full p-2 border rounded-lg dark:bg-gray-700 text-sm font-bold" 
                            placeholder="Ej: 65°C / 13:30"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Presentación / Vajilla</label>
                    <input 
                        type="text" 
                        value={presentation} 
                        onChange={e => setPresentation(e.target.value)} 
                        className="w-full p-2 border rounded-lg dark:bg-gray-700 text-sm font-bold" 
                        placeholder="Ej: Plato trinchero blanco"
                    />
                </div>

                <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Marcaje recomendado</label>
                    <input 
                        type="text" 
                        value={recommendedMarking} 
                        onChange={e => setRecommendedMarking(e.target.value)} 
                        className="w-full p-2 border rounded-lg dark:bg-gray-700 text-sm font-bold" 
                        placeholder="Ej: Cuchara sopera"
                    />
                </div>

                <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Tipo de Servicio</label>
                    <input 
                        type="text" 
                        value={serviceType} 
                        onChange={e => setServiceType(e.target.value)} 
                        className="w-full p-2 border rounded-lg dark:bg-gray-700 text-sm font-bold" 
                        placeholder="Ej: Emplatado"
                    />
                </div>

                <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Alérgenos (Separados por coma)</label>
                    <div className="space-y-2">
                        <input 
                            type="text" 
                            value={selectedAllergens.join(', ')} 
                            onChange={e => setSelectedAllergens(e.target.value.split(',').map(s => s.trim()).filter(s => !!s))}
                            className="w-full p-2 border rounded-lg dark:bg-gray-700 text-sm" 
                            placeholder="Gluten, Lácteos..."
                        />
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
                                        className={`flex items-center space-x-2 p-1.5 rounded-lg border transition-all ${
                                            isSelected 
                                                ? 'bg-white border-primary-500 shadow-sm' 
                                                : 'bg-gray-50 border-gray-100 opacity-40 grayscale-[0.5]'
                                        }`}
                                    >
                                        <div 
                                            className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                                            style={{ backgroundColor: isSelected ? color : '#e5e7eb' }}
                                        >
                                            <Icon className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-gray-400'}`} />
                                        </div>
                                        <span className="text-[9px] font-black uppercase tracking-tighter truncate">{allergen}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Comentarios / Explicación para Sala</label>
                    <textarea 
                        value={clientDescription} 
                        onChange={e => setClientDescription(e.target.value)} 
                        className="w-full p-2 border rounded-lg dark:bg-gray-700" 
                        rows={3}
                        placeholder="Explica el origen, ingredientes clave o forma de servicio..."
                    />
                </div>

                <div className="flex justify-end space-x-2 pt-4 border-t">
                    <button type="button" onClick={onClose} className="px-6 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors">Cancelar</button>
                    <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-md transform active:scale-95 transition-all text-sm uppercase tracking-widest">Guardar Plato</button>
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
    const [searchParams, setSearchParams] = useSearchParams();
    const selectedServiceId = searchParams.get('id');
    
    const setSelectedServiceId = (id: string | null) => {
        if (id) {
            setSearchParams({ id });
        } else {
            setSearchParams({});
        }
    };
    
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
        <div className="p-1 sm:p-6">
            <h1 className="text-3xl font-black text-gray-800 dark:text-gray-200 mb-6 uppercase tracking-tighter">Planificador de Servicios</h1>
            <Card title="Mis Próximos Servicios">
                <div className="space-y-3">
                    {myServices.map(service => (
                        <div key={service.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl flex justify-between items-center border border-gray-100 dark:border-gray-600">
                            <div>
                                <h3 className="font-black text-lg text-gray-800 dark:text-white uppercase tracking-tight">{service.name}</h3>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{new Date(service.date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            </div>
                            <button onClick={() => setSelectedServiceId(service.id)} className="bg-primary-600 hover:bg-primary-700 text-white py-2.5 px-6 rounded-xl font-bold shadow-md transition-all active:scale-95 text-sm">Gestionar Servicio</button>
                        </div>
                    ))}
                     {myServices.length === 0 && (
                        <p className="text-gray-500 text-center p-8 font-medium italic">No estás asignado a ningún servicio próximo.</p>
                     )}
                </div>
            </Card>
        </div>
    );
};