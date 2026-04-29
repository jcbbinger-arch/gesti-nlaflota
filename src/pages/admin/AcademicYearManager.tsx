import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../../components/Card';
import { AcademicYear } from '../../types';
import { Plus, Calendar, Lock, Unlock, Archive, CheckCircle2, AlertTriangle, Trash2 } from 'lucide-react';
import { Modal } from '../../components/Modal';

export const AcademicYearManager: React.FC = () => {
    const { academic_years, setAcademicYears, events, orders, reservations, dining_services, stock_receptions, sales, setEvents, setOrders, setReservations, setDiningServices, setStockReceptions, setSales } = useData();
    const [isYearModalOpen, setIsYearModalOpen] = useState(false);
    const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
    const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
    const [yearToClose, setYearToClose] = useState<AcademicYear | null>(null);

    const activeYear = useMemo(() => academic_years.find(y => y.is_active), [academic_years]);

    const handleSaveYear = (year: Partial<AcademicYear>) => {
        if (editingYear) {
            setAcademicYears(prev => prev.map(y => y.id === editingYear.id ? { ...y, ...year } : y));
        } else {
            const newYear: AcademicYear = {
                id: `year-${Date.now()}`,
                name: year.name || '',
                start_date: year.start_date || '',
                end_date: year.end_date || '',
                is_active: academic_years.length === 0, // First year is active by default
                ...year
            } as AcademicYear;
            setAcademicYears(prev => [...prev, newYear]);
        }
        setIsYearModalOpen(false);
        setEditingYear(null);
    };

    const handleSetActive = (id: string) => {
        setAcademicYears(prev => prev.map(y => ({
            ...y,
            is_active: y.id === id
        })));
    };

    const handleDeleteYear = (id: string) => {
        if (window.confirm('¿Estás seguro de eliminar este curso? Esta acción no se recomienda si hay datos asociados.')) {
            setAcademicYears(prev => prev.filter(y => y.id !== id));
        }
    };

    const handleCloseCourse = async () => {
        if (!yearToClose) return;

        // 1. Mark as inactive and "archived" (implicitly by being a past year)
        setAcademicYears(prev => prev.map(y => y.id === yearToClose.id ? { ...y, is_active: false } : y));
        
        // 2. Here we could perform cleanup if needed, but the filtering logic in DataContext 
        // already handles "archiving" by only showing the active year by default.
        
        setIsCloseModalOpen(false);
        setYearToClose(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Gestión de Cursos Académicos</h1>
                    <p className="text-gray-500 text-sm italic">Configura y archiva los periodos lectivos para mantener el histórico.</p>
                </div>
                <button 
                    onClick={() => { setEditingYear(null); setIsYearModalOpen(true); }}
                    className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
                >
                    <Plus className="w-5 h-5" />
                    <span>Nuevo Curso</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                <tr>
                                    <th className="px-6 py-3">Nombre del Curso</th>
                                    <th className="px-6 py-3">Periodo</th>
                                    <th className="px-6 py-3">Estado</th>
                                    <th className="px-6 py-3 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {academic_years.sort((a, b) => b.start_date.localeCompare(a.start_date)).map(year => (
                                    <tr key={year.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                        <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                                            {year.name}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">
                                            {new Date(year.start_date).toLocaleDateString()} - {new Date(year.end_date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            {year.is_active ? (
                                                <span className="flex items-center text-green-600 font-black text-[10px] uppercase tracking-widest bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full border border-green-100">
                                                    <CheckCircle2 className="w-3 h-3 mr-1" /> Activo
                                                </span>
                                            ) : (
                                                <span className="flex items-center text-gray-400 font-bold text-[10px] uppercase tracking-widest bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-full border border-gray-100">
                                                    <Lock className="w-3 h-3 mr-1" /> Archivado
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            {!year.is_active && (
                                                <button 
                                                    onClick={() => handleSetActive(year.id)}
                                                    className="text-blue-600 hover:underline text-xs font-bold"
                                                    title="Reactivar este curso"
                                                >
                                                    Reactivar
                                                </button>
                                            )}
                                            {year.is_active && (
                                                <button 
                                                    onClick={() => { setYearToClose(year); setIsCloseModalOpen(true); }}
                                                    className="text-amber-600 hover:underline text-xs font-bold"
                                                >
                                                    Cerrar Curso
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => { setEditingYear(year); setIsYearModalOpen(true); }}
                                                className="text-gray-400 hover:text-primary-600"
                                            >
                                                <Plus className="w-4 h-4" /> {/* Use Plus as edit placeholder if needed or Pencil */}
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteYear(year.id)}
                                                className="text-gray-400 hover:text-red-600"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {academic_years.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-10 text-center text-gray-400">
                                            No hay cursos configurados. Comienza creando el curso actual.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <div className="space-y-6">
                    <Card title="Estado del Archivo" icon={<Archive className="text-indigo-600" />}>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Curso Actual:</span>
                                <span className="font-bold text-primary-600">{activeYear?.name || 'Ninguno'}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Cursos Archivados:</span>
                                <span className="font-bold">{academic_years.filter(y => !y.is_active).length}</span>
                            </div>
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                                <div className="flex space-x-2">
                                    <AlertTriangle className="w-5 h-5 text-blue-600 shrink-0" />
                                    <p className="text-[11px] text-blue-800 dark:text-blue-300 italic">
                                        Los datos archivados se mantienen en la base de datos permitiendo su consulta mediante el selector de año en la barra superior. Los datos se conservarán durante 5 años conforme a la normativa.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card title="Próximos Pasos" icon={<Calendar className="text-amber-600" />}>
                        <div className="text-xs text-gray-500 space-y-2">
                            <p> Al iniciar un nuevo curso:</p>
                            <ul className="list-disc pl-4 space-y-1">
                                <li>Los servicios regulares pueden ser replicados.</li>
                                <li>Los pedidos comenzarán con numeración limpia para el nuevo año.</li>
                                <li>El stock del economato se mantiene (es inventario vivo).</li>
                            </ul>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Modal for adding/editing year */}
            <Modal 
                isOpen={isYearModalOpen} 
                onClose={() => setIsYearModalOpen(false)} 
                title={editingYear ? "Editar Curso" : "Configurar Nuevo Curso"}
            >
                <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    handleSaveYear({
                        name: formData.get('name') as string,
                        start_date: formData.get('start_date') as string,
                        end_date: formData.get('end_date') as string,
                    });
                }} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Nombre del Curso</label>
                        <input name="name" defaultValue={editingYear?.name} placeholder="p.ej. Curso 2025/26" required className="w-full p-2 border rounded dark:bg-gray-700" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Fecha Inicio</label>
                            <input name="start_date" type="date" defaultValue={editingYear?.start_date} required className="w-full p-2 border rounded dark:bg-gray-700" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Fecha Fin</label>
                            <input name="end_date" type="date" defaultValue={editingYear?.end_date} required className="w-full p-2 border rounded dark:bg-gray-700" />
                        </div>
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                        <button type="button" onClick={() => setIsYearModalOpen(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">Guardar Curso</button>
                    </div>
                </form>
            </Modal>

            {/* Modal for closing course */}
            <Modal 
                isOpen={isCloseModalOpen} 
                onClose={() => setIsCloseModalOpen(false)} 
                title="Cierre de Curso Académico"
            >
                <div className="space-y-4">
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200">
                        <div className="flex space-x-3">
                            <AlertTriangle className="w-6 h-6 text-amber-600" />
                            <div>
                                <h3 className="font-bold text-amber-800 dark:text-amber-300">¿Estás seguro de cerrar el curso {yearToClose?.name}?</h3>
                                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                                    Al cerrar el curso, todos los registros (pedidos, ventas, servicios) pasarán al histórico. Podrás seguirlos consultando pero no editarlos por defecto.
                                </p>
                            </div>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 italic">
                        El stock actual de productos y el saldo de profesores NO se borran, ya que son inventarios continuos.
                    </p>
                    <div className="flex justify-end space-x-3 pt-4">
                        <button onClick={() => setIsCloseModalOpen(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">Cancelar</button>
                        <button onClick={handleCloseCourse} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center">
                            <Archive className="w-4 h-4 mr-2" /> Confirmar Cierre y Archivo
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
