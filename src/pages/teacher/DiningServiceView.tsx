import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/Card';
import { Users, Calendar, Download, AlertTriangle, ArrowRight, CheckCircle, Clock, ChefHat } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { motion, AnimatePresence } from 'motion/react';
import 'jspdf-autotable';
import { useCompany } from '../../contexts/CompanyContext';
import { addHeaderToPdf } from '../../utils/export';
import { DiningService, DiningReservation } from '../../types';

export const DiningServiceView: React.FC = () => {
    const { dining_services, dining_reservations, services, service_groups } = useData();
    const { currentUser } = useAuth();
    const { companyInfo } = useCompany();
    const [selectedServiceId, setSelectedServiceId] = useState<string>('');

    const teacherServices = useMemo(() => {
        if (!currentUser) return [];

        // 1. Get relevant planning services
        const relevantPlanning = services.filter(ps => {
            const group = service_groups.find(g => g.id === ps.service_group_id);
            const isInGroup = group?.teacher_ids.includes(currentUser.id);
            const hasRole = Object.values(ps.roles).includes(currentUser.id);
            return isInGroup || hasRole;
        });

        // 2. Map to display objects (actual or placeholder)
        const results: (DiningService & { planningName?: string, isPending?: boolean })[] = [];
        
        relevantPlanning.forEach(ps => {
            const ds = dining_services.find(d => d.service_id === ps.id);
            if (ds) {
                results.push({ ...ds, planningName: ps.name, isPending: false });
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

        // Bloque 1: Matriz de Alérgenos
        if (allergenMatrix.length > 0) {
            doc.setFontSize(14);
            doc.text('Resumen de Alérgenos (Para Cocina)', 14, currentY);
            
            (doc as any).autoTable({
                startY: currentY + 5,
                head: [['Alérgeno', 'Cantidad Total']],
                body: allergenMatrix.map(([allergen, count]) => [allergen, count.toString()]),
                theme: 'grid',
                headStyles: { fillColor: [220, 38, 38] }, // Red header for allergens
                margin: { left: 14, right: 14 }
            });
            currentY = (doc as any).lastAutoTable.finalY + 15;
        }

        // Bloque 2: Listado de Reservas
        doc.setFontSize(14);
        doc.text('Listado de Reservas (Para Sala/Recepción)', 14, currentY);
        
        (doc as any).autoTable({
            startY: currentY + 5,
            head: [['Nombre', 'Cliente', 'Pax', 'Teléfono', 'Total']],
            body: serviceReservations.map(res => [
                res.reference_name,
                res.client_entity || '-',
                res.pax.toString(),
                res.phone_1,
                `${res.total_price.toFixed(2)} €`
            ]),
            theme: 'striped',
            headStyles: { fillColor: [37, 99, 235] }, // Blue header
            margin: { left: 14, right: 14 }
        });
        currentY = (doc as any).lastAutoTable.finalY + 15;

        // Bloque 3: Detalle de Intolerancias
        if (reservationsWithAllergens.length > 0) {
            // Check if we need a new page
            if (currentY > 250) {
                doc.addPage();
                currentY = 20;
            }

            doc.setFontSize(14);
            doc.text('Detalle de Intolerancias', 14, currentY);
            
            const allergenBody: string[][] = [];
            reservationsWithAllergens.forEach(res => {
                res.diners_allergens.forEach(diner => {
                    allergenBody.push([
                        res.reference_name,
                        diner.diner_name || 'Comensal sin nombre',
                        diner.allergens.join(', ')
                    ]);
                });
            });

            (doc as any).autoTable({
                startY: currentY + 5,
                head: [['Reserva', 'Comensal', 'Alérgenos']],
                body: allergenBody,
                theme: 'grid',
                headStyles: { fillColor: [245, 158, 11] }, // Yellow/Orange header
                margin: { left: 14, right: 14 }
            });
        }

        doc.save(`servicio_comedor_${selectedService.date.replace(/-/g, '')}.pdf`);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Vista de Servicio de Comedor</h1>
                {selectedService && (
                    <button
                        onClick={handleExportPDF}
                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                        <Download className="w-5 h-5 mr-2" />
                        Exportar PDF
                    </button>
                )}
            </div>

            <div className="flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
                        <Calendar className="w-5 h-5 mr-2 text-primary-500" />
                        Próximos Servicios
                    </h2>
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full uppercase tracking-wider">
                        {activeServices.length} Servicios Planificados
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {activeServices.map((ds) => {
                        const isActive = selectedServiceId === ds.id;
                        const isPast = new Date(ds.date) < new Date(new Date().setHours(0,0,0,0));
                        
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
                                <div className={`h-1.5 w-full ${
                                    ds.isPending ? 'bg-amber-400' : 
                                    ds.status === 'abierto' ? 'bg-green-500' : 
                                    ds.status === 'cerrado' ? 'bg-blue-500' : 'bg-gray-300'
                                }`} />
                                
                                <div className="p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none mb-1">
                                                {new Date(ds.date).toLocaleDateString('es-ES', { weekday: 'long' })}
                                            </span>
                                            <span className="text-lg font-bold text-gray-800 dark:text-white leading-tight">
                                                {new Date(ds.date).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className={`p-2 rounded-lg ${isActive ? 'bg-primary-500 text-white' : 'bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500'} transition-colors`}>
                                            <ChefHat className="w-5 h-5" />
                                        </div>
                                    </div>

                                    <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-4 line-clamp-1">
                                        {ds.planningName || 'Servicio de Comedor'}
                                    </h3>

                                    <div className="flex items-center justify-between text-xs mt-auto">
                                        <div className="flex items-center text-gray-500 dark:text-gray-400">
                                            <Users className={`w-3.5 h-3.5 mr-1 ${ds.current_pax >= ds.max_capacity ? 'text-red-500' : ''}`} />
                                            <span className="font-bold">{ds.current_pax}</span>
                                            <span className="opacity-50 mx-0.5">/</span>
                                            <span>{ds.max_capacity} pax</span>
                                        </div>
                                        
                                        <div className={`flex items-center font-black uppercase tracking-tighter text-[9px] ${
                                            ds.isPending ? 'text-amber-600' : 
                                            ds.status === 'abierto' ? 'text-green-600' : 'text-gray-500'
                                        }`}>
                                            {ds.isPending ? (
                                                <><Clock className="w-3 h-3 mr-1" /> Pendiente</>
                                            ) : ds.status === 'abierto' ? (
                                                <><CheckCircle className="w-3 h-3 mr-1" /> Activo</>
                                            ) : ds.status}
                                        </div>
                                    </div>
                                </div>

                                {isActive && (
                                    <motion.div 
                                        layoutId="active-indicator"
                                        className="absolute right-2 top-10"
                                    >
                                        <div className="bg-primary-500 text-white p-1 rounded-full">
                                            <ArrowRight className="w-3 h-3" />
                                        </div>
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
                        transition={{ duration: 0.3 }}
                        className="space-y-6"
                    >
                        <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${selectedService.isPending ? 'opacity-70' : ''}`}>
                            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border-2 border-primary-50 dark:border-primary-900/30 flex items-center shadow-sm">
                                <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-xl mr-4">
                                    <Users className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mb-1">Aforo Actual</p>
                                    <p className="text-2xl font-black text-gray-800 dark:text-white">
                                        {selectedService.isPending ? '0' : selectedService.current_pax} 
                                        <span className="text-base text-gray-400 font-normal ml-1">/ {selectedService.isPending ? '?' : selectedService.max_capacity}</span>
                                    </p>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border-2 border-primary-50 dark:border-primary-900/30 flex items-center shadow-sm">
                                <div className="p-3 bg-green-100 dark:bg-green-900/40 rounded-xl mr-4">
                                    <Calendar className="w-7 h-7 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mb-1">Estado</p>
                                    <p className="text-2xl font-black text-gray-800 dark:text-white capitalize">
                                        {selectedService.isPending ? 'Planificado' : selectedService.status}
                                    </p>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border-2 border-primary-50 dark:border-primary-900/30 flex items-center shadow-sm">
                                <div className="p-3 bg-orange-100 dark:bg-orange-900/40 rounded-xl mr-4">
                                    <AlertTriangle className="w-7 h-7 text-orange-600 dark:text-orange-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mb-1">Alertas Alérgenos</p>
                                    <p className="text-2xl font-black text-gray-800 dark:text-white">
                                        {allergenMatrix.length} <span className="text-sm text-gray-400 font-normal">Tipos</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {selectedService?.isPending && (
                            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-100 dark:border-amber-800 rounded-xl flex items-center text-amber-800 dark:text-amber-200 text-sm font-bold shadow-sm">
                                <Clock className="w-6 h-6 mr-3 text-amber-500 animate-pulse" />
                                <div>
                                    <p>Este servicio está planificado pero no ha sido activado para reservas todavía.</p>
                                    <p className="text-xs font-normal opacity-70 mt-0.5">Se activará automáticamente al llegar la fecha o mediante gestión manual.</p>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-6">
                                <Card 
                                    title="Listado de Reservas" 
                                    subtitle={`Mostrando ${serviceReservations.length} reservas registradas`}
                                >
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-[10px] text-gray-400 uppercase tracking-widest font-black border-b border-gray-100 dark:border-gray-800">
                                                <tr>
                                                    <th className="px-4 py-4">Referencia / Cliente</th>
                                                    <th className="px-4 py-4 text-center">Pax</th>
                                                    <th className="px-4 py-4">Teléfono</th>
                                                    <th className="px-4 py-4">Alérgenos / Observaciones</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                                                {serviceReservations.map((res: DiningReservation) => (
                                                    <tr key={res.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                                        <td className="px-4 py-4">
                                                            <div className="font-bold text-gray-900 dark:text-white leading-tight">
                                                                {res.reference_name}
                                                            </div>
                                                            {res.client_entity && <div className="text-[10px] text-gray-400 uppercase font-bold mt-0.5 tracking-tighter">{res.client_entity}</div>}
                                                        </td>
                                                        <td className="px-4 py-4 text-center">
                                                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 font-bold text-gray-800 dark:text-gray-200">
                                                                {res.pax}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-4 font-mono text-xs text-gray-500">
                                                            {res.phone_1}
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            {res.diners_allergens.length > 0 ? (
                                                                <div className="space-y-1.5">
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {Array.from(new Set(res.diners_allergens.flatMap(d => d.allergens))).map(a => (
                                                                            <span key={a} className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 border border-red-200 dark:border-red-800">
                                                                                {a}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                    <div className="text-[10px] text-gray-500 italic leading-tight">
                                                                        {res.diners_allergens.map(d => `${d.diner_name || 'Comensal'}: ${d.allergens.join(', ')}`).join(' • ')}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <span className="text-gray-300 text-xs">Sin alérgenos</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {serviceReservations.length === 0 && (
                                                    <tr>
                                                        <td colSpan={4} className="px-4 py-12 text-center text-gray-400 italic">
                                                            <Users className="w-10 h-10 mx-auto opacity-20 mb-2" />
                                                            No hay reservas para este servicio.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            </div>

                            <div className="lg:col-span-1 space-y-6">
                                <Card 
                                    title="Matriz de Alérgenos" 
                                    subtitle="Consolidado para Cocina"
                                    className="border-2 border-red-50 dark:border-red-900/20 shadow-lg shadow-red-500/5"
                                >
                                    {allergenMatrix.length > 0 ? (
                                        <div className="space-y-2">
                                            {allergenMatrix.map(([allergen, count]) => (
                                                <div key={allergen} className="flex justify-between items-center p-4 bg-red-50/50 dark:bg-red-900/10 rounded-xl border border-red-100/50 dark:border-red-800/30 group hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors">
                                                    <span className="font-bold text-sm text-red-800 dark:text-red-200 uppercase tracking-tighter flex items-center">
                                                        <AlertTriangle className="w-4 h-4 mr-2 text-red-500" />
                                                        {allergen}
                                                    </span>
                                                    <span className="bg-red-500 text-white min-w-[28px] h-7 flex items-center justify-center rounded-full font-black text-sm shadow-md shadow-red-500/20">
                                                        {count}
                                                    </span>
                                                </div>
                                            ))}
                                            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-[10px] text-gray-500 leading-tight">
                                                * Estas cantidades corresponden al total de raciones específicas a preparar según las fichas de reserva.
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-12 text-gray-400">
                                            <CheckCircle className="w-12 h-12 mx-auto text-gray-200 mb-3" />
                                            <p className="font-medium">Servicio Libre de Alérgenos</p>
                                            <p className="text-xs opacity-70">No se han registrado intolerancias dietéticas.</p>
                                        </div>
                                    )}
                                </Card>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
