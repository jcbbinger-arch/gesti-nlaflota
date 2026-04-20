import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/Card';
import { Modal } from '../../components/Modal';
import { PlusIcon, TrashIcon, PencilIcon, CheckIcon, XMarkIcon } from '../../components/icons';
import { WorkspaceSettings } from '../../types';
import { PREDEFINED_FAMILIES, PREDEFINED_CATEGORIES, PRODUCT_STATES } from '../../constants/productTypology';

export const ProductMetadataManager: React.FC = () => {
    const { workspaceSettings, setWorkspaceSettings, products, setProducts } = useData();
    const { currentUser } = useAuth();
    
    // Local state for adding new items
    const [newFamily, setNewFamily] = useState('');
    const [newCategory, setNewCategory] = useState('');
    const [newCondition, setNewCondition] = useState('');

    const [editingItem, setEditingItem] = useState<{ type: 'family' | 'category' | 'condition', originalValue: string, newValue: string } | null>(null);
    const [deletingItem, setDeletingItem] = useState<{ type: 'family' | 'category'| 'condition', value: string, productsCount: number } | null>(null);
    const [migrationTarget, setMigrationTarget] = useState('');

    // Initial sync of predefined values to workspaceSettings if empty and permanent uppercase migration
    useEffect(() => {
        let needsUpdate = false;
        // Check if workspace settings is null, and create an empty shell if so
        const newSettings = workspaceSettings ? { ...workspaceSettings } : {
             workspaceId: currentUser?.workspaceId || 'default',
             families: [],
             categories: [],
             product_conditions: []
        };

        // Force uppercase on existing values for consistency
        if (newSettings.families && newSettings.families.length > 0) {
            const uppercased = newSettings.families.map(f => f.toUpperCase());
            if (JSON.stringify(uppercased) !== JSON.stringify(newSettings.families)) {
                newSettings.families = uppercased;
                needsUpdate = true;
            }
        }
        if (newSettings.categories && newSettings.categories.length > 0) {
            const uppercased = newSettings.categories.map(c => c.toUpperCase());
            if (JSON.stringify(uppercased) !== JSON.stringify(newSettings.categories)) {
                newSettings.categories = uppercased;
                needsUpdate = true;
            }
        }
        if (newSettings.product_conditions && newSettings.product_conditions.length > 0) {
            const uppercased = newSettings.product_conditions.map(pc => pc.toUpperCase());
            if (JSON.stringify(uppercased) !== JSON.stringify(newSettings.product_conditions)) {
                newSettings.product_conditions = uppercased;
                needsUpdate = true;
            }
        }

        // Add defaults if empty
        if (!newSettings.families || newSettings.families.length === 0) {
            newSettings.families = [...PREDEFINED_FAMILIES].map(f => f.toUpperCase());
            needsUpdate = true;
        }
        if (!newSettings.categories || newSettings.categories.length === 0) {
            newSettings.categories = [...PREDEFINED_CATEGORIES].map(c => c.toUpperCase());
            needsUpdate = true;
        }
        if (!newSettings.product_conditions || newSettings.product_conditions.length === 0) {
            newSettings.product_conditions = [...PRODUCT_STATES].map(s => s.toUpperCase());
            needsUpdate = true;
        }

        if (needsUpdate) {
            // Need to set the document in firebase if it didn't exist or was modified
            setWorkspaceSettings(newSettings as WorkspaceSettings);
        }
    }, [workspaceSettings, setWorkspaceSettings, currentUser?.workspaceId]);

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
            value = newCondition.trim().toUpperCase();
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
        const trimmedNewValue = newValue.trim().toUpperCase();

        if (!trimmedNewValue || trimmedNewValue === originalValue) {
            setEditingItem(null);
            return;
        }

        let key: keyof WorkspaceSettings;
        let currentList: string[] = [];
        let productKey: 'family' | 'category' | 'product_state';

        if (type === 'family') {
            key = 'families';
            currentList = families;
            productKey = 'family';
        } else if (type === 'category') {
            key = 'categories';
            currentList = categories;
            productKey = 'category';
        } else {
            key = 'product_conditions';
            currentList = conditions;
            productKey = 'product_state';
        }

        if (currentList.includes(trimmedNewValue)) {
            alert('Este valor ya existe.');
            return;
        }

        const updatedList = currentList.map(item => item === originalValue.toUpperCase() ? trimmedNewValue : item);

        await setWorkspaceSettings({
            ...workspaceSettings,
            [key]: updatedList
        });

        let changed = false;
        const updatedProducts = products.map(product => {
            if ((product[productKey] || '').toUpperCase() === originalValue.toUpperCase()) {
                changed = true;
                return { ...product, [productKey]: trimmedNewValue };
            }
            return product;
        });

        if (changed) {
            await setProducts(updatedProducts);
        }

        setEditingItem(null);
    };

    const handleRemove = async (type: 'family' | 'category' | 'condition', value: string) => {
        if (!workspaceSettings) return;

        const productKey = type === 'family' ? 'family' : (type === 'category' ? 'category' : 'product_state');
        const affectedProducts = products.filter(p => (p[productKey] || '').toUpperCase() === value.toUpperCase());

        if (affectedProducts.length > 0) {
            setDeletingItem({ type, value, productsCount: affectedProducts.length });
            return;
        }

        await executeDelete(type, value);
    };

    const executeDelete = async (type: 'family' | 'category' | 'condition', value: string, targetValue?: string) => {
        if (!workspaceSettings) return;

        let key: keyof WorkspaceSettings;
        let currentList: string[] = [];
        let productKey: 'family' | 'category' | 'product_state';

        if (type === 'family') {
            key = 'families';
            currentList = families;
            productKey = 'family';
        } else if (type === 'category') {
            key = 'categories';
            currentList = categories;
            productKey = 'category';
        } else {
            key = 'product_conditions';
            currentList = conditions;
            productKey = 'product_state';
        }

        await setWorkspaceSettings({
            ...workspaceSettings,
            [key]: currentList.filter(item => item.toUpperCase() !== value.toUpperCase())
        });

        if (targetValue) {
            const updatedProducts = products.map(product => {
                if ((product[productKey] || '').toUpperCase() === value.toUpperCase()) {
                    return { ...product, [productKey]: targetValue };
                }
                return product;
            });
            await setProducts(updatedProducts);
        } else {
            const updatedProducts = products.map(product => {
                if ((product[productKey] || '').toUpperCase() === value.toUpperCase()) {
                    return { ...product, [productKey]: '' };
                }
                return product;
            });
            await setProducts(updatedProducts);
        }

        setDeletingItem(null);
        setMigrationTarget('');
    };

    const handleLoadPredefined = async (type: 'family' | 'category' | 'condition') => {
        if (!workspaceSettings) return;
        
        let predefined: string[] = [];
        let key: keyof WorkspaceSettings;
        
        if (type === 'family') {
            predefined = PREDEFINED_FAMILIES;
            key = 'families';
        } else if (type === 'category') {
            predefined = PREDEFINED_CATEGORIES;
            key = 'categories';
        } else {
            predefined = PRODUCT_STATES;
            key = 'product_conditions';
        }

        const currentList = workspaceSettings[key] as string[] || [];
        const mergedList = [...new Set([...currentList, ...predefined])].sort();

        await setWorkspaceSettings({
            ...workspaceSettings,
            [key]: mergedList
        });
    };

    const renderSection = (title: string, list: string[], addNewValue: string, setAddNewValue: (v: string) => void, type: 'family' | 'category' | 'condition') => (
        <Card className="h-[600px] flex flex-col shadow-sm border-gray-200">
            <div className="p-4 border-b dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{title}</h3>
                    <button 
                        onClick={() => handleLoadPredefined(type)}
                        className="text-[10px] uppercase font-bold text-primary-600 hover:text-primary-700 bg-primary-50 dark:bg-primary-900/20 px-2 py-1 rounded"
                        title="Cargar valores predefinidos"
                    >
                        Cargar Predef.
                    </button>
                </div>
                <div className="flex space-x-2">
                    <input
                        type="text"
                        value={addNewValue}
                        onChange={e => setAddNewValue(e.target.value)}
                        placeholder={`NUEVA ${title.toUpperCase()}...`}
                        className="flex-1 p-2 border rounded-md dark:bg-gray-700 uppercase text-[11px] placeholder:text-gray-400 font-medium"
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd(type)}
                    />
                    <button
                        onClick={() => handleAdd(type)}
                        className="bg-primary-600 text-white p-2 rounded-md hover:bg-primary-700 transition-colors"
                    >
                        <PlusIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {list.length > 0 ? (
                    [...new Set(list.map(i => i.toUpperCase()))].sort().map(item => {
                        const isEditing = editingItem?.type === type && editingItem?.originalValue.toUpperCase() === item;

                        return (
                            <div key={item} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded border border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors group">
                                {isEditing ? (
                                    <div className="flex flex-1 space-x-2 items-center">
                                        <input
                                            autoFocus
                                            type="text"
                                            value={editingItem.newValue}
                                            onChange={e => setEditingItem({ ...editingItem, newValue: e.target.value.toUpperCase() })}
                                            className="flex-1 p-1 text-sm border rounded dark:bg-gray-700 uppercase"
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
                                        <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 tracking-wider truncate mr-2">{item}</span>
                                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 italic">
                        <p className="text-xs">No hay elementos creados.</p>
                    </div>
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

            {deletingItem && (
                <Modal 
                    isOpen={true} 
                    onClose={() => setDeletingItem(null)} 
                    title="Confirmar eliminación"
                >
                    <div className="space-y-4">
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-md text-amber-800 dark:text-amber-200 text-sm">
                            <p className="font-bold mb-1">AVISO: Elemento en uso</p>
                            <p>El valor <span className="font-bold underline">"{deletingItem.value}"</span> está asignado actualmente a <span className="font-bold">{deletingItem.productsCount}</span> productos.</p>
                        </div>
                        
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium mb-1">Mover todos a un nuevo valor:</label>
                                <select 
                                    className="w-full p-2 border rounded-md dark:bg-gray-700"
                                    value={migrationTarget}
                                    onChange={e => setMigrationTarget(e.target.value)}
                                >
                                    <option value="">-- Seleccionar nuevo destino --</option>
                                    {(deletingItem.type === 'family' ? families : (deletingItem.type === 'category' ? categories : conditions))
                                        .filter(item => item.toUpperCase() !== deletingItem.value.toUpperCase())
                                        .map(item => (
                                            <option key={item} value={item}>{item.toUpperCase()}</option>
                                        ))
                                    }
                                </select>
                            </div>

                            <div className="flex flex-col space-y-2 pt-2">
                                <button
                                    disabled={!migrationTarget}
                                    onClick={() => executeDelete(deletingItem.type, deletingItem.value, migrationTarget)}
                                    className={`w-full py-2 px-4 rounded-md text-white font-medium ${migrationTarget ? 'bg-primary-600 hover:bg-primary-700' : 'bg-gray-400 cursor-not-allowed'}`}
                                >
                                    Migrar todos a "{migrationTarget.toUpperCase()}" y eliminar
                                </button>
                                
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                        <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                                    </div>
                                    <div className="relative flex justify-center">
                                        <span className="bg-white dark:bg-gray-800 px-2 text-xs text-gray-500 uppercase">o</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => executeDelete(deletingItem.type, deletingItem.value)}
                                    className="w-full py-2 px-4 border border-red-500 text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 font-medium"
                                >
                                    Eliminar y dejar productos sin {deletingItem.type === 'family' ? 'familia' : (deletingItem.type === 'category' ? 'categoría' : 'condición')} (para editar uno a uno)
                                </button>
                                
                                <button
                                    onClick={() => setDeletingItem(null)}
                                    className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};
