import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/Card';
import { PlusIcon, TrashIcon, PencilIcon, CheckIcon, XMarkIcon } from '../../components/icons';
import { WorkspaceSettings } from '../../types';

export const ProductMetadataManager: React.FC = () => {
    const { workspaceSettings, setWorkspaceSettings, products } = useData();
    const { currentUser } = useAuth();
    
    // Local state for adding new items
    const [newFamily, setNewFamily] = useState('');
    const [newCategory, setNewCategory] = useState('');
    const [newCondition, setNewCondition] = useState('');

    // State for editing items
    const [editingItem, setEditingItem] = useState<{ type: 'family' | 'category'| 'condition', originalValue: string, newValue: string } | null>(null);

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

    const handleEditSave = async () => {
        if (!editingItem || !workspaceSettings) return;

        const { type, originalValue, newValue } = editingItem;
        const trimmedNewValue = type === 'condition' ? newValue.trim() : newValue.trim().toUpperCase();

        if (!trimmedNewValue || trimmedNewValue === originalValue) {
            setEditingItem(null);
            return;
        }

        let key: keyof WorkspaceSettings;
        let currentList: string[] = [];

        if (type === 'family') {
            key = 'families';
            currentList = families;
        } else if (type === 'category') {
            key = 'categories';
            currentList = categories;
        } else {
            key = 'product_conditions';
            currentList = conditions;
        }

        // Check if new value already exists
        if (currentList.includes(trimmedNewValue)) {
            alert('Este valor ya existe.');
            return;
        }

        const updatedList = currentList.map(item => item === originalValue ? trimmedNewValue : item);

        await setWorkspaceSettings({
            ...workspaceSettings,
            [key]: updatedList
        });

        setEditingItem(null);
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
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd(type)}
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
                    list.sort().map(item => {
                        const isEditing = editingItem?.type === type && editingItem?.originalValue === item;

                        return (
                            <div key={item} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded border border-gray-100 dark:border-gray-700">
                                {isEditing ? (
                                    <div className="flex flex-1 space-x-2 items-center">
                                        <input
                                            autoFocus
                                            type="text"
                                            value={editingItem.newValue}
                                            onChange={e => setEditingItem({ ...editingItem, newValue: e.target.value })}
                                            className="flex-1 p-1 text-sm border rounded dark:bg-gray-700"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleEditSave();
                                                if (e.key === 'Escape') setEditingItem(null);
                                            }}
                                        />
                                        <button onClick={handleEditSave} className="text-green-600 hover:text-green-800">
                                            <CheckIcon className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => setEditingItem(null)} className="text-gray-500 hover:text-gray-700">
                                            <XMarkIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <span className="text-sm">{item}</span>
                                        <div className="flex items-center space-x-1">
                                            <button
                                                onClick={() => setEditingItem({ type, originalValue: item, newValue: item })}
                                                className="text-primary-600 hover:text-primary-800 p-1"
                                                title="Editar"
                                            >
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleRemove(type, item)}
                                                className="text-red-500 hover:text-red-700 p-1"
                                                title="Eliminar"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })
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
