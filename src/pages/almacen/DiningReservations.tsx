import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/Card';
import { Modal } from '../../components/Modal';
import { Plus, Users, Calendar, Phone, AlertTriangle, Trash2 } from 'lucide-react';
import { DiningReservation, DinerAllergen, DiningService } from '../../types';
import { doc, collection, runTransaction } from 'firebase/firestore';
import { db } from '../../firebase';
import { AllergenSelector } from '../teacher/RecipeForm';

export const DiningReservations: React.FC = () => {
    const { dining_services, dining_reservations } = useData();
    const { currentUser } = useAuth();
    
    const [selectedServiceId, setSelectedServiceId] = useState<string>('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const activeServices = useMemo(() => {
        return dining_services.filter((s: DiningService) => s.status === 'abierto');
    }, [dining_services]);

    const selectedService = useMemo(() => {
        return dining_services.find((s: DiningService) => s.id === selectedServiceId);
    }, [dining_services, selectedServiceId]);

    const serviceReservations = useMemo(() => {
        return dining_reservations.filter((r: DiningReservation) => r.service_id === selectedServiceId);
    }, [dining_reservations, selectedServiceId]);

    const [formData, setFormData] = useState({
        reference_name: '',
        client_entity: '',
        pax: 1,
        phone_1: '',
        phone_2: '',
        diners_allergens: [] as DinerAllergen[]
    });

    const handleOpenModal = () => {
        setFormData({
            reference_name: '',
            client_entity: '',
            pax: 1,
            phone_1: '',
            phone_2: '',
            diners_allergens: []
        });
        setError(null);
        setIsModalOpen(true);
    };

    const handleAddDinerAllergen = () => {
        setFormData(prev => ({
            ...prev,
            diners_allergens: [...prev.diners_allergens, { diner_name: '', allergens: [] }]
        }));
    };

    const handleUpdateDinerAllergen = (index: number, field: keyof DinerAllergen, value: any) => {
        setFormData(prev => {
            const newAllergens = [...prev.diners_allergens];
            newAllergens[index] = { ...newAllergens[index], [field]: value };
            return { ...prev, diners_allergens: newAllergens };
        });
    };

    const handleRemoveDinerAllergen = (index: number) => {
        setFormData(prev => ({
            ...prev,
            diners_allergens: prev.diners_allergens.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || !selectedService) return;
        setError(null);

        try {
            const newReservationRef = doc(collection(db, 'dining_reservations'));
            const serviceRef = doc(db, 'dining_services', selectedService.id);

            await runTransaction(db, async (transaction) => {
                const serviceDoc = await transaction.get(serviceRef);
                if (!serviceDoc.exists()) throw new Error("Servicio no encontrado");

                const currentPax = serviceDoc.data().current_pax;
                const maxCapacity = serviceDoc.data().max_capacity;
                const newPax = currentPax + formData.pax;

                if (newPax > maxCapacity) {
                    throw new Error(`Aforo superado. Plazas disponibles: ${maxCapacity - currentPax}`);
                }

                const reservationData: DiningReservation = {
                    id: newReservationRef.id,
                    service_id: selectedService.id,
                    reference_name: formData.reference_name,
                    client_entity: formData.client_entity,
                    pax: formData.pax,
                    phone_1: formData.phone_1,
                    phone_2: formData.phone_2,
                    total_price: formData.pax * selectedService.menu_price,
                    diners_allergens: formData.diners_allergens.filter(d => d.allergens.length > 0),
                    created_by: currentUser.id,
                    created_at: new Date().toISOString()
                };

                transaction.set(newReservationRef, reservationData);
                transaction.update(serviceRef, { current_pax: newPax });
            });

            setIsModalOpen(false);
        } catch (err: any) {
            console.error("Error creating reservation:", err);
            setError(err.message || "Error al crear la reserva.");
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Reservas de Comedor</h1>

            <Card>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Seleccionar Servicio Abierto</label>
                    <select
                        value={selectedServiceId}
                        onChange={e => setSelectedServiceId(e.target.value)}
                        className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                        <option value="">-- Seleccione un servicio --</option>
                        {activeServices.map((service: DiningService) => (
                            <option key={service.id} value={service.id}>
                                {new Date(service.date).toLocaleDateString()} - Aforo: {service.current_pax}/{service.max_capacity}
                            </option>
                        ))}
                    </select>
                </div>

                {selectedService && (
                    <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                        <div className="flex items-center space-x-6">
                            <div className="flex items-center text-blue-800 dark:text-blue-200">
                                <Users className="w-5 h-5 mr-2" />
                                <span className="font-bold text-lg">{selectedService.current_pax} / {selectedService.max_capacity} pax</span>
                            </div>
                            <div className="text-blue-800 dark:text-blue-200">
                                Precio Menú: <span className="font-bold">{selectedService.menu_price.toFixed(2)} €</span>
                            </div>
                        </div>
                        <button
                            onClick={handleOpenModal}
                            disabled={selectedService.current_pax >= selectedService.max_capacity}
                            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Plus className="w-5 h-5 mr-2" />
                            Nueva Reserva
                        </button>
                    </div>
                )}
            </Card>

            {selectedService && (
                <Card title="Listado de Reservas">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                <tr>
                                    <th className="px-4 py-3">Referencia</th>
                                    <th className="px-4 py-3">Cliente/Entidad</th>
                                    <th className="px-4 py-3 text-center">Pax</th>
                                    <th className="px-4 py-3">Teléfono</th>
                                    <th className="px-4 py-3 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {serviceReservations.map((res: DiningReservation) => (
                                    <tr key={res.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{res.reference_name}</td>
                                        <td className="px-4 py-3">{res.client_entity}</td>
                                        <td className="px-4 py-3 text-center font-bold">{res.pax}</td>
                                        <td className="px-4 py-3">{res.phone_1}</td>
                                        <td className="px-4 py-3 text-right font-bold text-primary-600">{res.total_price.toFixed(2)} €</td>
                                    </tr>
                                ))}
                                {serviceReservations.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                            No hay reservas para este servicio.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nueva Reserva de Comedor" size="lg">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="p-3 bg-red-100 text-red-800 rounded-md text-sm flex items-center">
                            <AlertTriangle className="w-5 h-5 mr-2" />
                            {error}
                        </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre/Referencia *</label>
                            <input
                                type="text"
                                required
                                value={formData.reference_name}
                                onChange={e => setFormData({ ...formData, reference_name: e.target.value })}
                                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cliente/Entidad</label>
                            <input
                                type="text"
                                value={formData.client_entity}
                                onChange={e => setFormData({ ...formData, client_entity: e.target.value })}
                                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nº Comensales (Pax) *</label>
                            <input
                                type="number"
                                required
                                min={1}
                                max={selectedService ? selectedService.max_capacity - selectedService.current_pax : 1}
                                value={formData.pax}
                                onChange={e => setFormData({ ...formData, pax: parseInt(e.target.value) })}
                                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total Calculado</label>
                            <div className="w-full p-2 bg-gray-100 dark:bg-gray-800 border rounded-md font-bold text-primary-600">
                                {(formData.pax * (selectedService?.menu_price || 0)).toFixed(2)} €
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Teléfono 1 *</label>
                            <input
                                type="tel"
                                required
                                value={formData.phone_1}
                                onChange={e => setFormData({ ...formData, phone_1: e.target.value })}
                                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Teléfono 2</label>
                            <input
                                type="tel"
                                value={formData.phone_2}
                                onChange={e => setFormData({ ...formData, phone_2: e.target.value })}
                                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>
                    </div>

                    <div className="border-t pt-4 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium text-gray-800 dark:text-white">Detalle de Alérgenos</h3>
                            <button
                                type="button"
                                onClick={handleAddDinerAllergen}
                                className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
                            >
                                <Plus className="w-4 h-4 mr-1" />
                                Añadir comensal con intolerancias
                            </button>
                        </div>

                        <div className="space-y-4">
                            {formData.diners_allergens.map((diner, index) => (
                                <div key={index} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 relative">
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveDinerAllergen(index)}
                                        className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <div className="mb-3">
                                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Nombre del comensal (Opcional)</label>
                                        <input
                                            type="text"
                                            value={diner.diner_name}
                                            onChange={e => handleUpdateDinerAllergen(index, 'diner_name', e.target.value)}
                                            className="w-full p-2 text-sm border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            placeholder="Ej: Juan Pérez"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Alérgenos *</label>
                                        <AllergenSelector 
                                            selected={diner.allergens} 
                                            onChange={(allergens) => handleUpdateDinerAllergen(index, 'allergens', allergens)} 
                                        />
                                    </div>
                                </div>
                            ))}
                            {formData.diners_allergens.length === 0 && (
                                <p className="text-sm text-gray-500 italic">No se han registrado intolerancias para esta reserva.</p>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t dark:border-gray-700">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                        >
                            Guardar Reserva
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
