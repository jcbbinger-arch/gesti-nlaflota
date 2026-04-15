import React from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../../components/Card';
import { ChartIcon, SaleIcon, ClipboardDocumentListIcon, UsersIcon } from '../../components/icons';
import { Profile } from '../../types';

export const SalesDashboard: React.FC = () => {
    const { reservations, sales, users } = useData();

    const stats = [
        { name: 'Reservas Pendientes', value: reservations.filter(r => r.status === 'pendiente').length, icon: <ClipboardDocumentListIcon className="w-6 h-6 text-blue-500" /> },
        { name: 'Ventas Totales', value: sales.length, icon: <SaleIcon className="w-6 h-6 text-green-500" /> },
        { name: 'Clientes Registrados', value: users.filter(u => u.profiles.includes(Profile.CUSTOMER)).length, icon: <UsersIcon className="w-6 h-6 text-purple-500" /> },
        { name: 'Ingresos Totales', value: `${sales.reduce((acc, s) => acc + s.amount, 0).toFixed(2)}€`, icon: <ChartIcon className="w-6 h-6 text-orange-500" /> },
    ];

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Panel de Gestión de Ventas</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => (
                    <Card key={stat.name} className="flex items-center p-6">
                        <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-700 mr-4">
                            {stat.icon}
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{stat.name}</p>
                            <p className="text-2xl font-bold text-gray-800 dark:text-white">{stat.value}</p>
                        </div>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Últimas Reservas">
                    <div className="space-y-4">
                        {reservations.slice(0, 5).map(res => (
                            <div key={res.id} className="flex justify-between items-center p-3 border-b dark:border-gray-700 last:border-0">
                                <div>
                                    <p className="font-medium">{users.find(u => u.id === res.user_id)?.name || res.user_name || 'Cliente'}</p>
                                    <p className="text-xs text-gray-500">{new Date(res.created_at).toLocaleDateString()}</p>
                                </div>
                                <span className={`px-2 py-1 text-xs rounded-full ${res.status === 'pendiente' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                    {res.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card title="Ventas Recientes">
                    <div className="space-y-4">
                        {sales.slice(0, 5).map(sale => (
                            <div key={sale.id} className="flex justify-between items-center p-3 border-b dark:border-gray-700 last:border-0">
                                <div>
                                    <p className="font-medium">Ticket #{sale.id.slice(-4)}</p>
                                    <p className="text-xs text-gray-500">{new Date(sale.date).toLocaleDateString()}</p>
                                </div>
                                <p className="font-bold">{sale.amount.toFixed(2)}€</p>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
};
