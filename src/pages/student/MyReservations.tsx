import React, { useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/Card';
import { AlertTriangle, MessageSquare, Clock, CheckCircle, XCircle } from 'lucide-react';

export const MyReservations: React.FC = () => {
    const { sale_items, reservations } = useData();
    const { currentUser } = useAuth();

    const myReservations = useMemo(() => {
        if (!currentUser) return [];
        // Filter reservations by user_id or email
        return reservations.filter(r => r.user_id === currentUser.id || r.email === currentUser.email);
    }, [reservations, currentUser]);

    const groupedReservations = useMemo(() => {
        const grouped: Record<string, { teacher_name: string, items: any[], totalItems: number }> = {};
        
        myReservations.forEach(res => {
            const item = sale_items.find(i => i.id === res.sale_item_id);
            if (!item) return;

            const teacherName = item.teacher_name || item.group_name || 'Profesor';
            if (!grouped[teacherName]) {
                grouped[teacherName] = { teacher_name: teacherName, items: [], totalItems: 0 };
            }
            grouped[teacherName].items.push({ ...res, item });
            grouped[teacherName].totalItems += res.quantity;
        });

        return Object.values(grouped);
    }, [myReservations, sale_items]);

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

    if (!currentUser) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500 text-lg">Debes iniciar sesión para ver tus reservas.</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-8">Mis Reservas</h1>
            
            {groupedReservations.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <p className="text-gray-500 text-lg">Aún no has realizado ninguna reserva.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {groupedReservations.map(group => (
                        <div key={group.teacher_name} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <div className="bg-gray-50 dark:bg-gray-800/80 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Vendido por: {group.teacher_name}</h2>
                                <div className="text-right">
                                    <span className="block text-sm text-gray-500">Total Platos</span>
                                    <span className="text-2xl font-bold text-primary-600">{group.totalItems}</span>
                                </div>
                            </div>
                            
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                        <tr>
                                            <th className="px-6 py-3">Plato</th>
                                            <th className="px-6 py-3">Recogida</th>
                                            <th className="px-6 py-3">Detalles</th>
                                            <th className="px-6 py-3 text-center">Cantidad</th>
                                            <th className="px-6 py-3">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {group.items.map(res => (
                                            <tr key={res.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                                    {res.item.name}
                                                    <div className="text-xs text-gray-500 font-normal mt-1">
                                                        {res.item.price.toFixed(2)} € / ud
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                                                    {res.item.sale_date}<br/>
                                                    {res.item.pickup_time} - {res.item.end_time}
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
                                                    <StatusBadge status={res.status || 'pendiente'} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
