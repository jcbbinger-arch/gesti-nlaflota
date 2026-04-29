import React, { useState } from 'react';
import { Modal } from './Modal';
import { useData } from '../contexts/DataContext';
import { User, DiningService, Profile } from '../types';
import { Users, Check, Search } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    diningService: DiningService;
}

export const FamilyMealAssignmentModal: React.FC<Props> = ({ isOpen, onClose, diningService }) => {
    const { users, setDiningServices, dining_services } = useData();
    const [searchTerm, setSearchTerm] = useState('');

    const teachers = users.filter(u => u.profiles.includes(Profile.TEACHER));
    
    const filteredTeachers = teachers.filter(t => 
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        t.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const assignedIds = (diningService as any).family_meal_authorized_teachers || [];

    const toggleAssignment = (userId: string) => {
        const newIds = assignedIds.includes(userId)
            ? (assignedIds as string[]).filter(id => id !== userId)
            : [...assignedIds, userId];
        
        setDiningServices(dining_services.map(ds => 
            ds.id === diningService.id 
                ? { ...ds, family_meal_authorized_teachers: newIds } 
                : ds
        ));
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Asignar Responsables - Comida Familia`}>
            <div className="space-y-4">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800">
                    <div className="flex space-x-2">
                        <Users className="w-5 h-5 text-indigo-600 shrink-0" />
                        <p className="text-[11px] text-indigo-800 dark:text-indigo-300 italic">
                            Los profesores asignados aquí verán un botón de "Pedido Comida Familia" en su panel personal para este servicio específico.
                        </p>
                    </div>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Buscar profesor..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-9 p-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    />
                </div>

                <div className="max-h-64 overflow-y-auto space-y-1 border rounded-lg p-2 dark:border-gray-700">
                    {filteredTeachers.map(teacher => {
                        const isAssigned = assignedIds.includes(teacher.id);
                        return (
                            <button
                                key={teacher.id}
                                onClick={() => toggleAssignment(teacher.id)}
                                className={`w-full flex items-center justify-between p-2 rounded-md transition-colors ${
                                    isAssigned 
                                        ? 'bg-indigo-600 text-white' 
                                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-left'
                                }`}
                            >
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold">{teacher.name}</span>
                                    <span className={`text-[10px] ${isAssigned ? 'text-indigo-100' : 'text-gray-500'}`}>{teacher.email}</span>
                                </div>
                                {isAssigned && <Check className="w-4 h-4" />}
                            </button>
                        );
                    })}
                    {filteredTeachers.length === 0 && (
                        <p className="text-center py-4 text-xs text-gray-500">No se encontraron profesores.</p>
                    )}
                </div>

                <div className="flex justify-end pt-2">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-bold shadow-sm"
                    >
                        Listo
                    </button>
                </div>
            </div>
        </Modal>
    );
};
