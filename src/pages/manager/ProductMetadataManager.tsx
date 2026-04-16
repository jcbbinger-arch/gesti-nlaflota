import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/Card';
import { PlusIcon, TrashIcon } from '../../components/icons';
import { WorkspaceSettings } from '../../types';

export const ProductMetadataManager: React.FC = () => {
    const { workspaceSettings, setWorkspaceSettings, products } = useData();
    const { currentUser } = useAuth();
    
    // Local state for adding new items
    const [newFamily, setNewFamily] = useState('');
    const [newCategory, setNewCategory] = useState('');
    const [newCondition, setNewCondition] = useState('');

    const families = useMemo(() => workspaceSettings?.families || [], [workspaceSettings]);
    const categories = useMemo(() => workspaceSettings?.categories || [], [workspaceSettings]);
    const conditions = useMemo(() => workspaceSettings?.product_conditions || [], [workspaceSettings]);

    const handleAdd = async (type: 'family' | 'category' | 'condition') => {
        let value = '';
        let currentList: string[] = [];
        let key: keyof WorkspaceSettings;

        if (type === 'family') {
            value = newFamily.trim().toUpperCase();
            currentList = families;
            key = 'families';
            setNewFamily('');
        } else if (type === 'category') {
            value = newCategory.trim().toUpperCase();
            currentList = categories;
            key = 'categories';
            setNewCategory('');
        } else {
            value = newCondition.trim();
            currentList = conditions;
            key = 'product_conditions';
            setNewCondition('');
        }

        if (value && !currentList.includes(value)) {
            const currentSettings: WorkspaceSettings = workspaceSettings || {
                workspaceId: currentUser?.workspaceId || '',
                families: [],
                categories: [],
                product_conditions: []
            };

            await setWorkspaceSettings({
                ...currentSettings,
                [key]: [...(currentSettings[key] as string[] || []), value]
            });
        }
    };

    const handleRemove = async (type: 'family' | 'category' | 'condition', value: string) => {
        if (!workspaceSettings) return;

        if (!window.confirm(`¿Estás seguro de que quieres eliminar "${value}"?`)) return;

        let currentList: string[] = [];
        let key: keyof typeof workspaceSettings;

        if (type === 'family') {
            currentList = families;
            key = 'families';
        } else if (type === 'category') {
            currentList = categories;
            key = 'categories';
        } else {
            currentList = conditions;
            key = 'product_conditions';
        }

        await setWorkspaceSettings({
            ...workspaceSettings,
            [key]: currentList.filter(item => item !== value)
        });
    };

    const renderSection = (title: string, list: string[], addNewValue: string, setAddNewValue: (v: string) => void, type: 'family' | 'category' | 'condition') => (
        <Card title={title} className="h-full">
            <div className="flex space-x-2 mb-4">
                <input
                    type="text"
                    value={addNewValue}
                    onChange={e => setAddNewValue(e.target.value)}
                    placeholder={`Nueva ${title.toLowerCase()}...`}
                    className="flex-1 p-2 border rounded-md dark:bg-gray-700"
                />
                <button
                    onClick={() => handleAdd(type)}
                    className="bg-primary-600 text-white p-2 rounded-md hover:bg-primary-700"
                >
                    <PlusIcon className="w-5 h-5" />
                </button>
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {list.length > 0 ? (
                    list.sort().map(item => (
                        <div key={item} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded border border-gray-100 dark:border-gray-700">
                            <span className="text-sm">{item}</span>
                            <button
                                onClick={() => handleRemove(type, item)}
                                className="text-red-500 hover:text-red-700 p-1"
                            >
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                    ))
                ) : (
                    <p className="text-gray-500 text-sm italic">No hay elementos creados.</p>
                )}
            </div>
        </Card>
    );

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Configuración de Tipologías de Producto</h1>
            <p className="text-gray-600 dark:text-gray-400">Administra las familias, categorías y condiciones que aparecerán al crear o editar productos.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {renderSection('Familias', families, newFamily, setNewFamily, 'family')}
                {renderSection('Categorías', categories, newCategory, setNewCategory, 'category')}
                {renderSection('Condiciones', conditions, newCondition, setNewCondition, 'condition')}
            </div>
        </div>
    );
};
