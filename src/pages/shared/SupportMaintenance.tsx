import React, { useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { Card } from '../../components/Card';
import { DownloadIcon, UploadIcon, BookIcon, ShieldCheckIcon } from '../../components/icons';
import { useCreator } from '../../contexts/CreatorContext';
import { Profile } from '../../types';
import { exportToCsv } from '../../utils/export';
import { auth } from '../../firebase';

const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => (
    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
        <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
    </div>
);

const RestoringOverlay: React.FC = () => {
    const [progress, setProgress] = useState(0);

    React.useEffect(() => {
        const timer = setTimeout(() => setProgress(100), 100);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-[100] flex flex-col justify-center items-center">
            <div className="w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded-lg text-center">
                <h2 className="text-2xl font-bold mb-4">Restaurando...</h2>
                <p className="mb-6 text-gray-600 dark:text-gray-400">Por favor, espera mientras se cargan los datos. La aplicación se recargará automáticamente.</p>
                <ProgressBar progress={progress} />
            </div>
        </div>
    );
};

export const SupportMaintenance: React.FC = () => {
    const { currentUser } = useAuth();
    const data = useData();
    const { creatorInfo } = useCreator();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isRestoring, setIsRestoring] = useState(false);
    const [backupFile, setBackupFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');

    // Permitir acceso si es Creador (o superusuario) o tiene el flag isMaintainer
    const canAccess = currentUser && (currentUser.profiles.includes(Profile.CREATOR) || currentUser.isMaintainer);

    if (!canAccess) {
        return <Navigate to="/blocked-access" replace />;
    }

    const handleBackup = async () => {
        setLoading(true);
        try {
            // Build the backup object from the data context
            const backupData = {
                users: data.users,
                products: data.products,
                suppliers: data.suppliers,
                events: data.events,
                orders: data.orders,
                incidents: data.incidents,
                training_cycles: data.training_cycles,
                modules: data.modules,
                groups: data.groups,
                assignments: data.assignments,
                recipes: data.recipes,
                sales: data.sales,
                mini_economato_stock: data.mini_economato_stock,
                messages: data.messages,
                classrooms: data.classrooms,
                classroom_products: data.classroom_products,
                classroom_suppliers: data.classroom_suppliers,
                classroom_events: data.classroom_events,
                classroom_orders: data.classroom_orders,
                service_groups: data.service_groups,
                services: data.services,
                dining_services: data.dining_services,
                dining_reservations: data.dining_reservations,
                stock_receptions: data.stock_receptions,
                sale_items: data.sale_items,
                reservations: data.reservations,
                backup_timestamp: new Date().toISOString()
            };
            
            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `manager-pro-backup-${new Date().toISOString()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error(error);
            alert('Error al generar la copia de seguridad');
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setBackupFile(file);
        }
        if (event.target) {
            event.target.value = '';
        }
    };

    const handleRestore = () => {
        if (!backupFile) return;
    
        if (window.confirm(`¿Estás seguro de que quieres restaurar desde el archivo "${backupFile.name}"? Esta acción sobrescribirá todos los datos actuales y recargará la aplicación.`)) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const text = e.target?.result;
                    if (typeof text !== 'string') throw new Error("File is not readable");
                    const restoredData = JSON.parse(text);
                    
                    setIsRestoring(true);
                    
                    setTimeout(() => {
                        data.setUsers(restoredData.users || []);
                        data.setProducts(restoredData.products || []);
                        data.setSuppliers(restoredData.suppliers || []);
                        data.setEvents(restoredData.events || []);
                        data.setOrders(restoredData.orders || []);
                        data.setIncidents(restoredData.incidents || []);
                        data.setTrainingCycles(restoredData.training_cycles || []);
                        data.setModules(restoredData.modules || []);
                        data.setGroups(restoredData.groups || []);
                        data.setAssignments(restoredData.assignments || []);
                        data.setRecipes(restoredData.recipes || []);
                        data.setSales(restoredData.sales || []);
                        data.setMiniEconomatoStock(restoredData.mini_economato_stock || []);
                        data.setMessages(restoredData.messages || []);
                        data.setClassrooms(restoredData.classrooms || []);
                        data.setClassroomProducts(restoredData.classroom_products || []);
                        data.setClassroomSuppliers(restoredData.classroom_suppliers || []);
                        data.setClassroomEvents(restoredData.classroom_events || []);
                        data.setClassroomOrders(restoredData.classroom_orders || []);
                        data.setServiceGroups(restoredData.service_groups || []);
                        data.setServices(restoredData.services || []);
                        data.setDiningServices(restoredData.dining_services || []);
                        data.setDiningReservations(restoredData.dining_reservations || []);
                        data.setStockReceptions(restoredData.stock_receptions || []);
                        data.setSaleItems(restoredData.sale_items || []);
                        data.setReservations(restoredData.reservations || []);
                        
                        setTimeout(() => {
                             alert("¡Datos restaurados con éxito! La aplicación se recargará.");
                             window.location.reload();
                        }, 2500);
                   }, 100);
                } catch (error) {
                    console.error("Error al analizar o restaurar", error);
                    alert("Error: Archivo de copia de seguridad no válido.");
                    setIsRestoring(false);
                }
            };
            reader.readAsText(backupFile);
        }
    };

    const triggerFileUpload = () => {
        fileInputRef.current?.click();
    };

    const exportCollection = (name: string, collection: any[], format: 'csv' | 'json' = 'csv') => {
        if (collection.length === 0) {
            alert(`No hay datos en la colección ${name} para exportar.`);
            return;
        }
        
        const fileName = `${name}_${new Date().toISOString().slice(0,10)}`;
        
        if (format === 'csv') {
            exportToCsv(`${fileName}.csv`, collection);
        } else {
            const blob = new Blob([JSON.stringify(collection, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${fileName}.json`;
            link.click();
            URL.revokeObjectURL(url);
        }
    };

    return (
        <div className="p-6">
            {isRestoring && <RestoringOverlay />}
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6">Soporte y Mantenimiento</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Copia de Seguridad y Restauración">
                    <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                        Descarga una copia completa de todos los datos o exporta tablas individuales.
                    </p>
                    <div className="space-y-4">
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                            <h3 className="font-bold text-blue-800 dark:text-blue-300 mb-2 flex items-center">
                                <ShieldCheckIcon className="w-5 h-5 mr-2" /> Copia Completa (JSON)
                            </h3>
                            <p className="text-xs text-blue-600 dark:text-blue-400 mb-3">
                                Recomendado para migraciones o restauraciones totales. Incluye: Usuarios, Productos, Proveedores, Pedidos, Recetas, Eventos, etc.
                            </p>
                            <button 
                                onClick={handleBackup} 
                                disabled={loading}
                                className="w-full flex items-center justify-center bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                <DownloadIcon className="w-5 h-5 mr-2" /> {loading ? 'Generando...' : 'Descargar JSON Maestro'}
                            </button>
                        </div>

                        <div className="flex items-center justify-between px-1">
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Tablas Individuales</h4>
                            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-md">
                                <button 
                                    onClick={() => setExportFormat('csv')}
                                    className={`px-3 py-1 text-xs rounded ${exportFormat === 'csv' ? 'bg-white dark:bg-gray-700 shadow-sm font-bold' : 'text-gray-500'}`}
                                >
                                    CSV
                                </button>
                                <button 
                                    onClick={() => setExportFormat('json')}
                                    className={`px-3 py-1 text-xs rounded ${exportFormat === 'json' ? 'bg-white dark:bg-gray-700 shadow-sm font-bold' : 'text-gray-500'}`}
                                >
                                    JSON
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => exportCollection('productos', data.products, exportFormat)} className="flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-2 px-3 rounded text-xs hover:bg-gray-200 dark:hover:bg-gray-600">
                                <DownloadIcon className="w-3 h-3 mr-1" /> Productos
                            </button>
                            <button onClick={() => exportCollection('proveedores', data.suppliers, exportFormat)} className="flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-2 px-3 rounded text-xs hover:bg-gray-200 dark:hover:bg-gray-600">
                                <DownloadIcon className="w-3 h-3 mr-1" /> Proveedores
                            </button>
                            <button onClick={() => exportCollection('profesores', data.users.filter(u => u.profiles.includes(Profile.TEACHER)), exportFormat)} className="flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-2 px-3 rounded text-xs hover:bg-gray-200 dark:hover:bg-gray-600">
                                <DownloadIcon className="w-3 h-3 mr-1" /> Profesores
                            </button>
                            <button onClick={() => exportCollection('pedidos', data.orders, exportFormat)} className="flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-2 px-3 rounded text-xs hover:bg-gray-200 dark:hover:bg-gray-600">
                                <DownloadIcon className="w-3 h-3 mr-1" /> Pedidos
                            </button>
                            <button onClick={() => exportCollection('recetas', data.recipes, exportFormat)} className="flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-2 px-3 rounded text-xs hover:bg-gray-200 dark:hover:bg-gray-600">
                                <DownloadIcon className="w-3 h-3 mr-1" /> Recetas
                            </button>
                            <button onClick={() => exportCollection('eventos', data.events, exportFormat)} className="flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-2 px-3 rounded text-xs hover:bg-gray-200 dark:hover:bg-gray-600">
                                <DownloadIcon className="w-3 h-3 mr-1" /> Eventos
                            </button>
                            <button onClick={() => exportCollection('incidentes', data.incidents, exportFormat)} className="flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-2 px-3 rounded text-xs hover:bg-gray-200 dark:hover:bg-gray-600">
                                <DownloadIcon className="w-3 h-3 mr-1" /> Incidentes
                            </button>
                            <button onClick={() => exportCollection('ciclos', data.training_cycles, exportFormat)} className="flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-2 px-3 rounded text-xs hover:bg-gray-200 dark:hover:bg-gray-600">
                                <DownloadIcon className="w-3 h-3 mr-1" /> Ciclos
                            </button>
                        </div>

                        <div className="pt-4 border-t dark:border-gray-700">
                            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".json" className="hidden" />
                            <button onClick={triggerFileUpload} className="w-full flex items-center justify-center bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700">
                                <UploadIcon className="w-5 h-5 mr-2" /> Restaurar desde JSON
                            </button>
                        </div>
                        
                        {backupFile && (
                            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800 rounded-md text-center space-y-3">
                                <p className="text-sm text-yellow-800 dark:text-yellow-300">Archivo: <span className="font-bold">{backupFile.name}</span></p>
                                <button onClick={handleRestore} className="w-full bg-yellow-500 text-white py-2 px-4 rounded-md hover:bg-yellow-600 font-bold">
                                    Confirmar Restauración Total
                                </button>
                            </div>
                        )}
                    </div>
                </Card>
                <Card title="Datos de la Aplicación, del Creador" icon={<BookIcon className="w-8 h-8"/>}>
                    <div className="space-y-4">
                        <div className="flex items-center space-x-4">
                            <img src={creatorInfo.logo} alt="Logo del Creador" className="h-16 w-16 rounded-full object-cover bg-gray-200"/>
                            <div>
                                <h3 className="text-lg font-bold">{creatorInfo.name}</h3>
                                <a href={creatorInfo.website} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                                    Contacto
                                </a>
                            </div>
                        </div>
                        <p className="text-sm text-gray-500 pt-4 border-t dark:border-gray-700">
                            {creatorInfo.copyright}
                        </p>
                        <p className="text-xs text-gray-400">
                            Esta información se gestiona desde el panel de Creador.
                        </p>
                    </div>
                </Card>
                <Card title="Propiedad Intelectual y Licencia" icon={<ShieldCheckIcon className="w-8 h-8" />} className="md:col-span-2">
                    <div className="space-y-4 text-sm">
                        <p><strong>Aplicación:</strong> {creatorInfo.app_name}</p>
                        <p><strong>Titular:</strong> {creatorInfo.name}</p>
                        <p><strong>Copyright:</strong> {creatorInfo.copyright}</p>
                        <div className="pt-4 border-t dark:border-gray-600">
                            <p className="font-semibold">Aviso Legal:</p>
                            <p className="text-xs text-gray-500 mt-1">
                                Este software, incluyendo su código fuente, diseño gráfico y contenido, es propiedad intelectual de {creatorInfo.name}.
                                Queda prohibida su reproducción, distribución, comunicación pública o transformación, total o parcial, sin la autorización expresa del titular. Todos los derechos reservados.
                            </p>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};
