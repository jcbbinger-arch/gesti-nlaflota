import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/Card';
import { Modal } from '../../components/Modal';
import { PlusIcon, DownloadIcon, PencilIcon, TrashIcon } from '../../components/icons';
import { Sale } from '../../types';
import { exportToCsv, printPage } from '../../utils/export';

const SaleFormModal: React.FC<{ sale: Sale | null; onSave: (sale: Partial<Sale>) => void; onClose: () => void; }> = ({ sale, onSave, onClose }) => {
    const [formState, setFormState] = useState({
        date: sale ? new Date(sale.date).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
        amount: sale?.amount || 0,
        category: sale?.category || '',
        description: sale?.description || '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormState(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formState);
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={sale ? 'Editar Venta' : 'Registrar Nueva Venta'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fecha</label>
                    <input type="date" name="date" value={formState.date} onChange={handleChange} required className="w-full mt-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Importe (€)</label>
                    <input type="number" step="0.01" name="amount" value={formState.amount} onChange={handleChange} required className="w-full mt-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Categoría</label>
                    <input type="text" name="category" value={formState.category} onChange={handleChange} required placeholder="Ej: Menú del Día, Cafetería" className="w-full mt-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descripción (Opcional)</label>
                    <textarea name="description" value={formState.description} onChange={handleChange} rows={2} className="w-full mt-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" />
                </div>
                <div className="flex justify-end pt-4 space-x-2">
                    <button type="button" onClick={onClose} className="bg-gray-200 dark:bg-gray-600 px-4 py-2 rounded-md">Cancelar</button>
                    <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-md">Guardar</button>
                </div>
            </form>
        </Modal>
    );
};


export const SalesManager: React.FC = () => {
    const { sales, setSales } = useData();
    const { currentUser } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

    const mySales = useMemo(() =>
        sales
            .filter(s => s.teacher_id === currentUser?.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    , [sales, currentUser]);

    const handleOpenModal = (sale: Sale | null = null) => {
        setSelectedSale(sale);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedSale(null);
    };

    const handleSaveSale = (saleData: Partial<Sale>) => {
        if (!currentUser) return;

        if (selectedSale) { // Editing
            const updatedSale = { ...selectedSale, ...saleData, date: new Date(saleData.date!).toISOString() };
            setSales(sales.map(s => s.id === selectedSale.id ? updatedSale : s));
        } else { // Creating
            const newSale: Sale = {
                id: `sale-${Date.now()}`,
                teacher_id: currentUser.id,
                date: new Date(saleData.date!).toISOString(),
                amount: saleData.amount!,
                category: saleData.category!,
                description: saleData.description,
            };
            setSales([...sales, newSale]);
        }
        handleCloseModal();
    };
    
    const handleDeleteSale = (saleId: string) => {
        if (window.confirm("¿Seguro que quieres eliminar este registro de venta?")) {
            setSales(sales.filter(s => s.id !== saleId));
        }
    };

    const handleExport = () => {
        const dataToExport = mySales.map(s => ({
            Fecha: new Date(s.date).toLocaleDateString(),
            Categoria: s.category,
            Importe: s.amount,
            Descripcion: s.description
        }));
        exportToCsv('ventas.csv', dataToExport);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Gestión de Ventas</h1>
                <div className="no-print flex items-center space-x-2">
                    <button onClick={printPage} className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 flex items-center">
                        <DownloadIcon className="w-5 h-5 mr-1" /> Descargar PDF
                    </button>
                    <button onClick={() => handleOpenModal()} className="bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 flex items-center">
                        <PlusIcon className="w-5 h-5 mr-1" /> Nueva Venta
                    </button>
                </div>
            </div>

            <Card title="Historial de Ventas">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th className="px-4 py-2 text-left">Fecha</th>
                                <th className="px-4 py-2 text-left">Categoría</th>
                                <th className="px-4 py-2 text-right">Importe</th>
                                <th className="px-4 py-2 text-left">Descripción</th>
                                <th className="px-4 py-2 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {mySales.map(sale => (
                                <tr key={sale.id} className="border-b dark:border-gray-700">
                                    <td className="px-4 py-2">{new Date(sale.date).toLocaleDateString()}</td>
                                    <td className="px-4 py-2">{sale.category}</td>
                                    <td className="px-4 py-2 font-mono text-right">{sale.amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</td>
                                    <td className="px-4 py-2">{sale.description}</td>
                                    <td className="px-4 py-2 no-print space-x-2 text-center">
                                        <button onClick={() => handleOpenModal(sale)} className="text-primary-600 p-1 inline-block"><PencilIcon className="w-4 h-4"/></button>
                                        <button onClick={() => handleDeleteSale(sale.id)} className="text-red-600 p-1 inline-block"><TrashIcon className="w-4 h-4"/></button>
                                    </td>
                                </tr>
                            ))}
                             {mySales.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center p-4 text-gray-500">No hay ventas registradas.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {isModalOpen && <SaleFormModal sale={selectedSale} onSave={handleSaveSale} onClose={handleCloseModal} />}
        </div>
    );
};
