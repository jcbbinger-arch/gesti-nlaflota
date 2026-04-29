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
    const { orders, sales, users, assignments, groups, modules, training_cycles, suppliers, products, mini_economato_stock, transfers, events } = useData();
    const [searchTerm, setSearchTerm] = React.useState('');
    const [eventTypeFilter, setEventTypeFilter] = React.useState<'all' | 'Servicio' | 'Extraordinario'>('all');

    const analysisData = useMemo(() => {
        const { sale_items, reservations, dining_reservations, dining_services, services: allServices } = useData();
        const teachers = users.filter(u => 
            u.profiles.includes(Profile.TEACHER) && 
            !u.profiles.includes(Profile.ALMACEN) &&
            !SUPER_USER_EMAILS.includes(u.email)
        );
        const completedOrders = orders.filter(o => o.status === 'Completado');
        
        // Data by Teacher
        const dataByTeacher = teachers.map(teacher => {
            const teacherOrders = completedOrders.filter(o => o.user_id === teacher.id);
            const teacherSales = sales.filter(s => s.teacher_id === teacher.id);
            
            // Transfers received by this teacher (as responsible for an event)
            // This is tricky: we need to find events this teacher is responsible for.
            // Simplified: if a transfer is to an event, and the order for that event is by this teacher, 
            // then this teacher "received" the transfer.
            const teacherEventIds = teacherOrders.filter(o => o.order_type === 'service').map(o => o.event_id);
            const receivedTransfers = transfers.filter(t => teacherEventIds.includes(t.to_event_id));
            const receivedTransfersCost = receivedTransfers.reduce((sum, t) => sum + (t.amount || 0), 0);

            // Transfers sent by this teacher
            const sentTransfers = transfers.filter(t => t.from_user_id === teacher.id);
            const sentTransfersCost = sentTransfers.reduce((sum, t) => sum + (t.amount || 0), 0);

            const weeklySpend = teacherOrders
                .filter(o => o.order_type === 'weekly' || !o.order_type)
                .reduce((sum, o) => sum + (o.cost || 0), 0);
            const serviceSpend = teacherOrders
                .filter(o => o.order_type === 'service')
                .reduce((sum, o) => sum + (o.cost || 0), 0) + receivedTransfersCost; // Add received transfers to service cost
                
            const sharedSpend = 0; // Will be calculated after processing all teachers for stats
            const totalSpend = weeklySpend + serviceSpend; // sharedSpend added later
            const totalSales = teacherSales.reduce((sum, s) => sum + s.amount, 0);
            
            return {
                id: teacher.id,
                name: teacher.name,
                orderCount: teacherOrders.length,
                weeklySpend,
                serviceSpend,
                receivedTransfersCost,
                sentTransfersCost,
                totalSpend,
                totalSales,
            };
        });

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

        const dataByTeacherWithShared = dataByTeacher.map(t => {
            const sharedSpend = sharedCostPerTeacher;
            const totalSpend = t.totalSpend + sharedSpend;
            const teacherResponsibility = t.weeklySpend + sharedSpend; // Costs under their direct control
            
            return {
                ...t,
                sharedSpend,
                totalSpend,
                balance: t.totalSales - teacherResponsibility,
            };
        });

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
        
        const top5Teachers = [...dataByTeacherWithShared].sort((a,b) => b.totalSpend - a.totalSpend).slice(0, 5);

        // Academic breakdown (including transfers)
        const costByTeacher: { [key: string]: number } = {};
        completedOrders.forEach(order => { costByTeacher[order.user_id] = (costByTeacher[order.user_id] || 0) + (order.cost || 0); });
        
        const costByGroup: { [key: string]: number } = {};
        const costByModule: { [key: string]: number } = {};
        const costByEvent: { [key: string]: { 
            orders: number, 
            transfers: number, 
            takeaway_revenue: number,
            dining_revenue: number,
            total: number, 
            name: string, 
            date: string 
        } } = {};
        
        // Initialize events data
        events.forEach(e => {
            costByEvent[e.id] = { orders: 0, transfers: 0, takeaway_revenue: 0, dining_revenue: 0, total: 0, name: e.name, date: e.start_date };
        });

        completedOrders.forEach(order => { 
            costByTeacher[order.user_id] = (costByTeacher[order.user_id] || 0) + (order.cost || 0); 
            if (order.event_id && costByEvent[order.event_id]) {
                costByEvent[order.event_id].orders += (order.cost || 0);
            }
        });
        
        transfers.forEach(transfer => {
            if (transfer.to_event_id && costByEvent[transfer.to_event_id]) {
                costByEvent[transfer.to_event_id].transfers += (transfer.amount || 0);
            }
        });

        // Add Takeaway Revenues
        reservations.filter(r => r.status === 'recogido').forEach(res => {
            const item = sale_items.find(si => si.id === res.sale_item_id);
            if (item && item.event_id && costByEvent[item.event_id]) {
                costByEvent[item.event_id].takeaway_revenue += (res.quantity * item.price);
            }
        });

        // Add Dining Revenues
        dining_reservations.forEach(res => {
            const dService = dining_services.find(ds => ds.id === res.service_id);
            if (dService && dService.service_id) {
                const planningService = allServices.find(ps => ps.id === dService.service_id);
                if (planningService && planningService.event_id && costByEvent[planningService.event_id]) {
                    costByEvent[planningService.event_id].dining_revenue += (res.total_price || 0);
                }
            }
        });

        // Calculate Totals per Event
        Object.keys(costByEvent).forEach(eventId => {
            const e = costByEvent[eventId];
            // Real cost is Expenses - Revenues
            e.total = (e.orders + e.transfers) - (e.takeaway_revenue + e.dining_revenue);
        });

        Object.keys(costByTeacher).forEach(teacherId => {
            const teacherAssignments = assignments.filter(a => a.user_id === teacherId);
            if (teacherAssignments.length > 0) {
                const costPerAssignment = costByTeacher[teacherId] / teacherAssignments.length;
                teacherAssignments.forEach(a => { 
                    costByGroup[a.group_id] = (costByGroup[a.group_id] || 0) + costPerAssignment; 
                    costByModule[a.module_id] = (costByModule[a.module_id] || 0) + costPerAssignment;
                });
            }
        });
        
        // Add transfers to academic breakdown
        transfers.forEach(transfer => {
            const event = events.find(e => e.id === transfer.to_event_id);
            if (event && event.type === 'Servicio') {
                // If we know it's a service event, we can find the group/module responsible
                const ordersForEvent = completedOrders.filter(o => o.event_id === event.id && o.order_type === 'service');
                if (ordersForEvent.length > 0) {
                    const responsibleUserId = ordersForEvent[0].user_id;
                    const teacherAssignments = assignments.filter(a => a.user_id === responsibleUserId);
                    if (teacherAssignments.length > 0) {
                        const costPerAssignment = transfer.amount / teacherAssignments.length;
                        teacherAssignments.forEach(a => {
                            costByGroup[a.group_id] = (costByGroup[a.group_id] || 0) + costPerAssignment;
                            costByModule[a.module_id] = (costByModule[a.module_id] || 0) + costPerAssignment;
                        });
                    }
                }
            }
        });

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
            top5Teachers, dataByTeacher: dataByTeacherWithShared,
            costByCycle, costByModule, costByGroup, costBySupplier,
            costByEvent: Object.values(costByEvent)
                .filter(e => e.total > 0)
                .filter(e => {
                    const matchesSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase());
                    const eventObj = events.find(ev => ev.id === Object.keys(costByEvent).find(key => costByEvent[key].name === e.name));
                    const matchesType = eventTypeFilter === 'all' || (eventObj?.type === eventTypeFilter);
                    return matchesSearch && matchesType;
                })
                .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        };
    }, [orders, sales, users, assignments, groups, modules, training_cycles, suppliers, products, mini_economato_stock, transfers, events, searchTerm, eventTypeFilter]);

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
                <Card title="Gasto por Ciclo y Grupo">
                    <ul className="space-y-4">
                        {training_cycles.map((cycle: any) => (
                            <li key={cycle.id}>
                                <div className="flex justify-between items-center text-sm font-bold text-gray-700 bg-gray-100 p-2 rounded">
                                    <span>{cycle.name}</span>
                                    <span>{formatCurrency(analysisData.costByCycle[cycle.id] || 0)}</span>
                                </div>
                                <ul className="mt-2 ml-4 space-y-1">
                                    {groups.filter(g => g.cycle_id === cycle.id).map((group: any) => (
                                        <li key={group.id} className="flex justify-between items-center text-xs text-gray-600">
                                            <span>{group.name}</span>
                                            <span>{formatCurrency(analysisData.costByGroup[group.id] || 0)}</span>
                                        </li>
                                    ))}
                                </ul>
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
                <Card title="Gasto por Evento (Servicios / Extraordinarios)">
                    <div className="no-print flex flex-col md:flex-row gap-4 mb-4 items-end">
                        <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Buscar Evento</label>
                            <input 
                                type="text"
                                placeholder="Ej: Nombre del servicio..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-sm"
                            />
                        </div>
                        <div className="w-full md:w-48">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de Evento</label>
                            <select 
                                value={eventTypeFilter}
                                onChange={e => setEventTypeFilter(e.target.value as any)}
                                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-sm"
                            >
                                <option value="all">Todos los tipos</option>
                                <option value="Servicio">Servicios</option>
                                <option value="Extraordinario">Extraordinarios</option>
                            </select>
                        </div>
                        <button onClick={() => exportToCsv('gasto_por_evento.csv', analysisData.costByEvent)} className="bg-blue-500 text-white text-xs py-2 px-4 rounded hover:bg-blue-600">Exportar CSV</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                <tr>
                                    <th className="p-2 text-left">Evento</th>
                                    <th className="p-2 text-center">Fecha</th>
                                    <th className="p-2 text-right">Coste Pedidos</th>
                                    <th className="p-2 text-right">Coste Traspasos</th>
                                    <th className="p-2 text-right text-green-600">Ventas TakeAway</th>
                                    <th className="p-2 text-right text-green-600">Ventas Comedor</th>
                                    <th className="p-2 text-right font-bold underline">COSTE NETO</th>
                                </tr>
                            </thead>
                            <tbody>
                                {analysisData.costByEvent.map((e, idx) => (
                                    <tr key={idx} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-[13px]">
                                        <td className="p-2 font-medium">{e.name}</td>
                                        <td className="p-2 text-center">{new Date(e.date).toLocaleDateString()}</td>
                                        <td className="p-2 text-right text-amber-600">{formatCurrency(e.orders)}</td>
                                        <td className="p-2 text-right text-indigo-600">{formatCurrency(e.transfers)}</td>
                                        <td className="p-2 text-right text-green-600">+{formatCurrency(e.takeaway_revenue)}</td>
                                        <td className="p-2 text-right text-green-600">+{formatCurrency(e.dining_revenue)}</td>
                                        <td className={`p-2 text-right font-bold ${e.total > 0 ? 'text-primary-600' : 'text-green-700 bg-green-50'}`}>
                                            {formatCurrency(e.total)}
                                        </td>
                                    </tr>
                                ))}
                                {analysisData.costByEvent.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-4 text-center text-gray-500 italic">No hay eventos con gastos registrados.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

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
                                   <th className="p-2 text-right text-indigo-700">Traspasos Recib.</th>
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
                                       <td className="p-2 text-right text-indigo-600 font-medium cursor-help" title={`Ha enviado traspsasos por valor de ${formatCurrency(t.sentTransfersCost)}`}>
                                           {formatCurrency(t.receivedTransfersCost)}
                                       </td>
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
