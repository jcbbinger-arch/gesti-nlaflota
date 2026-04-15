import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { Card } from '../../components/Card';
import { DownloadIcon } from '../../components/icons';
import { printPage, exportToCsv } from '../../utils/export';

const formatCurrency = (amount: number) => amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

export const ExpenseDetailByTeacher: React.FC = () => {
    const { teacher_id } = useParams<{ teacher_id: string }>();
    const { users, orders, sales, products, events } = useData();

    const teacher = useMemo(() => users.find(u => u.id === teacher_id), [users, teacher_id]);
    const productsMap = useMemo(() => new Map(products.map(p => [p.id, p.name])), [products]);
    const eventsMap = useMemo(() => new Map(events.map(e => [e.id, e.name])), [events]);

    const teacherData = useMemo(() => {
        if (!teacher) return null;

        const teacherOrders = orders.filter(o => o.user_id === teacher.id && o.status === 'Completado');
        const teacherSales = sales.filter(s => s.teacher_id === teacher.id);

        const totalSpend = teacherOrders.reduce((sum, o) => sum + (o.cost || 0), 0);
        const totalSales = teacherSales.reduce((sum, s) => sum + s.amount, 0);
        const balance = totalSales - totalSpend;
        
        // Monthly data for charts
        const monthlyData: { [key: string]: { spend: number, sales: number } } = {};
        teacherOrders.forEach(o => {
            const month = new Date(o.date).toISOString().slice(0, 7);
            if (!monthlyData[month]) monthlyData[month] = { spend: 0, sales: 0 };
            monthlyData[month].spend += o.cost || 0;
        });
        teacherSales.forEach(s => {
            const month = new Date(s.date).toISOString().slice(0, 7);
            if (!monthlyData[month]) monthlyData[month] = { spend: 0, sales: 0 };
            monthlyData[month].sales += s.amount;
        });

        return {
            teacherOrders,
            teacherSales,
            totalSpend,
            totalSales,
            balance,
            monthlyData: Object.entries(monthlyData).sort(([a], [b]) => a.localeCompare(b)),
        };
    }, [teacher, orders, sales]);

    if (!teacher || !teacherData) {
        return <Card title="Error"><p>Profesor no encontrado.</p></Card>;
    }

    const maxMonthlyValue = Math.max(...teacherData.monthlyData.map(([, data]) => Math.max(data.spend, data.sales)), 1);

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <Link to="/admin/expenses" className="text-primary-600 hover:underline text-sm no-print">&larr; Volver al Resumen</Link>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Detalle de Gastos: {teacher.name}</h1>
                </div>
                 <button onClick={printPage} className="no-print bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 flex items-center">
                    <DownloadIcon className="w-5 h-5 mr-2" /> Descargar/Imprimir PDF
                </button>
            </div>
            
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card title="Gasto Total"><p className="text-2xl font-bold">{formatCurrency(teacherData.totalSpend)}</p></Card>
                <Card title="Ventas Totales"><p className="text-2xl font-bold">{formatCurrency(teacherData.totalSales)}</p></Card>
                <Card title="Balance"><p className={`text-2xl font-bold ${teacherData.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(teacherData.balance)}</p></Card>
            </div>

            {/* Charts */}
             <Card title="Evolución Mensual (Gasto vs. Venta)" className="mb-6">
                <div className="flex h-48 items-end space-x-2 overflow-x-auto p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    {teacherData.monthlyData.map(([month, data]) => (
                        <div key={month} className="flex flex-col items-center flex-shrink-0 w-20">
                            <div className="flex items-end h-full">
                                <div className="bg-red-400" style={{ height: `${(data.spend / maxMonthlyValue) * 100}%`, width: '20px' }} title={`Gasto: ${formatCurrency(data.spend)}`}></div>
                                <div className="bg-green-400" style={{ height: `${(data.sales / maxMonthlyValue) * 100}%`, width: '20px' }} title={`Venta: ${formatCurrency(data.sales)}`}></div>
                            </div>
                            <span className="text-xs mt-1">{month}</span>
                        </div>
                    ))}
                </div>
             </Card>
            
            {/* Tables */}
            <div className="space-y-6">
                 <Card title="Historial de Pedidos Completados">
                    <button onClick={() => exportToCsv(`pedidos_${teacher.name}.csv`, teacherData.teacherOrders)} className="no-print mb-4 bg-blue-500 text-white text-xs py-1 px-3 rounded">Descargar CSV</button>
                    <table className="w-full text-sm">
                        <thead><tr className="border-b dark:border-gray-600 text-left"><th className="p-2">Fecha</th><th className="p-2">Evento</th><th className="p-2">Coste</th></tr></thead>
                        <tbody>
                            {/* FIX: Add fallback for eventsMap.get to prevent undefined being passed as a child. */}
                            {teacherData.teacherOrders.map(o => <tr key={o.id}><td className="p-2">{new Date(o.date).toLocaleDateString()}</td><td className="p-2">{eventsMap.get(o.event_id) || 'N/A'}</td><td className="p-2">{formatCurrency(o.cost || 0)}</td></tr>)}
                        </tbody>
                    </table>
                 </Card>
                 <Card title="Historial de Ventas">
                    <button onClick={() => exportToCsv(`ventas_${teacher.name}.csv`, teacherData.teacherSales)} className="no-print mb-4 bg-blue-500 text-white text-xs py-1 px-3 rounded">Descargar CSV</button>
                    <table className="w-full text-sm">
                        <thead><tr className="border-b dark:border-gray-600 text-left"><th className="p-2">Fecha</th><th className="p-2">Categoría</th><th className="p-2">Importe</th></tr></thead>
                        <tbody>
                             {teacherData.teacherSales.map(s => <tr key={s.id}><td className="p-2">{new Date(s.date).toLocaleDateString()}</td><td className="p-2">{s.category}</td><td className="p-2">{formatCurrency(s.amount)}</td></tr>)}
                        </tbody>
                    </table>
                 </Card>
            </div>
        </div>
    );
};
