import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/Card';
import { Modal } from '../../components/Modal';
import { AppEvent, Transfer, Profile } from '../../types';
import { PlusIcon, TrashIcon, ArrowRightLeftIcon } from '../../components/icons';

export const TransferPortal: React.FC = () => {
    const { events, transfers, setTransfers, assignments } = useData();
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formState, setFormState] = useState({
        to_event_id: '',
        concept: '',
        amount: 0,
        units: 0,
        price_per_unit: 0
    });

    const now = new Date();
    
    // Active service events
    const activeServiceEvents = useMemo(() => 
        events.filter(e => 
            e.type === 'Servicio' && 
            e.status === 'Activo' && 
            new Date(e.start_date) <= now && 
            new Date(e.end_date) >= now
        ), 
    [events]);

    const myTransfers = useMemo(() => 
        transfers.filter(t => t.from_user_id === currentUser?.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [transfers, currentUser]);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        
        const newTransfer: Transfer = {
            id: `tr-${Date.now()}`,
            from_user_id: currentUser?.id || '',
            to_event_id: formState.to_event_id,
            concept: formState.concept,
            amount: formState.amount || (formState.units * formState.price_per_unit),
            units: formState.units || undefined,
            price_per_unit: formState.price_per_unit || undefined,
            date: new Date().toISOString(),
            status: 'Completado'
        };

        setTransfers([...transfers, newTransfer]);
        setIsModalOpen(false);
        setFormState({ to_event_id: '', concept: '', amount: 0, units: 0, price_per_unit: 0 });
    };

    const handleDelete = (id: string) => {
        if (window.confirm('¿Seguro que quieres eliminar este traspaso?')) {
            setTransfers(transfers.filter(t => t.id !== id));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-indigo-800 dark:text-indigo-300 flex items-center">
                        <ArrowRightLeftIcon className="w-8 h-8 mr-3" />
                        Gestión de Traspasos
                    </h1>
                    <p className="text-gray-500 mt-1">Imputación de costes de producciones propias a servicios de comedor.</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-indigo-700 transition-colors flex items-center"
                >
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Nuevo Traspaso
                </button>
            </div>

            <Card title="Historial de Mis Traspasos">
                <div className="overflow-x-auto text-sm">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 uppercase text-xs font-bold">
                            <tr>
                                <th className="px-6 py-3">Fecha</th>
                                <th className="px-6 py-3">Concepto</th>
                                <th className="px-6 py-3">Destino (Servicio)</th>
                                <th className="px-6 py-3 text-right">Importe</th>
                                <th className="px-6 py-3 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {myTransfers.length > 0 ? (
                                myTransfers.map(transfer => {
                                    const event = events.find(e => e.id === transfer.to_event_id);
                                    return (
                                        <tr key={transfer.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="px-6 py-4">{new Date(transfer.date).toLocaleDateString()}</td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900 dark:text-white">{transfer.concept}</div>
                                                {transfer.units && transfer.price_per_unit && (
                                                    <div className="text-[10px] text-gray-500">{transfer.units} uds x {transfer.price_per_unit.toFixed(2)}€</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                                                    {event?.name || 'Evento Desconocido'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-gray-800 dark:text-gray-200">
                                                {transfer.amount.toFixed(2)}€
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button 
                                                    onClick={() => handleDelete(transfer.id)}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                                                    title="Eliminar traspaso"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">
                                        No has realizado ningún traspaso todavía.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {isModalOpen && (
                <Modal isOpen={true} onClose={() => setIsModalOpen(false)} title="Nuevo Traspaso a Servicio">
                    <form onSubmit={handleSave} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Servicio de Destino</label>
                            <select 
                                required
                                value={formState.to_event_id}
                                onChange={e => setFormState({...formState, to_event_id: e.target.value})}
                                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">-- Selecciona el servicio --</option>
                                {activeServiceEvents.map(e => (
                                    <option key={e.id} value={e.id}>{e.name}</option>
                                ))}
                            </select>
                            <p className="text-[10px] mt-1 text-gray-500">Solo se muestran los servicios actualmente abiertos para pedidos.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Concepto / Glosa</label>
                            <input 
                                type="text"
                                required
                                placeholder="Ej: Pan variado artesano, 20 bizcochos..."
                                value={formState.concept}
                                onChange={e => setFormState({...formState, concept: e.target.value})}
                                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4 border-t pt-4 mt-4">
                            <div className="col-span-2">
                                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Cálculo del Importe</p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1">Unidades</label>
                                <input 
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={formState.units}
                                    onChange={e => {
                                        const u = parseFloat(e.target.value) || 0;
                                        setFormState({...formState, units: u, amount: u * (formState.price_per_unit || 0)});
                                    }}
                                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1">Precio/Unidad (€)</label>
                                <input 
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formState.price_per_unit}
                                    onChange={e => {
                                        const p = parseFloat(e.target.value) || 0;
                                        setFormState({...formState, price_per_unit: p, amount: p * (formState.units || 0)});
                                    }}
                                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-bold mb-1">Importe Total a Traspasar (€)</label>
                                <div className="relative">
                                    <input 
                                        type="number"
                                        required
                                        min="0.01"
                                        step="0.01"
                                        value={formState.amount}
                                        onChange={e => setFormState({...formState, amount: parseFloat(e.target.value) || 0})}
                                        className="w-full p-3 border-2 border-indigo-200 rounded-md dark:bg-indigo-900/30 dark:border-indigo-800 text-lg font-bold text-indigo-700 dark:text-indigo-300"
                                    />
                                    <span className="absolute right-3 top-3.5 text-indigo-400">€</span>
                                </div>
                                <p className="text-[10px] mt-1 text-gray-500 italic">Puedes ingresar el importe manual o usar el cálculo por unidades arriba.</p>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 pt-6">
                            <button 
                                type="button" 
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="submit"
                                className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-indigo-700 transition-colors"
                            >
                                Confirmar Traspaso
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
};
