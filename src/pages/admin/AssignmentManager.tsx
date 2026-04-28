import React, { useMemo, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../../components/Card';
import { Assignment, Profile, TrainingCycle, Module, Group, SUPER_USER_EMAILS } from '../../types';
import { AssignmentIcon, PlusIcon, TrashIcon, PencilIcon, DownloadIcon } from '../../components/icons';
import { Modal } from '../../components/Modal';
import { printPage } from '../../utils/export';

type EditTarget = { type: 'cycle'; item: TrainingCycle } | { type: 'module'; item: Module } | { type: 'group'; item: Group } | null;

export const AssignmentManager: React.FC = () => {
    const { 
        assignments, setAssignments, users, 
        groups, setGroups, modules, setModules, training_cycles, setTrainingCycles 
    } = useData();
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<EditTarget>(null);
    const [newCycle, setNewCycle] = useState<Partial<TrainingCycle> | null>(null);
    const [newModule, setNewModule] = useState<Partial<Module> | null>(null);
    const [newGroup, setNewGroup] = useState<Partial<Group> | null>(null);

    const teachers = useMemo(() => users.filter(u => u.profiles.includes(Profile.TEACHER) && !SUPER_USER_EMAILS.includes(u.email)), [users]);

    // Map: group_id | module_id -> user_id
    const assignmentsMap = useMemo(() => {
        const map = new Map<string, string>();
        assignments.forEach(a => map.set(`${a.group_id}|${a.module_id}`, a.user_id));
        return map;
    }, [assignments]);

    const handleAssignmentChange = (group_id: string, module_id: string, user_id: string) => {
        const existingAssignment = assignments.find(a => a.group_id === group_id && a.module_id === module_id);
        
        if (user_id === "") { // Unassigning
            if (existingAssignment) {
                setAssignments(assignments.filter(a => !(a.group_id === group_id && a.module_id === module_id)));
            }
        } else { // Assigning or changing
            if (existingAssignment) {
                setAssignments(assignments.map(a => (a.group_id === group_id && a.module_id === module_id) ? { ...a, user_id } : a));
            } else {
                setAssignments([...assignments, { 
                    id: `asg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, 
                    group_id, 
                    module_id, 
                    user_id,
                    allow_transfers: false
                }]);
            }
        }
    };
    
    const toggleGroupModule = (group_id: string, module_id: string) => {
        setGroups(groups.map(g => {
            if (g.id === group_id) {
                const module_ids = g.module_ids || [];
                const updatedModules = module_ids.includes(module_id)
                    ? module_ids.filter(id => id !== module_id)
                    : [...module_ids, module_id];
                return { ...g, module_ids: updatedModules };
            }
            return g;
        }));
        // Remove assignment if module is removed
        const group = groups.find(g => g.id === group_id);
        if (group && (group.module_ids || []).includes(module_id)) {
            setAssignments(assignments.filter(a => !(a.group_id === group_id && a.module_id === module_id)));
        }
    };
    
    const openModalForNew = (type: 'cycle' | 'module' | 'group', parentId?: string) => {
        if (type === 'cycle') setNewCycle({});
        if (type === 'module') setNewModule({ cycle_id: parentId });
        if (type === 'group') setNewGroup({ cycle_id: parentId });
        setIsModalOpen(true);
    };
    
    const openModalForEdit = (item: TrainingCycle | Module | Group, type: 'cycle' | 'module' | 'group') => {
        setEditTarget({ item, type } as EditTarget);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditTarget(null);
        setNewCycle(null);
        setNewModule(null);
        setNewGroup(null);
    };
    
    const handleSave = (name: string) => {
        if (editTarget) { // Editing
            if(editTarget.type === 'cycle') setTrainingCycles(training_cycles.map(c => c.id === editTarget.item.id ? {...c, name} : c));
            if(editTarget.type === 'module') setModules(modules.map(m => m.id === editTarget.item.id ? {...m, name} : m));
            if(editTarget.type === 'group') setGroups(groups.map(g => g.id === editTarget.item.id ? {...g, name} : g));
        } else { // Creating
            if(newCycle) setTrainingCycles([...training_cycles, {id: `cycle-${Date.now()}`, name}]);
            if(newModule) setModules([...modules, {id: `mod-${Date.now()}`, name, cycle_id: newModule.cycle_id!}]);
            if(newGroup) setGroups([...groups, {id: `grp-${Date.now()}`, name, cycle_id: newGroup.cycle_id!, module_ids: []}]);
        }
        handleCloseModal();
    };

    // ... (rest of functions) ...
    const [deleteTarget, setDeleteTarget] = useState<{ item: TrainingCycle | Module | Group, type: 'cycle' | 'module' | 'group' } | null>(null);

    const handleDeleteConfirmation = () => {
        if (deleteTarget) {
            handleDelete(deleteTarget.item, deleteTarget.type);
            setDeleteTarget(null);
        }
    };

    const handleDelete = (item: TrainingCycle | Module | Group, type: 'cycle' | 'module' | 'group') => {
        if (type === 'cycle') {
            const moduleIdsToDelete = modules.filter(m => m.cycle_id === item.id).map(m => m.id);
            const groupIdsToDelete = groups.filter(g => g.cycle_id === item.id).map(g => g.id);
            setModules(modules.filter(m => m.cycle_id !== item.id));
            setGroups(groups.filter(g => g.cycle_id !== item.id));
            setAssignments(assignments.filter(a => !groupIdsToDelete.includes(a.group_id) && !moduleIdsToDelete.includes(a.module_id)));
            setTrainingCycles(training_cycles.filter(c => c.id !== item.id));
        }
        if (type === 'module') {
            setAssignments(assignments.filter(a => a.module_id !== item.id));
            setModules(modules.filter(m => m.id !== item.id));
        }
        if (type === 'group') {
            setAssignments(assignments.filter(a => a.group_id !== item.id));
            setGroups(groups.filter(g => g.id !== item.id));
        }
    };
    
    return (
        <div>
            {/* ... (as existing) ... */}

            {/* Confirmation Modal */}
            {deleteTarget && (
                <Modal isOpen={true} onClose={() => setDeleteTarget(null)} title="Confirmar eliminación">
                    <p>¿Seguro que quieres eliminar "{deleteTarget.item.name}"? Esta acción no se puede deshacer.</p>
                    <div className="flex justify-end gap-2 mt-4">
                        <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 border rounded">Cancelar</button>
                        <button onClick={handleDeleteConfirmation} className="px-4 py-2 bg-red-600 text-white rounded">Eliminar</button>
                    </div>
                </Modal>
            )}

            {/* ... (rest of UI, update the modules rendering to include the trash icon) ... */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Asignaciones: Profesor - Grupo</h1>
                <div className="no-print flex items-center space-x-2">
                    <button onClick={printPage} className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 flex items-center">
                        <DownloadIcon className="w-5 h-5 mr-1" /> Descargar PDF
                    </button>
                    <button onClick={() => openModalForNew('cycle')} className="bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 flex items-center">
                        <PlusIcon className="w-5 h-5 mr-1" /> Añadir Ciclo
                    </button>
                </div>
            </div>

            <div className="space-y-12">
                {training_cycles.map(cycle => (
                    <div key={cycle.id}>
                        <div className="flex items-center justify-between border-b-2 border-primary-500 pb-2 mb-6">
                            <h2 className="text-2xl font-bold text-primary-700 dark:text-primary-400">{cycle.name}</h2>
                            <div className="flex space-x-4">
                                <button onClick={() => openModalForNew('module', cycle.id)} className="text-sm bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 py-1 px-3 rounded-md hover:bg-blue-200 transition-colors">
                                    + Módulo
                                </button>
                                <button onClick={() => openModalForNew('group', cycle.id)} className="text-sm bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 py-1 px-3 rounded-md hover:bg-green-200 transition-colors">
                                    + Grupo
                                </button>
                                <div className="no-print border-l pl-4 flex space-x-1">
                                    <button onClick={() => openModalForEdit(cycle, 'cycle')} className="p-1 text-gray-500 hover:text-blue-600"><PencilIcon className="w-5 h-5"/></button>
                                    <button onClick={() => setDeleteTarget({item: cycle, type: 'cycle'})} className="p-1 text-gray-500 hover:text-red-600"><TrashIcon className="w-5 h-5"/></button>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            {groups.filter(g => g.cycle_id === cycle.id).map(group => (
                                <Card key={group.id} title={
                                    <div className="flex justify-between items-center w-full">
                                        <span className="text-xl font-bold">{group.name}</span>
                                        <div className="no-print">
                                            <button onClick={() => openModalForEdit(group, 'group')} className="p-1 text-gray-500 hover:text-blue-600"><PencilIcon className="w-4 h-4"/></button>
                                            <button onClick={() => setDeleteTarget({item: group, type: 'group'})} className="p-1 text-gray-500 hover:text-red-600"><TrashIcon className="w-4 h-4"/></button>
                                        </div>
                                    </div>
                                }>
                                    <div className="space-y-1">
                                        {modules.filter(m => m.cycle_id === cycle.id).map((module, mIdx) => {
                                            const isSelected = (group.module_ids || []).includes(module.id);
                                            return (
                                                <div key={module.id} className={`flex items-center justify-between p-3 rounded-lg ${mIdx % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800/50' : 'bg-white dark:bg-gray-800'} ${!isSelected ? 'opacity-60' : ''}`}>
                                                    <div className="flex-1 flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={isSelected}
                                                                onChange={() => toggleGroupModule(group.id, module.id)}
                                                                className="no-print"
                                                            />
                                                            <span className="font-medium text-gray-700 dark:text-gray-300">{module.name}</span>
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                            <button onClick={() => setDeleteTarget({item: module, type: 'module'})} className="p-1 text-gray-500 hover:text-red-600"><TrashIcon className="w-4 h-4"/></button>
                                                            {isSelected && (
                                                                <div className="flex items-center space-x-3">
                                                                    <div className="flex items-center">
                                                                        <select
                                                                            value={assignmentsMap.get(`${group.id}|${module.id}`) || ''}
                                                                            onChange={(e) => handleAssignmentChange(group.id, module.id, e.target.value)}
                                                                            className="text-sm p-1 border rounded-md dark:bg-gray-700 dark:border-gray-600 no-print min-w-[150px]"
                                                                        >
                                                                            <option value="">-- Sin Profesor --</option>
                                                                            {teachers.map(teacher => (
                                                                                <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                    
                                                                    <span className="print-only font-bold text-primary-600">
                                                                        {teachers.find(t => t.id === assignmentsMap.get(`${group.id}|${module.id}`))?.name || '-- Sin Profesor --'}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {modules.filter(m => m.cycle_id === cycle.id).length === 0 && (
                                            <p className="text-center py-4 text-gray-400 italic text-sm">No hay módulos creados para este ciclo.</p>
                                        )}
                                    </div>
                                </Card>
                            ))}
                            {groups.filter(g => g.cycle_id === cycle.id).length === 0 && (
                                <div className="col-span-full p-8 border-2 border-dashed rounded-xl text-center text-gray-400">
                                    No hay grupos creados para este ciclo. Pulsa "+ Grupo" arriba para añadir uno.
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {training_cycles.length === 0 && (
                    <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/20 rounded-3xl">
                        <p className="text-xl text-gray-500">No hay ciclos formativos configurados.</p>
                        <button onClick={() => openModalForNew('cycle')} className="mt-4 text-primary-600 font-bold hover:underline">
                            Crear el primer ciclo formativo
                        </button>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <ManagementModal
                    target={editTarget?.item.name || ''}
                    type={editTarget?.type || (newCycle ? 'cycle' : newModule ? 'module' : 'group')}
                    onClose={handleCloseModal}
                    onSave={handleSave}
                />
            )}
        </div>
    );
};

const ManagementModal: React.FC<{target: string; type: string; onClose: () => void; onSave: (name: string) => void;}> = ({ target, type, onClose, onSave }) => {
    const [name, setName] = useState(target);
    const title = `${target ? 'Editar' : 'Añadir'} ${type === 'cycle' ? 'Ciclo' : type === 'module' ? 'Módulo' : 'Grupo'}`;
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(name);
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={title}>
            <form onSubmit={handleSubmit}>
                <label>Nombre</label>
                <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full mt-1 p-2 border rounded-md dark:bg-gray-700"
                    required
                />
                <div className="flex justify-end mt-4 space-x-2">
                    <button type="button" onClick={onClose} className="bg-gray-200 px-4 py-2 rounded-md">Cancelar</button>
                    <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-md">Guardar</button>
                </div>
            </form>
        </Modal>
    );
};