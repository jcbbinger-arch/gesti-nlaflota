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

    const assignmentsMap = useMemo(() => {
        const map = new Map<string, string>(); // group_id -> user_id
        assignments.forEach(a => map.set(a.group_id, a.user_id));
        return map;
    }, [assignments]);

    const handleAssignmentChange = (group_id: string, user_id: string) => {
        const existingAssignment = assignments.find(a => a.group_id === group_id);
        if (user_id === "") { // Unassigning
            if (existingAssignment) setAssignments(assignments.filter(a => a.group_id !== group_id));
        } else { // Assigning or changing
            if (existingAssignment) {
                setAssignments(assignments.map(a => a.group_id === group_id ? { ...a, user_id } : a));
            } else {
                setAssignments([...assignments, { id: `asg-${Date.now()}`, group_id, user_id }]);
            }
        }
    };
    
    const openModalForNew = (type: 'cycle' | 'module' | 'group', parentId?: string) => {
        if (type === 'cycle') setNewCycle({});
        if (type === 'module') setNewModule({ cycle_id: parentId });
        if (type === 'group') setNewGroup({ module_id: parentId });
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
            if(newGroup) setGroups([...groups, {id: `grp-${Date.now()}`, name, module_id: newGroup.module_id!}]);
        }
        handleCloseModal();
    };

    const handleDelete = (item: TrainingCycle | Module | Group, type: 'cycle' | 'module' | 'group') => {
        if (!window.confirm(`¿Seguro que quieres eliminar "${item.name}"? Esto eliminará todos los elementos que contiene.`)) return;

        if (type === 'cycle') {
            const moduleIdsToDelete = modules.filter(m => m.cycle_id === item.id).map(m => m.id);
            const groupIdsToDelete = groups.filter(g => moduleIdsToDelete.includes(g.module_id)).map(g => g.id);
            setModules(modules.filter(m => m.cycle_id !== item.id));
            setGroups(groups.filter(g => !moduleIdsToDelete.includes(g.module_id)));
            setAssignments(assignments.filter(a => !groupIdsToDelete.includes(a.group_id)));
            setTrainingCycles(training_cycles.filter(c => c.id !== item.id));
        }
        if (type === 'module') {
            const groupIdsToDelete = groups.filter(g => g.module_id === item.id).map(g => g.id);
            setGroups(groups.filter(g => g.module_id !== item.id));
            setAssignments(assignments.filter(a => !groupIdsToDelete.includes(a.group_id)));
            setModules(modules.filter(m => m.id !== item.id));
        }
        if (type === 'group') {
            setAssignments(assignments.filter(a => a.group_id !== item.id));
            setGroups(groups.filter(g => g.id !== item.id));
        }
    };
    
    return (
        <div>
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

            <div className="space-y-6">
                {training_cycles.map(cycle => (
                    <Card key={cycle.id} title={
                        <div className="flex justify-between items-center w-full">
                           <span className="text-2xl">{cycle.name}</span>
                            <div className="no-print">
                                <button onClick={() => openModalForEdit(cycle, 'cycle')} className="p-1 text-gray-500 hover:text-blue-600"><PencilIcon className="w-5 h-5"/></button>
                                <button onClick={() => handleDelete(cycle, 'cycle')} className="p-1 text-gray-500 hover:text-red-600"><TrashIcon className="w-5 h-5"/></button>
                            </div>
                        </div>
                    }>
                        <div className="space-y-4 pl-4 border-l-2 border-gray-200 dark:border-gray-600">
                            {modules.filter(m => m.cycle_id === cycle.id).map(module => (
                                <div key={module.id}>
                                    <div className="flex justify-between items-center bg-gray-100 dark:bg-gray-700 p-2 rounded-t-md">
                                        <h4 className="font-semibold text-lg">{module.name}</h4>
                                        <div className="no-print">
                                            <button onClick={() => openModalForEdit(module, 'module')} className="p-1 text-gray-500 hover:text-blue-600"><PencilIcon className="w-5 h-5"/></button>
                                            <button onClick={() => handleDelete(module, 'module')} className="p-1 text-gray-500 hover:text-red-600"><TrashIcon className="w-5 h-5"/></button>
                                            <button onClick={() => openModalForNew('group', module.id)} className="p-1 text-gray-500 hover:text-green-600"><PlusIcon className="w-5 h-5"/></button>
                                        </div>
                                    </div>
                                    <table className="w-full">
                                        <tbody>
                                        {groups.filter(g => g.module_id === module.id).map((group, index) => (
                                            <tr key={group.id} className={`${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900'}`}>
                                                <td className="p-2 w-full">{group.name}</td>
                                                <td className="p-2">
                                                    <select
                                                        value={assignmentsMap.get(group.id) || ''}
                                                        onChange={(e) => handleAssignmentChange(group.id, e.target.value)}
                                                        className="p-1 border rounded-md dark:bg-gray-800 dark:border-gray-600 no-print"
                                                    >
                                                        <option value="">-- Sin Asignar --</option>
                                                        {teachers.map(teacher => (
                                                            <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                                                        ))}
                                                    </select>
                                                    <span className="print-only">{teachers.find(t => t.id === assignmentsMap.get(group.id))?.name || '-- Sin Asignar --'}</span>
                                                </td>
                                                <td className="p-2 flex no-print">
                                                     <button onClick={() => openModalForEdit(group, 'group')} className="p-1 text-gray-500 hover:text-blue-600"><PencilIcon className="w-4 h-4"/></button>
                                                     <button onClick={() => handleDelete(group, 'group')} className="p-1 text-gray-500 hover:text-red-600"><TrashIcon className="w-4 h-4"/></button>
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            ))}
                             <button onClick={() => openModalForNew('module', cycle.id)} className="mt-4 text-sm bg-gray-200 dark:bg-gray-700 py-1 px-3 rounded-md hover:bg-gray-300 no-print">
                                + Añadir Módulo
                            </button>
                        </div>
                    </Card>
                ))}
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