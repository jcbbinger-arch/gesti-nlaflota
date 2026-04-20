import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { Card } from '../../components/Card';
import { ExpenseIcon, DownloadIcon, UsersIcon, ProductIcon } from '../../components/icons';
import { printPage, exportToCsv } from '../../utils/export';
import { Profile, SUPER_USER_EMAILS, StockItem } from '../../types';

const formatCurrency = (amount: number) => amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

const StatCard: React.FC<{ title: string; value: string; }> = ({ title, value }) => (
    <div className="bg-white dark:bg-gray-800 p-4 shadow-lg rounded-lg border-t-4 border-primary-500">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{title}</h3>
        <p className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">{value}</p>
    </div>
);

export const ExpenseManager: React.FC = () => {
    const { orders, sales, users, assignments, groups, modules, training_cycles, suppliers, products, mini_economato_stock } = useData();

    const analysisData = useMemo(() => {
        const teachers = users.filter(u => 
            u.profiles.includes(Profile.TEACHER) && 
            !u.profiles.includes(Profile.ALMACEN) &&
            !SUPER_USER_EMAILS.includes(u.email)
        );
        const completedOrders = orders.filter(o => o.status === 'Completado');
        
        // Gasto Compartido Mini-Economato
        const economatoOrders = completedOrders.filter(o => o.user_id === 'mini-economato');
        let totalSharedEconomatoCost = 0;
        economatoOrders.forEach(order => {
            order.items.forEach(item => {
                const stockItem = mini_economato_stock.find((s: StockItem) => s.id === item.product_id);
                if (stockItem?.is_shared) {
                    totalSharedEconomatoCost += (item.price * item.quantity) * (1 + item.tax / 100);
                }
            });
        });

        const sharedCostPerTeacher = teachers.length > 0 ? totalSharedEconomatoCost / teachers.length : 0;

        const gastoTotal = completedOrders.reduce((sum, order) => {
            if (order.user_id === 'mini-economato') {
                let sharedOnlyCost = 0;
                order.items.forEach(item => {
                    const stockItem = mini_economato_stock.find((s: StockItem) => s.id === item.product_id);
                    if (stockItem?.is_shared) {
                        sharedOnlyCost += (item.price * item.quantity) * (1 + item.tax / 100);
                    }
                });
                return sum + sharedOnlyCost;
            }
            return sum + (order.cost || 0);
        }, 0);
        
        const ingresosTotales = sales.reduce((sum, sale) => sum + sale.amount, 0);
        const balanceGeneral = ingresosTotales - gastoTotal;

        const teachersWithOrders = new Set(completedOrders.filter(o => o.user_id !== 'mini-economato').map(o => o.user_id));
        const gastoMedioPorProfesor = teachersWithOrders.size > 0 ? gastoTotal / teachersWithOrders.size : 0;
        
        // Data by Teacher
        const dataByTeacher = teachers.map(teacher => {
            const teacherOrders = completedOrders.filter(o => o.user_id === teacher.id);
            const teacherSales = sales.filter(s => s.teacher_id === teacher.id);
            
            const weeklySpend = teacherOrders
                .filter(o => o.order_type === 'weekly' || !o.order_type)
                .reduce((sum, o) => sum + (o.cost || 0), 0);
            const serviceSpend = teacherOrders
                .filter(o => o.order_type === 'service')
                .reduce((sum, o) => sum + (o.cost || 0), 0);
                
            const sharedSpend = sharedCostPerTeacher;
            const totalSpend = weeklySpend + serviceSpend + sharedSpend;
            const totalSales = teacherSales.reduce((sum, s) => sum + s.amount, 0);
            
            // Balance: Teacher responsibility (Weekly + Shared) vs Sales
            const teacherResponsibility = weeklySpend + sharedSpend;
            
            return {
                id: teacher.id,
                name: teacher.name,
                orderCount: teacherOrders.length,
                weeklySpend,
                serviceSpend,
                sharedSpend,
                totalSpend,
                totalSales,
                balance: totalSales - teacherResponsibility,
            };
        });

        const top5Teachers = [...dataByTeacher].sort((a,b) => b.totalSpend - a.totalSpend).slice(0, 5);

        // Academic breakdown
        const costByTeacher: { [key: string]: number } = {};
        completedOrders.forEach(order => { costByTeacher[order.user_id] = (costByTeacher[order.user_id] || 0) + (order.cost || 0); });
        
        const costByGroup: { [key: string]: number } = {};
        Object.keys(costByTeacher).forEach(teacherId => {
            const teacherAssignments = assignments.filter(a => a.user_id === teacherId);
            if (teacherAssignments.length > 0) {
                const costPerAssignment = costByTeacher[teacherId] / teacherAssignments.length;
                teacherAssignments.forEach(a => { costByGroup[a.group_id] = (costByGroup[a.group_id] || 0) + costPerAssignment; });
            }
        });

        const costByModule: { [key: string]: number } = {};
        groups.forEach(group => { if(costByGroup[group.id]) costByModule[group.module_id] = (costByModule[group.module_id] || 0) + costByGroup[group.id]; });

        const costByCycle: { [key: string]: number } = {};
        modules.forEach(module => { if(costByModule[module.id]) costByCycle[module.cycle_id] = (costByCycle[module.cycle_id] || 0) + costByModule[module.id]; });
        
        // Supplier breakdown (estimated)
        const costBySupplier: { [key: string]: number } = {};
        completedOrders.forEach(order => {
            order.items.forEach(item => {
                const product = products.find(p => p.id === item.product_id);
                if (product && product.suppliers.length > 0) {
                    const supplierId = product.suppliers[0].supplier_id; // simplified logic
                    costBySupplier[supplierId] = (costBySupplier[supplierId] || 0) + (item.price * item.quantity);
                }
            });
        });


        return {
            gastoTotal, ingresosTotales, balanceGeneral, gastoMedioPorProfesor,
            totalSharedEconomatoCost, sharedCostPerTeacher,
            top5Teachers, dataByTeacher,
            costByCycle, costByModule, costByGroup, costBySupplier
        };
    }, [orders, sales, users, assignments, groups, modules, training_cycles, suppliers, products, mini_economato_stock]);

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Gestión y Estadísticas de Gastos</h1>
                <button onClick={printPage} className="no-print bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 flex items-center">
                    <DownloadIcon className="w-5 h-5 mr-2" /> Descargar/Imprimir PDF
                </button>
            </div>
            
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <StatCard title="Gasto Total" value={formatCurrency(analysisData.gastoTotal)} />
                <StatCard title="Ingresos Totales" value={formatCurrency(analysisData.ingresosTotales)} />
                <StatCard title="Balance General" value={formatCurrency(analysisData.balanceGeneral)} />
                <StatCard title="Gasto Medio / Profesor" value={formatCurrency(analysisData.gastoMedioPorProfesor)} />
            </div>

            {analysisData.totalSharedEconomatoCost > 0 && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-blue-700 font-bold">Gasto Compartido Mini-Economato</p>
                            <p className="text-sm text-blue-600">Total acumulado en productos compartidos: {formatCurrency(analysisData.totalSharedEconomatoCost)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-blue-700 font-bold">Imputación por Profesor</p>
                            <p className="text-sm text-blue-600">{formatCurrency(analysisData.sharedCostPerTeacher)}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <Card title="Gasto por Ciclo Formativo">
                    <ul className="space-y-2">
                        {training_cycles.map((cycle: any) => (
                            <li key={cycle.id} className="flex justify-between items-center text-sm">
                                <span>{cycle.name}</span>
                                <span className="font-semibold">{formatCurrency(analysisData.costByCycle[cycle.id] || 0)}</span>
                            </li>
                        ))}
                    </ul>
                </Card>
                <Card title="Top 5 Profesores con Mayor Gasto">
                    <ul className="space-y-2">
                         {analysisData.top5Teachers.map(t => (
                            <li key={t.id} className="flex justify-between items-center text-sm">
                                <span>{t.name}</span>
                                <span className="font-semibold">{formatCurrency(t.totalSpend)}</span>
                            </li>
                        ))}
                    </ul>
                </Card>
            </div>

            {/* Detailed Tables */}
            <div className="space-y-6">
                <Card title="Gasto por Profesor/a">
                    <button onClick={() => exportToCsv('gasto_por_profesor.csv', analysisData.dataByTeacher)} className="no-print mb-4 bg-blue-500 text-white text-xs py-1 px-3 rounded">Descargar CSV</button>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                           <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                               <tr>
                                   <th className="p-2 text-left">Profesor</th>
                                   <th className="p-2 text-center">Nº Pedidos</th>
                                   <th className="p-2 text-right text-amber-700">Gasto Semanal</th>
                                   <th className="p-2 text-right text-primary-700">Gasto Servicio</th>
                                   <th className="p-2 text-right">Gasto Comp.</th>
                                   <th className="p-2 text-right">Ventas</th>
                                   <th className="p-2 text-right">Balance Personal</th>
                               </tr>
                           </thead>
                           <tbody>
                               {analysisData.dataByTeacher.map(t => (
                                   <tr key={t.id} className="border-b dark:border-gray-700">
                                       <td className="p-2"><Link to={`/admin/expenses/${t.id}`} className="text-primary-600 hover:underline">{t.name}</Link></td>
                                       <td className="p-2 text-center">{t.orderCount}</td>
                                       <td className="p-2 text-right font-medium text-amber-700">{formatCurrency(t.weeklySpend)}</td>
                                       <td className="p-2 text-right font-medium text-primary-700">{formatCurrency(t.serviceSpend)}</td>
                                       <td className="p-2 text-right text-blue-600">{formatCurrency(t.sharedSpend)}</td>
                                       <td className="p-2 text-right text-green-600">{formatCurrency(t.totalSales)}</td>
                                       <td className={`p-2 text-right font-bold ${t.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(t.balance)}</td>
                                   </tr>
                               ))}
                           </tbody>
                        </table>
                    </div>
                </Card>
                
                <Card title="Desglose por Grupos de Alumnos">
                    <button onClick={() => exportToCsv('gasto_por_grupo.csv', groups.map(g => ({...g, cost: analysisData.costByGroup[g.id] || 0})))} className="no-print mb-4 bg-blue-500 text-white text-xs py-1 px-3 rounded">Descargar CSV</button>
                    {/* ... table ... */}
                </Card>

                <Card title="Desglose por Módulo Profesional">
                     <button onClick={() => exportToCsv('gasto_por_modulo.csv', modules.map(m => ({...m, cost: analysisData.costByModule[m.id] || 0})))} className="no-print mb-4 bg-blue-500 text-white text-xs py-1 px-3 rounded">Descargar CSV</button>
                    {/* ... table ... */}
                </Card>
                
                <Card title="Gasto por Proveedor (Estimado)">
                     <button onClick={() => exportToCsv('gasto_por_proveedor.csv', suppliers.map(s => ({...s, cost: analysisData.costBySupplier[s.id] || 0})))} className="no-print mb-4 bg-blue-500 text-white text-xs py-1 px-3 rounded">Descargar CSV</button>
                    <table className="w-full text-sm">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400"><tr><th>Proveedor</th><th>Gasto Estimado</th></tr></thead>
                        <tbody>
                            {/* FIX: Explicitly type [id, cost] to fix type inference issue on `cost`. */}
                            {Object.entries(analysisData.costBySupplier).map(([id, cost]: [string, number]) => (
                                <tr key={id} className="border-b dark:border-gray-700"><td className="p-2">{suppliers.find(s=>s.id === id)?.name}</td><td className="p-2">{formatCurrency(cost)}</td></tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            </div>
        </div>
    );
};
