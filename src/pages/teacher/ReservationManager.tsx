import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/Card';
import { Mail, Phone, AlertTriangle, MessageSquare, Printer, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Reservation, SaleItem, Profile } from '../../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';

type ViewMode = 'by_item' | 'by_person';

export const ReservationManager: React.FC = () => {
    const { sale_items, reservations, setReservations } = useData();
    const { currentUser } = useAuth();
    const [viewMode, setViewMode] = useState<ViewMode>('by_item');

    // Filter items to show only those belonging to the current teacher, unless admin or sales_manager
    const isGlobalManager = currentUser?.profiles?.includes(Profile.ADMIN) || currentUser?.profiles?.includes(Profile.SALES_MANAGER);
    const displayItems = isGlobalManager 
        ? sale_items 
        : sale_items.filter(item => item.teacher_name === currentUser?.name || item.group_name === currentUser?.name);

    const displayItemIds = new Set(displayItems.map(i => i.id));
    const displayReservations = reservations.filter(r => displayItemIds.has(r.sale_item_id));

    const handleStatusChange = async (reservationId: string, newStatus: 'pendiente' | 'recogido' | 'cancelado') => {
        try {
            const resRef = doc(db, 'reservations', reservationId);
            await updateDoc(resRef, { status: newStatus });
            // Optimistic update
            setReservations(reservations.map(r => r.id === reservationId ? { ...r, status: newStatus } : r));
        } catch (error) {
            console.error("Error updating reservation status:", error);
            alert("Error al actualizar el estado de la reserva.");
        }
    };

    const handlePrint = () => {
        window.print();
    };

    // Group by person logic
    const reservationsByPerson = useMemo(() => {
        const grouped: Record<string, { user_name: string, email?: string, phone?: string, reservations: (Reservation & { item: SaleItem })[], totalItems: number }> = {};
        
        displayReservations.forEach(res => {
            const item = displayItems.find(i => i.id === res.sale_item_id);
            if (!item) return;

            const key = res.email || res.user_name; // Use email as primary key if available
            if (!grouped[key]) {
                grouped[key] = {
                    user_name: res.user_name,
                    email: res.email,
                    phone: res.phone,
                    reservations: [],
                    totalItems: 0
                };
            }
            grouped[key].reservations.push({ ...res, item });
            grouped[key].totalItems += res.quantity;
        });

        return Object.values(grouped).sort((a, b) => a.user_name.localeCompare(b.user_name));
    }, [displayReservations, displayItems]);

    const StatusBadge = ({ status }: { status: string }) => {
        switch (status) {
            case 'recogido':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1"/> Recogido</span>;
            case 'cancelado':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1"/> Cancelado</span>;
            default:
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1"/> Pendiente</span>;
        }
    };

    const StatusSelect = ({ reservation }: { reservation: Reservation }) => (
        <select 
            value={reservation.status || 'pendiente'} 
            onChange={(e) => handleStatusChange(reservation.id, e.target.value as any)}
            className={`text-sm rounded-md border-gray-300 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50 print:hidden
                ${reservation.status === 'recogido' ? 'bg-green-50 text-green-700' : 
                  reservation.status === 'cancelado' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'}`}
        >
            <option value="pendiente">Pendiente</option>
            <option value="recogido">Recogido</option>
            <option value="cancelado">Cancelado</option>
        </select>
    );

    return (
        <div className="print:m-0 print:p-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 print:hidden gap-4">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Gestión de Reservas</h1>
                
                <div className="flex flex-wrap gap-3">
                    <div className="inline-flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                        <button 
                            onClick={() => setViewMode('by_item')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'by_item' ? 'bg-white dark:bg-gray-700 shadow text-primary-600 dark:text-primary-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
                        >
                            Por Plato
                        </button>
                        <button 
                            onClick={() => setViewMode('by_person')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'by_person' ? 'bg-white dark:bg-gray-700 shadow text-primary-600 dark:text-primary-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
                        >
                            Por Persona
                        </button>
                    </div>
                    
                    <button 
                        onClick={handlePrint}
                        className="flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                    >
                        <Printer className="w-4 h-4 mr-2" />
                        Imprimir Hoja
                    </button>
                </div>
            </div>

            {/* Print Header */}
            <div className="hidden print:block mb-8 text-center">
                <h1 className="text-2xl font-bold">Hoja de Reservas - {new Date().toLocaleDateString()}</h1>
                <p className="text-gray-600">Vista: {viewMode === 'by_item' ? 'Agrupado por Plato' : 'Agrupado por Cliente'}</p>
            </div>

            <div className="space-y-8 print:space-y-6">
                {viewMode === 'by_item' ? (
                    /* VISTA POR PLATO */
                    displayItems.map(item => {
                        const itemReservations = displayReservations.filter(r => r.sale_item_id === item.id);
                        if (itemReservations.length === 0) return null;
                        
                        return (
                            <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden print:shadow-none print:border-gray-300 print:break-inside-avoid">
                                <div className="bg-gray-50 dark:bg-gray-800/80 px-6 py-4 border-b border-gray-200 dark:border-gray-700 print:bg-gray-100">
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{item.name}</h2>
                                    <div className="mt-1 flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                                        <span><strong>Vendido por:</strong> {item.teacher_name || item.group_name || 'Profesor'}</span>
                                        <span><strong>Recogida:</strong> {item.sale_date} ({item.pickup_time} - {item.end_time})</span>
                                        <span className="font-medium text-primary-600">Total Reservas: {itemReservations.reduce((sum, r) => sum + r.quantity, 0)}</span>
                                    </div>
                                </div>
                                
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 print:bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3">Cliente</th>
                                                <th className="px-6 py-3 hidden sm:table-cell">Contacto</th>
                                                <th className="px-6 py-3">Detalles</th>
                                                <th className="px-6 py-3 text-center">Cant.</th>
                                                <th className="px-6 py-3">Estado</th>
                                                <th className="px-6 py-3 hidden print:table-cell text-center">Recogido (✓)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                            {itemReservations.map(res => (
                                                <tr key={res.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                                        {res.user_name}
                                                    </td>
                                                    <td className="px-6 py-4 hidden sm:table-cell">
                                                        <div className="space-y-1">
                                                            {res.phone && <div className="flex items-center text-gray-600 dark:text-gray-300"><Phone className="w-3 h-3 mr-1" /> {res.phone}</div>}
                                                            {res.email && <div className="flex items-center text-gray-600 dark:text-gray-300"><Mail className="w-3 h-3 mr-1" /> {res.email}</div>}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="space-y-1">
                                                            {res.allergens && res.allergens.length > 0 && (
                                                                <div className="flex items-start text-red-600 dark:text-red-400 text-xs">
                                                                    <AlertTriangle className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                                                                    <span>{res.allergens.join(', ')}</span>
                                                                </div>
                                                            )}
                                                            {res.notes && (
                                                                <div className="flex items-start text-gray-500 dark:text-gray-400 text-xs italic">
                                                                    <MessageSquare className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                                                                    <span>{res.notes}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center font-bold text-lg text-primary-600">
                                                        {res.quantity}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="print:hidden">
                                                            <StatusSelect reservation={res} />
                                                        </div>
                                                        <div className="hidden print:block">
                                                            <StatusBadge status={res.status || 'pendiente'} />
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 hidden print:table-cell text-center">
                                                        <div className="w-6 h-6 border-2 border-gray-400 rounded mx-auto"></div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    /* VISTA POR PERSONA */
                    reservationsByPerson.map(person => (
                        <div key={person.email || person.user_name} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden print:shadow-none print:border-gray-300 print:break-inside-avoid">
                            <div className="bg-gray-50 dark:bg-gray-800/80 px-6 py-4 border-b border-gray-200 dark:border-gray-700 print:bg-gray-100 flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{person.user_name}</h2>
                                    <div className="mt-1 flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                                        {person.phone && <span className="flex items-center"><Phone className="w-3 h-3 mr-1" /> {person.phone}</span>}
                                        {person.email && <span className="flex items-center"><Mail className="w-3 h-3 mr-1" /> {person.email}</span>}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="block text-sm text-gray-500">Total Platos</span>
                                    <span className="text-2xl font-bold text-primary-600">{person.totalItems}</span>
                                </div>
                            </div>
                            
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 print:bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3">Plato</th>
                                            <th className="px-6 py-3 hidden sm:table-cell">Profesor/Grupo</th>
                                            <th className="px-6 py-3">Detalles</th>
                                            <th className="px-6 py-3 text-center">Cant.</th>
                                            <th className="px-6 py-3">Estado</th>
                                            <th className="px-6 py-3 hidden print:table-cell text-center">Recogido (✓)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {person.reservations.map(res => (
                                            <tr key={res.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                                    {res.item.name}
                                                    <div className="text-xs text-gray-500 font-normal mt-1 sm:hidden">
                                                        {res.item.teacher_name || res.item.group_name}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 hidden sm:table-cell text-gray-600 dark:text-gray-400">
                                                    {res.item.teacher_name || res.item.group_name || 'Profesor'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="space-y-1">
                                                        {res.allergens && res.allergens.length > 0 && (
                                                            <div className="flex items-start text-red-600 dark:text-red-400 text-xs">
                                                                <AlertTriangle className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                                                                <span>{res.allergens.join(', ')}</span>
                                                            </div>
                                                        )}
                                                        {res.notes && (
                                                            <div className="flex items-start text-gray-500 dark:text-gray-400 text-xs italic">
                                                                <MessageSquare className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                                                                <span>{res.notes}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center font-bold text-lg text-primary-600">
                                                    {res.quantity}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="print:hidden">
                                                        <StatusSelect reservation={res} />
                                                    </div>
                                                    <div className="hidden print:block">
                                                        <StatusBadge status={res.status || 'pendiente'} />
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 hidden print:table-cell text-center">
                                                    <div className="w-6 h-6 border-2 border-gray-400 rounded mx-auto"></div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))
                )}

                {displayReservations.length === 0 && (
                    <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow print:hidden">
                        <p className="text-gray-500 text-lg">No hay reservas registradas.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
