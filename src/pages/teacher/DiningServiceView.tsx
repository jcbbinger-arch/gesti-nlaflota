import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../../components/Card';
import { Users, Calendar, Download, AlertTriangle } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { useCompany } from '../../contexts/CompanyContext';
import { DiningService, DiningReservation } from '../../types';

export const DiningServiceView: React.FC = () => {
    const { dining_services, dining_reservations } = useData();
    const { companyInfo } = useCompany();
    const [selectedServiceId, setSelectedServiceId] = useState<string>('');

    const activeServices = useMemo(() => {
        return dining_services.filter((s: DiningService) => s.status !== 'borrador');
    }, [dining_services]);

    const selectedService = useMemo(() => {
        return dining_services.find((s: DiningService) => s.id === selectedServiceId);
    }, [dining_services, selectedServiceId]);

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
        
        // Header
        doc.setFontSize(20);
        doc.text('Hoja de Servicio de Comedor', 14, 22);
        
        doc.setFontSize(12);
        doc.text(`Centro: ${companyInfo.name}`, 14, 32);
        doc.text(`Fecha: ${dateStr}`, 14, 38);
        doc.text(`Aforo: ${selectedService.current_pax} / ${selectedService.max_capacity} pax`, 14, 44);
        doc.text(`Estado: ${selectedService.status.toUpperCase()}`, 14, 50);

        let startY = 60;

        // Bloque 1: Matriz de Alérgenos
        if (allergenMatrix.length > 0) {
            doc.setFontSize(14);
            doc.text('Resumen de Alérgenos (Para Cocina)', 14, startY);
            
            (doc as any).autoTable({
                startY: startY + 5,
                head: [['Alérgeno', 'Cantidad Total']],
                body: allergenMatrix.map(([allergen, count]) => [allergen, count.toString()]),
                theme: 'grid',
                headStyles: { fillColor: [220, 38, 38] }, // Red header for allergens
                margin: { left: 14, right: 14 }
            });
            startY = (doc as any).lastAutoTable.finalY + 15;
        }

        // Bloque 2: Listado de Reservas
        doc.setFontSize(14);
        doc.text('Listado de Reservas (Para Sala/Recepción)', 14, startY);
        
        (doc as any).autoTable({
            startY: startY + 5,
            head: [['Ref/Nombre', 'Cliente', 'Pax', 'Teléfono', 'Total']],
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
        startY = (doc as any).lastAutoTable.finalY + 15;

        // Bloque 3: Detalle de Intolerancias por Mesa
        if (reservationsWithAllergens.length > 0) {
            // Check if we need a new page
            if (startY > 250) {
                doc.addPage();
                startY = 20;
            }

            doc.setFontSize(14);
            doc.text('Detalle de Intolerancias por Mesa', 14, startY);
            
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
                startY: startY + 5,
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

            <Card>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Seleccionar Servicio</label>
                    <select
                        value={selectedServiceId}
                        onChange={e => setSelectedServiceId(e.target.value)}
                        className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                        <option value="">-- Seleccione un servicio --</option>
                        {activeServices.map((service: DiningService) => (
                            <option key={service.id} value={service.id}>
                                {new Date(service.date).toLocaleDateString()} - Estado: {service.status.toUpperCase()}
                            </option>
                        ))}
                    </select>
                </div>

                {selectedService && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800 flex items-center">
                            <Users className="w-8 h-8 text-blue-600 dark:text-blue-400 mr-3" />
                            <div>
                                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Aforo Actual</p>
                                <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                                    {selectedService.current_pax} <span className="text-lg text-blue-600/70">/ {selectedService.max_capacity}</span>
                                </p>
                            </div>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-100 dark:border-green-800 flex items-center">
                            <Calendar className="w-8 h-8 text-green-600 dark:text-green-400 mr-3" />
                            <div>
                                <p className="text-sm text-green-600 dark:text-green-400 font-medium">Estado</p>
                                <p className="text-2xl font-bold text-green-800 dark:text-blue-200 capitalize">
                                    {selectedService.status}
                                </p>
                            </div>
                        </div>
                        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-100 dark:border-orange-800 flex items-center">
                            <AlertTriangle className="w-8 h-8 text-orange-600 dark:text-orange-400 mr-3" />
                            <div>
                                <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">Alertas Alérgenos</p>
                                <p className="text-2xl font-bold text-orange-800 dark:text-blue-200">
                                    {allergenMatrix.length} tipos
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            {selectedService && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <Card title="Listado de Reservas">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                        <tr>
                                            <th className="px-4 py-3">Referencia</th>
                                            <th className="px-4 py-3 text-center">Pax</th>
                                            <th className="px-4 py-3">Teléfono</th>
                                            <th className="px-4 py-3">Alérgenos</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {serviceReservations.map((res: DiningReservation) => (
                                            <tr key={res.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                                    {res.reference_name}
                                                    {res.client_entity && <div className="text-xs text-gray-500">{res.client_entity}</div>}
                                                </td>
                                                <td className="px-4 py-3 text-center font-bold">{res.pax}</td>
                                                <td className="px-4 py-3">{res.phone_1}</td>
                                                <td className="px-4 py-3">
                                                    {res.diners_allergens.length > 0 ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                                            Sí ({res.diners_allergens.length} pax)
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {serviceReservations.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
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
                        <Card title="Matriz de Alérgenos (Cocina)">
                            {allergenMatrix.length > 0 ? (
                                <div className="space-y-3">
                                    {allergenMatrix.map(([allergen, count]) => (
                                        <div key={allergen} className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800">
                                            <span className="font-medium text-red-800 dark:text-red-200">{allergen}</span>
                                            <span className="bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-100 py-1 px-3 rounded-full font-bold text-sm">
                                                {count}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <AlertTriangle className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                    <p>No hay alérgenos registrados para este servicio.</p>
                                </div>
                            )}
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
};
