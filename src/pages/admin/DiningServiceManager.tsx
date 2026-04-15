import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/Card';
import { Modal } from '../../components/Modal';
import { ConfirmModal } from '../../components/ConfirmModal';
import { Plus, Edit, Trash2, Users, Calendar, DollarSign, Settings } from 'lucide-react';
import { DiningService, DiningServiceStatus } from '../../types';
import { doc, setDoc, deleteDoc, collection } from 'firebase/firestore';
import { db } from '../../firebase';

export const DiningServiceManager: React.FC = () => {
    const { dining_services, services } = useData();
    const { currentUser } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<DiningService | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        service_id: '',
        date: '',
        max_capacity: 40,
        menu_price: 0,
        status: 'borrador' as DiningServiceStatus
    });

    const handleOpenModal = (service?: DiningService) => {
        if (service) {
            setEditingService(service);
            setFormData({
                service_id: service.service_id || '',
                date: service.date,
                max_capacity: service.max_capacity,
                menu_price: service.menu_price,
                status: service.status
            });
        } else {
            setEditingService(null);
            setFormData({
                service_id: '',
                date: new Date().toISOString().split('T')[0],
                max_capacity: 40,
                menu_price: 15,
                status: 'borrador'
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;

        try {
            const serviceId = editingService?.id || doc(collection(db, 'dining_services')).id;
            const newService: DiningService = {
                id: serviceId,
                service_id: formData.service_id || undefined,
                date: formData.date,
                max_capacity: formData.max_capacity,
                current_pax: editingService ? editingService.current_pax : 0,
                menu_price: formData.menu_price,
                status: formData.status,
                created_by: editingService ? editingService.created_by : currentUser.id,
                created_at: editingService ? editingService.created_at : new Date().toISOString()
            };

            await setDoc(doc(db, 'dining_services', serviceId), newService);
            setIsModalOpen(false);
        } catch (err) {
            console.error("Error saving dining service:", err);
            setError("Error al guardar el servicio.");
        }
    };

    const handleServiceSelect = (id: string) => {
        const selectedSvc = services.find(s => s.id === id);
        if (selectedSvc) {
            setFormData({
                ...formData,
                service_id: id,
                date: new Date(selectedSvc.date).toISOString().split('T')[0]
            });
        } else {
            setFormData({ ...formData, service_id: '' });
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'dining_services', id));
            setConfirmDeleteId(null);
        } catch (err) {
            console.error("Error deleting dining service:", err);
            setError("Error al eliminar el servicio.");
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'borrador': return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-bold">Borrador</span>;
            case 'abierto': return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">Abierto</span>;
            case 'cerrado': return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold">Cerrado</span>;
            default: return null;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Gestión de Servicios de Comedor</h1>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Nuevo Servicio
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded relative">
                    {error}
                    <button onClick={() => setError(null)} className="absolute top-2 right-2 p-2">×</button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {dining_services.sort((a: DiningService, b: DiningService) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((service: DiningService) => {
                    const linkedService = services.find(s => s.id === service.service_id);
                    return (
                        <Card key={service.id} className="relative">
                            <div className="absolute top-4 right-4">
                                {getStatusBadge(service.status)}
                            </div>
                            <div className="flex items-center mb-4">
                                <Calendar className="w-6 h-6 text-primary-500 mr-2" />
                                <div>
                                    <h3 className="text-xl font-bold">{new Date(service.date).toLocaleDateString()}</h3>
                                    {linkedService && (
                                        <p className="text-xs text-gray-500 font-medium">Ref: {linkedService.name}</p>
                                    )}
                                </div>
                            </div>
                        <div className="space-y-2 mb-6">
                            <div className="flex items-center text-gray-600 dark:text-gray-300">
                                <Users className="w-4 h-4 mr-2" />
                                <span>Aforo: {service.current_pax} / {service.max_capacity} pax</span>
                            </div>
                            <div className="flex items-center text-gray-600 dark:text-gray-300">
                                <DollarSign className="w-4 h-4 mr-2" />
                                <span>Precio Menú: {service.menu_price.toFixed(2)} €</span>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-2 border-t pt-4 dark:border-gray-700">
                            <button
                                onClick={() => handleOpenModal(service)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-md"
                                title="Editar"
                            >
                                <Edit className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setConfirmDeleteId(service.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                                title="Eliminar"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    </Card>
                );
            })}
                {dining_services.length === 0 && (
                    <div className="col-span-full text-center py-12 text-gray-500">
                        No hay servicios de comedor configurados.
                    </div>
                )}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingService ? 'Editar Servicio' : 'Nuevo Servicio'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Servicio de Referencia (Planificación)</label>
                        <select
                            value={formData.service_id}
                            onChange={e => handleServiceSelect(e.target.value)}
                            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            <option value="">-- Seleccionar Servicio Planificado --</option>
                            {services.map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({new Date(s.date).toLocaleDateString()})</option>
                            ))}
                        </select>
                        <p className="text-[10px] text-gray-500 mt-1">Selecciona un servicio creado en "Planificación de Servicios" para vincularlo.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha del Servicio</label>
                        <input
                            type="date"
                            required
                            value={formData.date}
                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Aforo Máximo (Pax)</label>
                            <input
                                type="number"
                                required
                                min={1}
                                value={formData.max_capacity}
                                onChange={e => setFormData({ ...formData, max_capacity: parseInt(e.target.value) })}
                                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Precio Menú (€)</label>
                            <input
                                type="number"
                                required
                                min={0}
                                step="0.01"
                                value={formData.menu_price}
                                onChange={e => setFormData({ ...formData, menu_price: parseFloat(e.target.value) })}
                                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estado</label>
                        <select
                            value={formData.status}
                            onChange={e => setFormData({ ...formData, status: e.target.value as DiningServiceStatus })}
                            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            <option value="borrador">Borrador (Oculto/Configuración)</option>
                            <option value="abierto">Abierto (Admite reservas)</option>
                            <option value="cerrado">Cerrado (Solo lectura)</option>
                        </select>
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
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
                            Guardar
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal 
                isOpen={!!confirmDeleteId}
                onClose={() => setConfirmDeleteId(null)}
                onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
                title="Eliminar Servicio"
                message="¿Estás seguro de que deseas eliminar este servicio de comedor?"
                type="danger"
            />
        </div>
    );
};
