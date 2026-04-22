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

    const [restoreMode, setRestoreMode] = useState<string>('full'); 

    const handleRestore = () => {
        if (!backupFile) return;
        
        const message = restoreMode === 'full' 
            ? `¿Estás seguro de que quieres restaurar TODOS los datos desde "${backupFile.name}"? Esta acción sobrescribirá todos los datos actuales.`
            : `¿Estás seguro de que quieres restaurar la colección "${restoreMode}" desde "${backupFile.name}"? Esta acción sobrescribirá los datos actuales de esta colección.`;

        if (window.confirm(message)) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const text = e.target?.result;
                    if (typeof text !== 'string') throw new Error("File is not readable");
                    const restoredData = JSON.parse(text);
                    
                    setIsRestoring(true);
                    
                    setTimeout(() => {
                        if (restoreMode === 'full') {
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
                        } else {
                            // Partial restore logic
                            const setters: Record<string, Function> = {
                                'Usuarios': data.setUsers,
                                'Productos': data.setProducts,
                                'Proveedores': data.setSuppliers,
                                'Pedidos': data.setOrders,
                                'Recetas': data.setRecipes,
                                'Eventos': data.setEvents,
                                'Incidentes': data.setIncidents,
                                'Ciclos': data.setTrainingCycles,
                                'Ciclos(Módulos)': data.setModules,
                                'Grupos': data.setGroups,
                                'Asignaciones': data.setAssignments,
                                'Ventas': data.setSales,
                                'MiniEconomato': data.setMiniEconomatoStock,
                                'Mensajes': data.setMessages,
                                'Aulas': data.setClassrooms,
                                'Aula(Productos)': data.setClassroomProducts,
                                'Aula(Proveedores)': data.setClassroomSuppliers,
                                'Aula(Eventos)': data.setClassroomEvents,
                                'Aula(Pedidos)': data.setClassroomOrders,
                                'Servicios(Grupos)': data.setServiceGroups,
                                'Servicios': data.setServices,
                                'Comedor(Servicios)': data.setDiningServices,
                                'Comedor(Reservas)': data.setDiningReservations,
                                'RecepciónStock': data.setStockReceptions,
                                'ItemsVenta': data.setSaleItems,
                                'Reservas': data.setReservations
                            };
                            
                            if (setters[restoreMode]) {
                                setters[restoreMode](restoredData);
                            } else {
                                console.error('No se encontró el setter para:', restoreMode);
                            }
                        }
                        
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

    const exportCollection = (name: string, collection: any[], format: 'csv' | 'json' = 'json') => {
        if (collection.length === 0) {
            alert(`No hay datos en ${name} para exportar.`);
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

    const collectionsList = [
        { name: 'Usuarios', data: data.users },
        { name: 'Productos', data: data.products },
        { name: 'Proveedores', data: data.suppliers },
        { name: 'Pedidos', data: data.orders },
        { name: 'Recetas', data: data.recipes },
        { name: 'Eventos', data: data.events },
        { name: 'Incidentes', data: data.incidents },
        { name: 'Ciclos', data: data.training_cycles },
        { name: 'Ciclos(Módulos)', data: data.modules },
        { name: 'Grupos', data: data.groups },
        { name: 'Asignaciones', data: data.assignments },
        { name: 'Ventas', data: data.sales },
        { name: 'MiniEconomato', data: data.mini_economato_stock },
        { name: 'Mensajes', data: data.messages },
        { name: 'Aulas', data: data.classrooms },
        { name: 'Aula(Productos)', data: data.classroom_products },
        { name: 'Aula(Proveedores)', data: data.classroom_suppliers },
        { name: 'Aula(Eventos)', data: data.classroom_events },
        { name: 'Aula(Pedidos)', data: data.classroom_orders },
        { name: 'Servicios(Grupos)', data: data.service_groups },
        { name: 'Servicios', data: data.services },
        { name: 'Comedor(Servicios)', data: data.dining_services },
        { name: 'Comedor(Reservas)', data: data.dining_reservations },
        { name: 'RecepciónStock', data: data.stock_receptions },
        { name: 'ItemsVenta', data: data.sale_items },
        { name: 'Reservas', data: data.reservations }
    ];

    return (
        <div className="p-6">
            {isRestoring && <RestoringOverlay />}
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6">Soporte y Mantenimiento</h1>
            
            <div className="grid grid-cols-1 gap-6">
                <Card title="Gestión de Datos">
                    <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
                        Exporta colecciones individuales en formato JSON. Para copias completas, utiliza el botón de exportación masiva.
                    </p>

                    <div className="flex gap-4 mb-6">
                        <button 
                            onClick={handleBackup} 
                            disabled={loading}
                            className="flex items-center justify-center bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                        >
                            <DownloadIcon className="w-5 h-5 mr-2" /> Exportar TODO (JSON Maestro)
                        </button>
                        
                        <div className="flex-1" />

                        <div className="pt-0 flex gap-2">
                            <select 
                                value={restoreMode} 
                                onChange={(e) => setRestoreMode(e.target.value)}
                                className="p-2 bg-white dark:bg-gray-800 border rounded-md text-sm"
                            >
                                <option value="full">Restaurar TODO</option>
                                {collectionsList.map(col => (
                                    <option key={col.name} value={col.name}>Restaurar: {col.name}</option>
                                ))}
                            </select>
                            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".json" className="hidden" />
                            <button onClick={triggerFileUpload} className="flex items-center justify-center bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700">
                                <UploadIcon className="w-5 h-5 mr-2" /> Seleccionar JSON
                            </button>
                        </div>
                    </div>
                    
                    {backupFile && (
                        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800 rounded-md text-center space-y-3">
                            <p className="text-sm text-yellow-800 dark:text-yellow-300">Archivo seleccionado: <span className="font-bold">{backupFile.name}</span></p>
                            <button onClick={handleRestore} className="bg-yellow-500 text-white py-2 px-4 rounded-md hover:bg-yellow-600 font-bold">
                                Confirmar Restauración: {restoreMode === 'full' ? 'TOTAL' : restoreMode}
                            </button>
                        </div>
                    )}

                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Exportar Colecciones Individuales (JSON)</h4>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
                        {collectionsList.map(col => (
                            <button 
                                key={col.name}
                                onClick={() => exportCollection(col.name, col.data, 'json')} 
                                className="flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-2 px-3 rounded text-xs hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                <DownloadIcon className="w-3 h-3 mr-1" /> {col.name}
                            </button>
                        ))}
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
