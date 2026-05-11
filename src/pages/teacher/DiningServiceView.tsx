import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/Card';
import { Modal } from '../../components/Modal';
import { 
    Users, Calendar, Download, AlertTriangle, ArrowRight, 
    CheckCircle, Clock, ChefHat, Edit2, Save, X, Plus, Trash2, 
    ChevronUp, ChevronDown, Info, ChevronRight, Printer as PrinterIcon
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { motion, AnimatePresence } from 'motion/react';
import 'jspdf-autotable';
import { useCompany } from '../../contexts/CompanyContext';
import { addHeaderToPdf } from '../../utils/export';
import { DiningService, DiningReservation, ServiceMenuItem, WorkArea } from '../../types';

const CATEGORIES_BY_AREA: Record<string, string[]> = {
    'Cocina': ['Aperitivo', 'Entrante', 'Pescado', 'Carne', 'Otros'],
    'Pastelería': ['Prepostre', 'Postre', 'Bombones', 'Pastas', 'Otros'],
    'Panadería': ['Pan del servicio', 'Otros'],
    'Servicios': ['Cóctel', 'Plato a la vista', 'Otros']
};

export const DiningServiceView: React.FC = () => {
    const { 
        dining_services, dining_reservations, services, service_groups, recipes,
        setDiningReservations, setServices 
    } = useData();
    const { currentUser } = useAuth();
    const { companyInfo } = useCompany();
    const [selectedServiceId, setSelectedServiceId] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'reservas' | 'menu'>('reservas');
    
    // Reservations Editing
    const [editingTableId, setEditingTableId] = useState<string | null>(null);
    const [tempTableNumber, setTempTableNumber] = useState<string>('');

    // Menu Editing
    const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
    const [editingMenuItem, setEditingMenuItem] = useState<Partial<ServiceMenuItem> | null>(null);

    const teacherServices = useMemo(() => {
        if (!currentUser) return [];

        const relevantPlanning = services.filter(ps => {
            const group = service_groups.find(g => g.id === ps.service_group_id);
            const isInGroup = group?.teacher_ids.includes(currentUser.id);
            const hasRole = Object.values(ps.roles).includes(currentUser.id);
            return isInGroup || hasRole;
        });

        const results: (DiningService & { planningName?: string, isPending?: boolean })[] = [];
        
        relevantPlanning.forEach(ps => {
            // Find linked dining service
            let ds = dining_services.find(d => d.service_id === ps.id);
            
            // Fallback: search by date if service_id is not set
            if (!ds) {
                const psDate = new Date(ps.date).toISOString().split('T')[0];
                ds = dining_services.find(d => 
                    (!d.service_id || d.service_id === ps.id) && 
                    new Date(d.date).toISOString().split('T')[0] === psDate
                );
            }

            if (ds) {
                results.push({ 
                    ...ds, 
                    planningName: ps.name, 
                    isPending: false,
                    // Ensure the service_id is conceptually linked for the view if it matched by date
                    service_id: ds.service_id || ps.id 
                });
            } else {
                results.push({
                    id: `placeholder-${ps.id}`,
                    service_id: ps.id,
                    date: ps.date,
                    max_capacity: 0,
                    current_pax: 0,
                    menu_price: 0,
                    status: 'borrador',
                    created_by: '',
                    created_at: ps.date,
                    planningName: ps.name,
                    isPending: true
                });
            }
        });

        return results.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [dining_services, services, service_groups, currentUser]);

    const activeServices = teacherServices;

    const selectedService = useMemo(() => {
        return activeServices.find(s => s.id === selectedServiceId);
    }, [activeServices, selectedServiceId]);

    const matchingPlanningService = useMemo(() => {
        if (!selectedService) return null;
        
        // Priority 1: Direct link via service_id
        if (selectedService.service_id) {
            const found = services.find(s => s.id === selectedService.service_id);
            if (found) return found;
        }

        // Priority 2: Fallback to date-based matching
        const dsDate = new Date(selectedService.date).toISOString().split('T')[0];
        return services.find(s => {
            const psDate = new Date(s.date).toISOString().split('T')[0];
            if (psDate !== dsDate) return false;

            // Ensure the teacher is actually involved in this planning service
            if (!currentUser) return false;
            const group = service_groups.find(g => g.id === s.service_group_id);
            const isInGroup = group?.teacher_ids.includes(currentUser.id);
            const hasRole = Object.values(s.roles).includes(currentUser.id);
            return isInGroup || hasRole;
        });
    }, [services, selectedService, service_groups, currentUser]);

    const serviceReservations = useMemo(() => {
        return dining_reservations.filter((r: DiningReservation) => r.service_id === selectedServiceId);
    }, [dining_reservations, selectedServiceId]);

    const allergenMatrix = useMemo(() => {
        const matrix: Record<string, number> = {};
        serviceReservations.forEach((res: DiningReservation) => {
            res.diners_allergens.forEach((diner: any) => {
                diner.allergens.forEach((allergen: string) => {
                    matrix[allergen] = (matrix[allergen] || 0) + 1;
                });
            });
        });
        return Object.entries(matrix).sort((a: [string, number], b: [string, number]) => b[1] - a[1]);
    }, [serviceReservations]);

    const reservationsWithAllergens = useMemo(() => {
        return serviceReservations.filter((r: DiningReservation) => r.diners_allergens.length > 0);
    }, [serviceReservations]);

    // Table Number Logic
    const handleStartEditTable = (res: DiningReservation) => {
        if (currentUser?.work_area !== 'Servicios') return;
        setEditingTableId(res.id);
        setTempTableNumber(res.table_number || '');
    };

    const handleSaveTable = (resId: string) => {
        setDiningReservations(prev => prev.map(r => 
            r.id === resId ? { ...r, table_number: tempTableNumber } : r
        ));
        setEditingTableId(null);
    };

    const myRoles = useMemo(() => {
        if (!currentUser || !matchingPlanningService) return [];
        return Object.entries(matchingPlanningService.roles)
            .filter(([_, uid]) => uid === currentUser.id)
            .map(([role]) => role as any);
    }, [matchingPlanningService?.roles, currentUser]);

    const navigate = useNavigate();

    // Menu Management Logic
    const handleAddMenuItem = () => {
        if (!matchingPlanningService) return;
        navigate(`/teacher/service-planner?id=${matchingPlanningService.id}`);
    };

    const handleSaveMenuItem = () => {
        if (!editingMenuItem || !matchingPlanningService || !selectedService?.service_id) return;
        
        const newItem = editingMenuItem as ServiceMenuItem;
        
        // Ensure item has a role for the planner to see it in Global view
        if (!newItem.role) {
            newItem.role = newItem.work_area === 'Cocina' ? 'Cocina' : 
                         newItem.work_area === 'Pastelería' ? 'Postres' :
                         newItem.work_area === 'Servicios' ? 'Servicios (Sala)' :
                         newItem.work_area === 'Panadería' ? 'Pan del servicio' : 'Cocina' as any;
        }

        const updatedMenu = [...(matchingPlanningService.menu || [])];
        const index = updatedMenu.findIndex(i => i.id === newItem.id);
        
        if (index >= 0) {
            updatedMenu[index] = newItem;
        } else {
            updatedMenu.push(newItem);
        }

        // Sort by order_number
        updatedMenu.sort((a, b) => a.order_number - b.order_number);

        setServices(prev => prev.map(s => 
            s.id === matchingPlanningService.id ? { ...s, menu: updatedMenu } : s
        ));
        
        setIsMenuModalOpen(false);
        setEditingMenuItem(null);
    };

    const handleDeleteMenuItem = (item: ServiceMenuItem) => {
        if (!matchingPlanningService) return;
        const canEdit = currentUser?.role === 'admin' || myRoles.includes(item.role) || (item.work_area === currentUser?.work_area);
        if (!canEdit) return;

        if (!confirm('¿Estás seguro de eliminar este plato del menú?')) return;

        setServices(prev => prev.map(s => 
            s.id === matchingPlanningService.id 
                ? { ...s, menu: s.menu.filter(i => i.id !== item.id) } 
                : s
        ));
    };

    const handleMoveMenuItem = (itemId: string, direction: 'up' | 'down') => {
        if (!matchingPlanningService) return;
        const menu = [...matchingPlanningService.menu];
        const index = menu.findIndex(i => i.id === itemId);
        if (index === -1) return;

        const item = menu[index];
        const canEdit = currentUser?.role === 'admin' || myRoles.includes(item.role) || (item.work_area === currentUser?.work_area);
        if (!canEdit) return;

        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= menu.length) return;

        // Swap order numbers
        const tempOrder = menu[index].order_number;
        menu[index].order_number = menu[targetIndex].order_number;
        menu[targetIndex].order_number = tempOrder;

        menu.sort((a, b) => a.order_number - b.order_number);

        setServices(prev => prev.map(s => 
            s.id === matchingPlanningService.id ? { ...s, menu } : s
        ));
    };

    const handleExportPDF = () => {
        if (!selectedService) return;

        const doc = new jsPDF();
        const dateStr = new Date(selectedService.date).toLocaleDateString();
        
        const startY = addHeaderToPdf(
            doc, 
            companyInfo, 
            'HOJA DE SERVICIO DE COMEDOR', 
            `Fecha: ${dateStr}\nAforo: ${selectedService.current_pax} / ${selectedService.max_capacity} pax\nEstado: ${selectedService.status.toUpperCase()}`
        );

        let currentY = startY + 10;

        // NEW: Bloque 0: Menú del Día
        if (matchingPlanningService?.menu && matchingPlanningService.menu.length > 0) {
            doc.setFontSize(14);
            doc.text('MENÚ DEL DÍA', 14, currentY);
            
            (doc as any).autoTable({
                startY: currentY + 5,
                head: [['Orden', 'Categoría', 'Plato', 'Alérgenos']],
                body: matchingPlanningService.menu.map(item => [
                    item.order_number.toString(),
                    item.category,
                    item.name,
                    item.allergens.join(', ') || 'Sin alérgenos'
                ]),
                theme: 'striped',
                headStyles: { fillColor: [37, 99, 235] },
                margin: { left: 14, right: 14 }
            });
            currentY = (doc as any).lastAutoTable.finalY + 15;
        }

        // Bloque 1: Matriz de Alérgenos
        if (allergenMatrix.length > 0) {
            if (currentY > 250) { doc.addPage(); currentY = 20; }
            doc.setFontSize(14);
            doc.text('Resumen de Alérgenos (Para Cocina)', 14, currentY);
            
            (doc as any).autoTable({
                startY: currentY + 5,
                head: [['Alérgeno', 'Cantidad Total']],
                body: allergenMatrix.map(([allergen, count]) => [allergen, count.toString()]),
                theme: 'grid',
                headStyles: { fillColor: [220, 38, 38] },
                margin: { left: 14, right: 14 }
            });
            currentY = (doc as any).lastAutoTable.finalY + 15;
        }

        // Bloque 2: Listado de Reservas
        if (currentY > 250) { doc.addPage(); currentY = 20; }
        doc.setFontSize(14);
        doc.text('Control de Reservas y Mesas', 14, currentY);
        
        (doc as any).autoTable({
            startY: currentY + 5,
            head: [['Mesa', 'Referencia', 'Cliente', 'Pax', 'Teléfono']],
            body: serviceReservations.map(res => [
                res.table_number || '-',
                res.reference_name,
                res.client_entity || '-',
                res.pax.toString(),
                res.phone_1
            ]),
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229] },
            margin: { left: 14, right: 14 }
        });
        currentY = (doc as any).lastAutoTable.finalY + 15;

        doc.save(`servicio_comedor_${selectedService.date.replace(/-/g, '')}.pdf`);
    };

    const handleExportStudentSheets = () => {
        if (!matchingPlanningService) return;

        const doc = new jsPDF();
        const dateStr = new Date(matchingPlanningService.date).toLocaleDateString();
        
        // Find reservations for this service to track allergens
        const serviceReservations = dining_reservations.filter(res => res.service_id === selectedServiceId);

        matchingPlanningService.menu.forEach((item, index) => {
            if (index > 0) doc.addPage();
            
            const startY = addHeaderToPdf(
                doc, 
                companyInfo, 
                'FICHA TÉCNICA DE SERVICIO (ALUMNOS)', 
                `Plato: ${item.name.toUpperCase()}\nCategoría: ${item.category}\nServicio: ${matchingPlanningService.name}\nProtocolo Global: ${matchingPlanningService.global_setup?.service_type || 'Estándar'}\nFecha: ${dateStr}`
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
            const itemRecipes = recipeIds.map(rid => recipes.find(r => r.id === rid)).filter((r): r is any => !!r);

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
            if (matchingPlanningService.global_setup?.general_observations) {
                doc.setFontSize(9);
                doc.setTextColor(100);
                doc.text('OBSERVACIONES GENERALES:', 14, currentY);
                currentY += 4;
                doc.setFontSize(7);
                doc.text(matchingPlanningService.global_setup.general_observations, 14, currentY, { maxWidth: 180 });
            }
        });

        doc.save(`fichas_alumnos_${matchingPlanningService.name.replace(/\s+/g, '_')}.pdf`);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Gestión de Servicio de Comedor</h1>
                {selectedService && (
                    <div className="flex space-x-2">
                        <button
                            onClick={handleExportStudentSheets}
                            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 shadow-sm transition-colors"
                            title="Imprimir fichas técnicas detalladas para alumnos"
                        >
                            <PrinterIcon className="w-5 h-5 mr-2" />
                            Imprimir Fichas (Alumnos)
                        </button>
                        <button
                            onClick={handleExportPDF}
                            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 shadow-sm transition-colors"
                        >
                            <Download className="w-5 h-5 mr-2" />
                            Exportar Hoja de Servicio
                        </button>
                    </div>
                )}
            </div>

            <div className="flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
                        <Calendar className="w-5 h-5 mr-2 text-primary-500" />
                        Próximos Servicios Asignados
                    </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {activeServices.map((ds) => {
                        const isActive = selectedServiceId === ds.id;
                        return (
                            <motion.div
                                key={ds.id}
                                whileHover={{ y: -4 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setSelectedServiceId(ds.id)}
                                className={`cursor-pointer rounded-xl border-2 transition-all duration-200 overflow-hidden relative group ${
                                    isActive 
                                        ? 'border-primary-500 bg-primary-50/30 dark:bg-primary-900/20 shadow-md ring-4 ring-primary-500/10' 
                                        : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 hover:border-primary-200 dark:hover:border-primary-800 hover:shadow-sm'
                                } ${ds.isPending ? 'opacity-75' : ''}`}
                            >
                                <div className={`h-1 w-full ${
                                    ds.isPending ? 'bg-amber-400' : 
                                    ds.status === 'abierto' ? 'bg-green-500' : 
                                    ds.status === 'cerrado' ? 'bg-blue-500' : 'bg-gray-300'
                                }`} />
                                <div className="p-2">
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none mb-0.5">
                                                {new Date(ds.date).toLocaleDateString('es-ES', { weekday: 'long' })}
                                            </span>
                                            <span className="text-sm font-bold text-gray-800 dark:text-white leading-tight">
                                                {new Date(ds.date).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className={`p-1 rounded-lg ${isActive ? 'bg-primary-500 text-white' : 'bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500'} transition-colors`}>
                                            <ChefHat className="w-3.5 h-3.5" />
                                        </div>
                                    </div>

                                    <h3 className="text-[10px] font-semibold text-gray-600 dark:text-gray-300 mb-2 line-clamp-1">
                                        {ds.planningName || 'Servicio de Comedor'}
                                    </h3>

                                    <div className="flex items-center justify-between text-[10px] mt-auto">
                                        <div className="flex items-center text-gray-500 dark:text-gray-400">
                                            <Users className={`w-3 h-3 mr-1 ${ds.current_pax >= ds.max_capacity ? 'text-red-500' : ''}`} />
                                            <span className="font-bold">{ds.current_pax}</span>
                                            <span className="opacity-50 mx-0.5">/</span>
                                            <span>{ds.max_capacity}</span>
                                        </div>
                                        
                                        <div className={`flex items-center font-black uppercase tracking-tighter text-[8px] ${
                                            ds.isPending ? 'text-amber-600' : 
                                            ds.status === 'abierto' ? 'text-green-600' : 'text-gray-500'
                                        }`}>
                                            {ds.isPending ? 'PENDIENTE' : ds.status.toUpperCase()}
                                        </div>
                                    </div>
                                </div>

                                {isActive && (
                                    <motion.div layoutId="active-indicator" className="absolute right-2 top-10">
                                        <div className="bg-primary-500 text-white p-1 rounded-full"><ArrowRight className="w-3 h-3" /></div>
                                    </motion.div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            <AnimatePresence mode="wait">
                {selectedService && (
                    <motion.div
                        key={selectedService.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-6"
                    >
                        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
                            <button
                                onClick={() => setActiveTab('reservas')}
                                className={`px-6 py-3 text-sm font-black uppercase tracking-widest border-b-2 transition-colors ${
                                    activeTab === 'reservas' 
                                        ? 'border-primary-500 text-primary-600 dark:text-primary-400' 
                                        : 'border-transparent text-gray-400 hover:text-gray-600'
                                }`}
                            >
                                Reservas y Comensales
                            </button>
                            <button
                                onClick={() => setActiveTab('menu')}
                                className={`px-6 py-3 text-sm font-black uppercase tracking-widest border-b-2 transition-colors ${
                                    activeTab === 'menu' 
                                        ? 'border-primary-500 text-primary-600 dark:text-primary-400' 
                                        : 'border-transparent text-gray-400 hover:text-gray-600'
                                }`}
                            >
                                Menú del Servicio
                            </button>
                        </div>

                        {activeTab === 'reservas' ? (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2 space-y-6">
                                    <Card 
                                        title="Gestión de Reservas" 
                                        subtitle="Asignación de mesas y control de alérgenos"
                                    >
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead className="text-[10px] text-gray-400 uppercase tracking-widest font-black border-b border-gray-100 dark:border-gray-800">
                                                    <tr>
                                                        <th className="px-4 py-4 w-20">Mesa</th>
                                                        <th className="px-4 py-4">Referencia / Cliente</th>
                                                        <th className="px-4 py-4 text-center">Pax</th>
                                                        <th className="px-4 py-4">Obs. Alérgenos</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                                                    {serviceReservations.map((res: DiningReservation) => (
                                                        <tr key={res.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                                            <td className="px-4 py-4">
                                                                {editingTableId === res.id ? (
                                                                    <div className="flex items-center space-x-1">
                                                                        <input 
                                                                            type="text"
                                                                            value={tempTableNumber}
                                                                            onChange={(e) => setTempTableNumber(e.target.value)}
                                                                            className="w-12 p-1 border rounded dark:bg-gray-700 font-bold text-center"
                                                                            autoFocus
                                                                        />
                                                                        <button onClick={() => handleSaveTable(res.id)} className="text-green-500"><Save className="w-4 h-4" /></button>
                                                                        <button onClick={() => setEditingTableId(null)} className="text-red-500"><X className="w-4 h-4" /></button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center space-x-2 group">
                                                                        <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full border-2 font-bold ${res.table_number ? 'border-primary-500 text-primary-600 bg-primary-50' : 'border-gray-200 text-gray-400 border-dashed'}`}>
                                                                            {res.table_number || '?'}
                                                                        </span>
                                                                        {currentUser?.work_area === 'Servicios' && (
                                                                            <button 
                                                                                onClick={() => handleStartEditTable(res)}
                                                                                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-primary-500 transition-opacity"
                                                                            >
                                                                                <Edit2 className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-4">
                                                                <div className="font-bold text-gray-900 dark:text-white">{res.reference_name}</div>
                                                                {res.client_entity && <div className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">{res.client_entity}</div>}
                                                            </td>
                                                            <td className="px-4 py-4 text-center">
                                                                <span className="font-bold">{res.pax}</span>
                                                            </td>
                                                            <td className="px-4 py-4">
                                                                {res.diners_allergens.length > 0 && (
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {Array.from(new Set(res.diners_allergens.flatMap(d => d.allergens))).map(a => (
                                                                            <span key={a} className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
                                                                                {a}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </Card>
                                </div>
                                <div className="lg:col-span-1">
                                    <Card title="Alérgenos Consolidados">
                                        {allergenMatrix.map(([a, count]) => (
                                            <div key={a} className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/10 rounded-lg mb-2">
                                                <span className="text-xs font-bold text-red-700 dark:text-red-300">{a}</span>
                                                <span className="bg-red-500 text-white text-xs font-black px-2 py-0.5 rounded-full">{count}</span>
                                            </div>
                                        ))}
                                    </Card>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center">
                                        <ChefHat className="w-5 h-5 mr-2 text-primary-500" />
                                        Menú y Fichas de Servicio
                                    </h3>
                                    <button 
                                        onClick={handleAddMenuItem}
                                        className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-primary-700"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Añadir Pase Manual
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 gap-6">
                                    {matchingPlanningService?.menu && matchingPlanningService.menu.length > 0 ? (
                                        matchingPlanningService.menu.map((item, idx) => {
                                            const recipeIds = item.recipe_ids || (item.recipe_id ? [item.recipe_id] : []);
                                            const itemRecipes = recipeIds.map(rid => recipes.find(r => r.id === rid)).filter((r): r is any => !!r);
                                            const firstRecipe = itemRecipes[0] || null;
                                            
                                                                            return (
                                                <motion.div 
                                                    key={item.id}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: idx * 0.05 }}
                                                    className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                                                >
                                                    <div className="p-4 flex items-start space-x-4">
                                                        <div className="flex flex-col items-center mr-4 pr-4 border-r dark:border-gray-700 min-w-[60px]">
                                                            <span className="text-[10px] font-black text-gray-400 uppercase leading-none mb-1">Orden</span>
                                                            <input 
                                                                type="number"
                                                                value={item.order_number || 0}
                                                                onChange={(e) => {
                                                                    const newVal = parseInt(e.target.value) || 0;
                                                                    const updatedMenu = matchingPlanningService.menu.map(m => m.id === item.id ? { ...m, order_number: newVal } : m);
                                                                    updatedMenu.sort((a, b) => a.order_number - b.order_number);
                                                                    setServices(prev => prev.map(s => s.id === matchingPlanningService.id ? { ...s, menu: updatedMenu } : s));
                                                                }}
                                                                className="w-12 text-center font-black text-primary-600 bg-transparent border-none focus:ring-0 p-0"
                                                            />
                                                            <div className="flex flex-col mt-2">
                                                                <button onClick={() => handleMoveMenuItem(item.id, 'up')} disabled={idx === 0} className="hover:text-primary-500 disabled:opacity-0"><ChevronUp className="w-4 h-4" /></button>
                                                                <button onClick={() => handleMoveMenuItem(item.id, 'down')} disabled={idx === matchingPlanningService.menu.length - 1} className="hover:text-primary-500 disabled:opacity-0"><ChevronDown className="w-4 h-4" /></button>
                                                            </div>
                                                        </div>

                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <div className="flex items-center space-x-2">
                                                                    <input 
                                                                        type="text"
                                                                        value={item.category || ''}
                                                                        placeholder="Categoría..."
                                                                        onChange={(e) => {
                                                                            const newVal = e.target.value;
                                                                            const updatedMenu = matchingPlanningService.menu.map(m => m.id === item.id ? { ...m, category: newVal } : m);
                                                                            setServices(prev => prev.map(s => s.id === matchingPlanningService.id ? { ...s, menu: updatedMenu } : s));
                                                                        }}
                                                                        className="text-[10px] font-black uppercase tracking-widest text-primary-600 bg-primary-50 dark:bg-primary-900/30 px-2 py-0.5 rounded border-none focus:ring-0 w-24 h-5"
                                                                    />
                                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800">
                                                                        {item.work_area}
                                                                    </span>
                                                                </div>
                                                                <div className="flex space-x-2">
                                                                    <button 
                                                                        onClick={() => { setEditingMenuItem(item); setIsMenuModalOpen(true); }}
                                                                        className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-colors"
                                                                        disabled={!(currentUser?.role === 'admin' || myRoles.includes(item.role) || item.work_area === currentUser?.work_area)}
                                                                    >
                                                                        <Edit2 className="w-4 h-4" />
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => handleDeleteMenuItem(item)}
                                                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                                        disabled={!(currentUser?.role === 'admin' || myRoles.includes(item.role) || item.work_area === currentUser?.work_area)}
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            <input 
                                                                type="text"
                                                                value={item.name}
                                                                onChange={(e) => {
                                                                    const newVal = e.target.value;
                                                                    const updatedMenu = matchingPlanningService.menu.map(m => m.id === item.id ? { ...m, name: newVal } : m);
                                                                    setServices(prev => prev.map(s => s.id === matchingPlanningService.id ? { ...s, menu: updatedMenu } : s));
                                                                }}
                                                                className="text-xl font-black text-gray-800 dark:text-white leading-tight uppercase tracking-tight bg-transparent border-none focus:ring-0 p-0 w-full"
                                                            />
                                                            
                                                            <div className="flex flex-wrap gap-1.5 mt-3">
                                                                {item.allergens.map(a => (
                                                                    <span key={a} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-red-50 text-red-600 border border-red-100">
                                                                        <AlertTriangle className="w-3 h-3 mr-1" />
                                                                        {a}
                                                                    </span>
                                                                ))}
                                                            </div>

                                                            {/* Technical Details for FOH */}
                                                            <div className="mt-6 pt-6 border-t border-gray-50 dark:border-gray-700/50">
                                                                {itemRecipes.length > 1 && (
                                                                     <div className="mb-4">
                                                                        <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Composiciones (Recetas)</h5>
                                                                        <div className="flex flex-wrap gap-2">
                                                                            {itemRecipes.map(r => (
                                                                                <span key={r.id} className="text-[10px] bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded-lg border border-gray-100 dark:border-gray-600 font-bold">
                                                                                    {r.name}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                     </div>
                                                                )}
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                                    <div className="space-y-4">
                                                                        <div>
                                                                            <h5 className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2 flex items-center">
                                                                                <Info className="w-3.5 h-3.5 mr-1.5" />
                                                                                Explicación para el Camarero
                                                                            </h5>
                                                                            <p className="text-sm text-gray-600 dark:text-gray-400 italic bg-amber-50/50 dark:bg-amber-900/10 p-3 rounded-xl border border-amber-100/50">
                                                                                {item.service_explanation || firstRecipe?.service_explanation || item.description || "Sin explicación específica registrada."}
                                                                            </p>
                                                                        </div>

                                                                        <div className="grid grid-cols-2 gap-4">
                                                                            <div>
                                                                                <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Temperatura</h5>
                                                                                <p className="text-sm font-bold text-gray-700 dark:text-gray-200">
                                                                                    {item.temperature || firstRecipe?.temperature || "No definida"}
                                                                                </p>
                                                                            </div>
                                                                            <div>
                                                                                <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Protocolo</h5>
                                                                                <p className="text-sm font-bold text-gray-700 dark:text-gray-200">
                                                                                    {item.service_type || firstRecipe?.service_type || "Estándar"}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <div className="space-y-4">
                                                                        <div>
                                                                            <h5 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">Marcaje / Cubertería</h5>
                                                                            <p className="text-sm font-bold text-gray-700 dark:text-gray-200 p-3 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-xl border border-indigo-100/50">
                                                                                {item.cutlery_required || firstRecipe?.cutlery_required || firstRecipe?.recommended_marking || "Cubertería estándar de mesa."}
                                                                            </p>
                                                                        </div>
                                                                        <div>
                                                                            <h5 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Instrucciones de Emplatado</h5>
                                                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                                                {item.presentation || firstRecipe?.presentation || "Servicio estándar según protocolo."}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })
                                    ) : (
                                        <div className="p-12 text-center bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center">
                                            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-700/50 rounded-full flex items-center justify-center mb-4">
                                                <ChefHat className="w-8 h-8 text-gray-300" />
                                            </div>
                                            <h4 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-2">Menú no configurado</h4>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6 italic">
                                                No hay platos asignados a este servicio. Puedes añadirlos manualmente uno a uno o usar el planificador central.
                                            </p>
                                            <div className="flex flex-col sm:flex-row gap-3">
                                                <button 
                                                    onClick={handleAddMenuItem}
                                                    className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-200 transition-colors"
                                                >
                                                    Añadir Pase Manual
                                                </button>
                                                <Link 
                                                    to="/teacher/service-planner" 
                                                    className="px-6 py-2.5 bg-primary-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary-700 transition-all shadow-lg shadow-primary-100 flex items-center justify-center"
                                                >
                                                    Ir al Planificador <ChevronRight className="w-3.5 h-3.5 ml-2" />
                                                </Link>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <Modal
                isOpen={isMenuModalOpen}
                onClose={() => setIsMenuModalOpen(false)}
                title={editingMenuItem?.id ? "Editar Plato del Menú" : "Nuevo Plato / Pase"}
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-black uppercase text-gray-400 mb-1">Área de Producción</label>
                            <select
                                className="w-full p-2 border rounded dark:bg-gray-700 text-sm font-bold"
                                value={editingMenuItem?.work_area}
                                onChange={(e) => {
                                    const newArea = e.target.value as WorkArea;
                                    const cats = CATEGORIES_BY_AREA[newArea] || ['Otros'];
                                    setEditingMenuItem(prev => ({ 
                                        ...prev!, 
                                        work_area: newArea,
                                        category: cats[0],
                                        is_custom: false
                                    }));
                                }}
                            >
                                {Object.keys(CATEGORIES_BY_AREA).map(area => (
                                    <option key={area} value={area}>{area}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-black uppercase text-gray-400 mb-1">Orden en el Menú</label>
                            <input
                                type="number"
                                className="w-full p-2 border rounded dark:bg-gray-700 text-sm font-bold"
                                value={editingMenuItem?.order_number || 0}
                                onChange={(e) => setEditingMenuItem(prev => ({ ...prev!, order_number: parseInt(e.target.value) || 0 }))}
                                min="1"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-black uppercase text-gray-400 mb-1">Categoría</label>
                        <div className="space-y-2">
                            <select
                                className="w-full p-2 border rounded dark:bg-gray-700 text-sm font-bold"
                                value={editingMenuItem?.category && editingMenuItem.work_area && CATEGORIES_BY_AREA[editingMenuItem.work_area].includes(editingMenuItem.category) ? editingMenuItem.category : 'Otros'}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setEditingMenuItem(prev => {
                                        const isCustom = val === 'Otros';
                                        return { 
                                            ...prev!, 
                                            category: isCustom ? prev?.category || '' : val, 
                                            is_custom: isCustom
                                        };
                                    });
                                }}
                            >
                                {editingMenuItem?.work_area && (CATEGORIES_BY_AREA[editingMenuItem.work_area] || []).map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                                <option value="Otros">Personalizada / Otros...</option>
                            </select>
                            {(editingMenuItem?.is_custom || (editingMenuItem?.category && editingMenuItem.work_area && !CATEGORIES_BY_AREA[editingMenuItem.work_area].includes(editingMenuItem.category))) && (
                                <input 
                                    type="text"
                                    placeholder="Nombre de la categoría personalizada..."
                                    className="w-full p-2 border rounded dark:bg-gray-700 text-xs font-bold"
                                    value={editingMenuItem.category || ''}
                                    onChange={(e) => setEditingMenuItem(prev => ({ ...prev!, category: e.target.value }))}
                                    autoFocus
                                />
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-black uppercase text-gray-400 mb-1">Nombre del Plato / Pase</label>
                        <div className="relative">
                            <input
                                type="text"
                                className="w-full p-3 border rounded-xl dark:bg-gray-700 text-base font-bold text-gray-800 dark:text-white pr-10"
                                value={editingMenuItem?.name}
                                onChange={(e) => setEditingMenuItem(prev => ({ ...prev!, name: e.target.value }))}
                                placeholder={editingMenuItem?.category === 'Pan del servicio' ? "Ej: Pan de Centeno y Trigo" : "Introduce el nombre..."}
                            />
                            {editingMenuItem?.is_custom && (
                                <div className="absolute right-3 top-3 text-[10px] font-black text-primary-500 uppercase">Custom</div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-black uppercase text-gray-400 mb-1">Alérgenos (Separados por coma)</label>
                        <input
                            type="text"
                            className="w-full p-2 border rounded dark:bg-gray-700 text-sm"
                            value={editingMenuItem?.allergens?.join(', ')}
                            onChange={(e) => setEditingMenuItem(prev => ({ ...prev!, allergens: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                            placeholder="Gluten, Lácteos..."
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-black uppercase text-gray-400 mb-1">Comentarios / Explicación para Sala</label>
                        <textarea
                            className="w-full p-2 border rounded dark:bg-gray-700 text-sm h-24"
                            value={editingMenuItem?.description}
                            onChange={(e) => setEditingMenuItem(prev => ({ ...prev!, description: e.target.value }))}
                            placeholder="Explica el origen, ingredientes clave o forma de servicio..."
                        />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <button onClick={() => setIsMenuModalOpen(false)} className="px-4 py-2 text-gray-500 font-bold">Cancelar</button>
                        <button 
                            onClick={handleSaveMenuItem} 
                            className="px-6 py-2 bg-primary-600 text-white rounded-lg font-black uppercase tracking-widest text-xs hover:bg-primary-700"
                            disabled={!editingMenuItem?.name}
                        >
                            Guardar Plato
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
