import React from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../../components/Card';
import { UsersIcon, ProductIcon, SupplierIcon, EventIcon, DownloadIcon } from '../../components/icons';
import { Profile } from '../../types';
import { printPage } from '../../utils/export';

const StatCard: React.FC<{ title: string; icon: React.ReactNode; value: string | number; color: string }> = ({ title, icon, value, color }) => (
    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 flex items-center border-t-4 border-primary-500">
        <div className={`p-3 rounded-full ${color} mr-4`}>
            {icon}
        </div>
        <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">{value}</p>
        </div>
    </div>
);

export const AdminDashboard: React.FC = () => {
  const { users, products, suppliers, events } = useData();

  const teacherCount = users.filter(u => u.profiles.includes(Profile.TEACHER) && u.activity_status === 'Activo').length;
  const productCount = products.length;
  const supplierCount = suppliers.filter(s => s.status === 'Activo').length;
  const activeEventsCount = events.filter(e => new Date(e.end_date) > new Date()).length;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Panel de Administración</h1>
        <button onClick={printPage} className="no-print bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 flex items-center">
            <DownloadIcon className="w-5 h-5 mr-2" />
            Descargar PDF
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Profesores Activos" icon={<UsersIcon className="w-7 h-7 text-white"/>} value={teacherCount} color="bg-blue-500" />
        <StatCard title="Productos Totales" icon={<ProductIcon className="w-7 h-7 text-white"/>} value={productCount} color="bg-green-500" />
        <StatCard title="Proveedores Activos" icon={<SupplierIcon className="w-7 h-7 text-white"/>} value={supplierCount} color="bg-yellow-500" />
        <StatCard title="Eventos Activos" icon={<EventIcon className="w-7 h-7 text-white"/>} value={activeEventsCount} color="bg-purple-500" />
      </div>
      <div className="mt-8">
        <Card title="Bienvenido al Panel de Administración">
            <p>Desde aquí puedes gestionar todos los aspectos de la aplicación. Utiliza el menú de la izquierda para navegar por las diferentes secciones como la gestión de personal, el catálogo de productos o los eventos de pedido.</p>
        </Card>
      </div>
    </div>
  );
};