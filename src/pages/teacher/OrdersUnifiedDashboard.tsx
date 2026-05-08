import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
    ClipboardDocumentListIcon,
    HistoryIcon,
    ShoppingCartIcon
} from '../../components/icons';
import { Card } from '../../components/Card';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';

// Import existing components
import { OrderPortal } from './OrderPortal';
import { TeacherOrderHistory } from './TeacherOrderHistory';
import { OrderForm } from './OrderForm';
import { TransferPortal } from './TransferPortal';

const TabButton: React.FC<{ 
    active: boolean; 
    onClick: () => void; 
    icon: React.ReactNode; 
    label: string;
    description: string;
}> = ({ active, onClick, icon, label, description }) => (
    <button
        onClick={onClick}
        className={`flex flex-col items-start p-4 rounded-2xl transition-all duration-300 border-2 ${
            active 
                ? 'bg-primary-600 border-primary-500 shadow-lg shadow-primary-500/20 text-white' 
                : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-primary-200 dark:hover:border-primary-900 group'
        }`}
    >
        <div className={`p-2 rounded-xl mb-3 transition-colors ${
            active ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-700 group-hover:bg-primary-50 dark:group-hover:bg-primary-900/30 group-hover:text-primary-600'
        }`}>
            <span className="w-6 h-6 block">{icon}</span>
        </div>
        <span className={`text-sm font-black uppercase tracking-widest ${active ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
            {label}
        </span>
        <span className={`text-[10px] font-medium mt-1 ${active ? 'text-primary-100' : 'text-gray-400'}`}>
            {description}
        </span>
    </button>
);

const OrdersDashboardSummary: React.FC = () => {
    const { orders, events } = useData();
    const { effectiveUserId } = useAuth();

    const myOrders = useMemo(() => orders.filter(o => o.user_id === effectiveUserId), [orders, effectiveUserId]);
    const activeEventsCount = useMemo(() => {
        const now = new Date();
        return events.filter(e => e.status === 'Activo' && new Date(e.start_date) <= now && new Date(e.end_date) >= now).length;
    }, [events]);
    
    const processedOrders = useMemo(() => myOrders.filter(o => o.status === 'Procesado').length, [myOrders]);
    const pendingOrders = useMemo(() => myOrders.filter(o => o.status === 'Enviado' || o.status === 'Borrador').length, [myOrders]);

    const stats = [
        { label: 'Eventos Abiertos', value: activeEventsCount, color: 'text-emerald-500', icon: <ShoppingCartIcon /> },
        { label: 'Pedidos Realizados', value: myOrders.length, color: 'text-blue-500', icon: <ClipboardDocumentListIcon /> },
        { label: 'En Proceso', value: pendingOrders, color: 'text-amber-500', icon: <HistoryIcon /> },
        { label: 'Entregados', value: processedOrders, color: 'text-purple-500', icon: <HistoryIcon /> }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat, idx) => (
                <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                >
                    <Card className="flex items-center space-x-4 p-6 border-0 shadow-sm bg-white dark:bg-gray-800">
                        <div className={`p-4 rounded-2xl bg-gray-50 dark:bg-slate-900 ${stat.color}`}>
                            <span className="w-8 h-8 block">{stat.icon}</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">{stat.label}</p>
                            <p className={`text-2xl font-black tracking-tighter ${stat.color}`}>{stat.value}</p>
                        </div>
                    </Card>
                </motion.div>
            ))}
        </div>
    );
};

export const OrdersUnifiedDashboard: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    
    const currentTab = useMemo(() => {
        const path = location.pathname;
        if (path.includes('portal')) return 'portal';
        if (path.includes('history')) return 'history';
        return 'portal';
    }, [location]);

    const tabs = [
        { id: 'portal', label: 'Realizar Pedido', icon: <ClipboardDocumentListIcon />, description: 'Eventos y solicitudes abiertas', path: '/teacher/orders-management/portal' },
        { id: 'history', label: 'Mi Historial', icon: <HistoryIcon />, description: 'Seguimiento de tus pedidos', path: '/teacher/orders-management/history' },
    ];

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <header className="mb-8">
                <h1 className="text-4xl font-black tracking-tighter text-gray-900 dark:text-white mb-2">
                    Gestión de <span className="text-primary-600">Pedidos</span>
                </h1>
                <p className="text-gray-500 font-medium">Realiza tus solicitudes de materia prima y consulta el historial de entregas.</p>
            </header>

            <OrdersDashboardSummary />

            {/* Navigation Tabs */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                {tabs.map((tab) => (
                    <TabButton
                        key={tab.id}
                        active={currentTab === tab.id}
                        onClick={() => navigate(tab.path)}
                        icon={tab.icon}
                        label={tab.label}
                        description={tab.description}
                    />
                ))}
            </div>

            {/* Content Area */}
            <div className="relative">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentTab}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="min-h-[400px]"
                    >
                        <Routes>
                            <Route path="portal" element={<OrderPortal hideTitle={true} />} />
                            <Route path="portal/new/:eventId" element={<OrderForm />} />
                            <Route path="portal/edit/:orderId" element={<OrderForm />} />
                            <Route path="portal/transfers" element={<TransferPortal />} />
                            <Route path="history" element={<TeacherOrderHistory hideTitle={true} />} />
                            <Route path="*" element={<Navigate to="portal" replace />} />
                        </Routes>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};
