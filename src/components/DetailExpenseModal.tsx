import React, { useMemo, useState } from 'react';
import { Modal } from './Modal';
import { Order, Product, AppEvent } from '../types';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    PieChart, Pie, Cell, LineChart, Line, Legend 
} from 'recharts';
import { CalendarIcon, PackageIcon, TrendingUpIcon, FilterIcon } from './icons';

interface DetailExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    orders: Order[];
    products: Product[];
    events: AppEvent[];
    type: string;
}

export const DetailExpenseModal: React.FC<DetailExpenseModalProps> = ({ 
    isOpen, onClose, orders, products, events, type 
}) => {
    const [period, setPeriod] = useState<'total' | 'last_month' | 'current_month'>('total');

    const filteredOrders = useMemo(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        return orders.filter(o => {
            const orderDate = new Date(o.date);
            if (period === 'current_month') return orderDate >= startOfMonth;
            if (period === 'last_month') return orderDate >= startOfLastMonth && orderDate <= endOfLastMonth;
            return true;
        });
    }, [orders, period]);

    const totalCost = useMemo(() => filteredOrders.reduce((sum, o) => sum + (o.cost || 0), 0), [filteredOrders]);

    // Top Products
    const topProducts = useMemo(() => {
        const productMap = new Map<string, { name: string, cost: number, quantity: number }>();
        
        filteredOrders.forEach(order => {
            order.items.forEach(item => {
                const product = products.find(p => p.id === item.product_id);
                const name = product?.name || 'Producto Desconocido';
                const itemCost = (item.price * item.quantity) * (1 + (item.tax || 0) / 100);
                
                const existing = productMap.get(item.product_id) || { name, cost: 0, quantity: 0 };
                productMap.set(item.product_id, {
                    name,
                    cost: existing.cost + itemCost,
                    quantity: existing.quantity + item.quantity
                });
            });
        });

        return Array.from(productMap.values())
            .sort((a, b) => b.cost - a.cost)
            .slice(0, 5);
    }, [filteredOrders, products]);

    // Temporal Evolution (By week)
    const temporalData = useMemo(() => {
        const weeks: Record<string, number> = {};
        
        filteredOrders.forEach(o => {
            const date = new Date(o.date);
            // Simple week identifier: Year-WeekNumber
            const oneJan = new Date(date.getFullYear(),0,1);
            const numberOfDays = Math.floor((date.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
            const weekNum = Math.ceil(( date.getDay() + 1 + numberOfDays) / 7);
            const key = `Sem. ${weekNum}`;
            
            weeks[key] = (weeks[key] || 0) + (o.cost || 0);
        });

        return Object.entries(weeks).map(([name, total]) => ({ name, total }));
    }, [filteredOrders]);

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    if (!isOpen) return null;

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={`Desglose Detailado: ${type}`}
            size="4xl"
        >
            <div className="space-y-6">
                {/* Filtros de Periodo */}
                <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center space-x-2">
                        <FilterIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Filtrar por:</span>
                    </div>
                    <div className="flex space-x-1">
                        {[
                            { id: 'total', label: 'Todo' },
                            { id: 'last_month', label: 'Mes Pasado' },
                            { id: 'current_month', label: 'Mes Actual' }
                        ].map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => setPeriod(opt.id as any)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    period === opt.id 
                                    ? 'bg-primary-600 text-white shadow-sm' 
                                    : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Resumen e Indicadores */}
                    <div className="md:col-span-1 space-y-6">
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-primary-600 to-indigo-700 text-white shadow-xl shadow-primary-500/20 relative overflow-hidden">
                            <div className="relative z-10">
                                <p className="text-primary-100 text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Gasto en {type}</p>
                                <h3 className="text-4xl font-black">{totalCost.toFixed(2)}€</h3>
                                <p className="text-primary-200 text-[10px] mt-4 font-medium flex items-center">
                                    <TrendingUpIcon className="w-3 h-3 mr-1" />
                                    Basado en {filteredOrders.length} pedidos
                                </p>
                            </div>
                            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-xl" />
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center">
                                <PackageIcon className="w-4 h-4 mr-2 text-primary-500" />
                                Top 5 Productos (Peso Gasto)
                            </h4>
                            <div className="space-y-3">
                                {topProducts.map((p, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate pr-2">{p.name}</span>
                                            <span className="text-[10px] text-gray-400">{p.quantity.toFixed(1)} uds.</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs font-black text-primary-600 dark:text-primary-400">{p.cost.toFixed(2)}€</span>
                                            <div className="w-16 h-1 bg-gray-100 dark:bg-gray-700 rounded-full mt-1 overflow-hidden">
                                                <div 
                                                    className="h-full bg-primary-500" 
                                                    style={{ width: `${(p.cost / topProducts[0].cost) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {topProducts.length === 0 && <p className="text-xs text-gray-400 italic text-center py-4">Sin datos suficientes</p>}
                            </div>
                        </div>
                    </div>

                    {/* Gráficos y Tabla */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center">
                                <TrendingUpIcon className="w-4 h-4 mr-2 text-primary-500" />
                                Evolución Temporal del Gasto
                            </h4>
                            <div className="h-48 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={temporalData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis 
                                            dataKey="name" 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{fontSize: 10, fill: '#94a3b8'}} 
                                        />
                                        <YAxis 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{fontSize: 10, fill: '#94a3b8'}}
                                            tickFormatter={(val) => `${val}€`}
                                        />
                                        <Tooltip 
                                            contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                                            formatter={(val: any) => [`${Number(val).toFixed(2)}€`, 'Gasto']}
                                        />
                                        <Line 
                                            type="monotone" 
                                            dataKey="total" 
                                            stroke="#3b82f6" 
                                            strokeWidth={3} 
                                            dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                                            activeDot={{ r: 6, strokeWidth: 0 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 p-4 border-b dark:border-gray-700 flex items-center">
                                <CalendarIcon className="w-4 h-4 mr-2 text-primary-500" />
                                Últimos Pedidos de {type}
                            </h4>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 uppercase font-black tracking-tighter">
                                        <tr>
                                            <th className="px-4 py-2">Fecha</th>
                                            <th className="px-4 py-2">Evento / Concepto</th>
                                            <th className="px-4 py-2 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y dark:divide-gray-700">
                                        {filteredOrders.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10).map(order => {
                                            const event = events.find(e => e.id === order.event_id);
                                            return (
                                                <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">
                                                        {new Date(order.date).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <p className="font-bold text-gray-800 dark:text-gray-200">{event?.name || 'Desconocido'}</p>
                                                        <p className="text-[10px] text-gray-400 font-medium tracking-tight">REF: {order.id.slice(-8).toUpperCase()}</p>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-black text-gray-800 dark:text-gray-200">
                                                        {(order.cost || 0).toFixed(2)}€
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {filteredOrders.length === 0 && (
                                            <tr>
                                                <td colSpan={3} className="px-4 py-8 text-center text-gray-400 italic">No hay pedidos en este periodo</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
