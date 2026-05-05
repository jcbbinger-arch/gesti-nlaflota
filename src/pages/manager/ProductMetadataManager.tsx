import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/Card';
import { Modal } from '../../components/Modal';
import { PlusIcon, TrashIcon, PencilIcon, CheckIcon, XMarkIcon } from '../../components/icons';
import { WorkspaceSettings, CustomTaxonomyFamily } from '../../types';
import productClassification from '../../data/clasificacion_productos.json';

export const ProductMetadataManager: React.FC = () => {
    const { workspaceSettings, setWorkspaceSettings, products, setProducts } = useData();
    const { currentUser } = useAuth();
    
    const taxonomy: CustomTaxonomyFamily[] = workspaceSettings?.custom_taxonomy || [];
    
    // Local state for selecting family
    const [selectedFamilyName, setSelectedFamilyName] = useState<string | null>(null);

    // Initial sync of predefined values to workspaceSettings if empty
    useEffect(() => {
        if (!workspaceSettings || !workspaceSettings.custom_taxonomy || workspaceSettings.custom_taxonomy.length === 0) {
            const initialTaxonomy: CustomTaxonomyFamily[] = productClassification.familias.map((f: any) => ({
                nombre: f.nombre.toUpperCase(),
                categorias: f.categorias.map((c: string) => c.toUpperCase()),
                condiciones: f.condiciones.map((c: string) => c.toUpperCase())
            }));
            
            const newSettings = workspaceSettings ? { ...workspaceSettings } : {
                 workspaceId: currentUser?.workspaceId || 'default',
                 categories: [],
                 families: [],
                 product_conditions: []
            };
            
            newSettings.custom_taxonomy = initialTaxonomy;
            
            setWorkspaceSettings(newSettings as WorkspaceSettings);
        } else if (taxonomy.length > 0 && !selectedFamilyName) {
            setSelectedFamilyName(taxonomy[0].nombre);
        }
    }, [workspaceSettings, setWorkspaceSettings, currentUser?.workspaceId, selectedFamilyName, taxonomy]);

    const [newFamily, setNewFamily] = useState('');
    const [newCategory, setNewCategory] = useState('');
    const [newCondition, setNewCondition] = useState('');
    const [editingItem, setEditingItem] = useState<{ type: 'family' | 'category' | 'condition', originalValue: string, newValue: string } | null>(null);

    const activeFamily = useMemo(() => taxonomy.find(f => f.nombre === selectedFamilyName), [taxonomy, selectedFamilyName]);

    const handleAdd = async (type: 'family' | 'category' | 'condition') => {
        let newTaxonomy = [...taxonomy];
        
        if (type === 'family') {
            const val = newFamily.trim().toUpperCase();
            if (val && !newTaxonomy.find(f => f.nombre === val)) {
                newTaxonomy.push({ nombre: val, categorias: [], condiciones: [] });
                setNewFamily('');
            }
        } else if (type === 'category' && activeFamily) {
            const val = newCategory.trim().toUpperCase();
            if (val && !activeFamily.categorias.includes(val)) {
                const famIndex = newTaxonomy.findIndex(f => f.nombre === activeFamily.nombre);
                newTaxonomy[famIndex].categorias.push(val);
                setNewCategory('');
            }
        } else if (type === 'condition' && activeFamily) {
            const val = newCondition.trim().toUpperCase();
            if (val && !activeFamily.condiciones.includes(val)) {
                const famIndex = newTaxonomy.findIndex(f => f.nombre === activeFamily.nombre);
                newTaxonomy[famIndex].condiciones.push(val);
                setNewCondition('');
            }
        } else {
            return;
        }

        await setWorkspaceSettings({ ...workspaceSettings!, custom_taxonomy: newTaxonomy });
    };

    const handleEditSave = async () => {
        if (!editingItem || !workspaceSettings) return;

        const { type, originalValue, newValue } = editingItem;
        const trimmedNewValue = newValue.trim().toUpperCase();

        if (!trimmedNewValue || trimmedNewValue === originalValue) {
            setEditingItem(null);
            return;
        }

        let newTaxonomy = [...taxonomy];
        
        if (type === 'family') {
            if (newTaxonomy.find(f => f.nombre === trimmedNewValue)) {
                alert('Esta familia ya existe.');
                return;
            }
            const famIndex = newTaxonomy.findIndex(f => f.nombre === originalValue);
            newTaxonomy[famIndex].nombre = trimmedNewValue;
            
            if (selectedFamilyName === originalValue) {
                setSelectedFamilyName(trimmedNewValue);
            }
            
            // update products
            const updatedProducts = products.map(p => p.family === originalValue ? { ...p, family: trimmedNewValue } : p);
            await setProducts(updatedProducts);
            
        } else if (type === 'category' && activeFamily) {
            if (activeFamily.categorias.includes(trimmedNewValue)) {
                alert('Esta categoría ya existe en esta familia.');
                return;
            }
            const famIndex = newTaxonomy.findIndex(f => f.nombre === activeFamily.nombre);
            newTaxonomy[famIndex].categorias = newTaxonomy[famIndex].categorias.map(c => c === originalValue ? trimmedNewValue : c);
            
            const updatedProducts = products.map(p => (p.family === activeFamily.nombre && p.category === originalValue) ? { ...p, category: trimmedNewValue } : p);
            await setProducts(updatedProducts);
            
        } else if (type === 'condition' && activeFamily) {
            if (activeFamily.condiciones.includes(trimmedNewValue)) {
                alert('Esta condición ya existe en esta familia.');
                return;
            }
            const famIndex = newTaxonomy.findIndex(f => f.nombre === activeFamily.nombre);
            newTaxonomy[famIndex].condiciones = newTaxonomy[famIndex].condiciones.map(c => c === originalValue ? trimmedNewValue : c);
            
            const updatedProducts = products.map(p => (p.family === activeFamily.nombre && (p.condition === originalValue || p.product_state === originalValue)) ? { ...p, condition: trimmedNewValue, product_state: trimmedNewValue } : p);
            await setProducts(updatedProducts);
        }

        await setWorkspaceSettings({ ...workspaceSettings!, custom_taxonomy: newTaxonomy });
        setEditingItem(null);
    };

    const handleRemove = async (type: 'family' | 'category' | 'condition', value: string) => {
        if (!workspaceSettings || !confirm('¿Estás seguro de que deseas eliminar este elemento?')) return;

        let newTaxonomy = [...taxonomy];
        
        if (type === 'family') {
            newTaxonomy = newTaxonomy.filter(f => f.nombre !== value);
            if (selectedFamilyName === value) {
                setSelectedFamilyName(newTaxonomy[0]?.nombre || null);
            }
            const updatedProducts = products.map(p => p.family === value ? { ...p, family: '' } : p);
            await setProducts(updatedProducts);
        } else if (type === 'category' && activeFamily) {
            const famIndex = newTaxonomy.findIndex(f => f.nombre === activeFamily.nombre);
            newTaxonomy[famIndex].categorias = newTaxonomy[famIndex].categorias.filter(c => c !== value);
            const updatedProducts = products.map(p => (p.family === activeFamily.nombre && p.category === value) ? { ...p, category: '' } : p);
            await setProducts(updatedProducts);
        } else if (type === 'condition' && activeFamily) {
            const famIndex = newTaxonomy.findIndex(f => f.nombre === activeFamily.nombre);
            newTaxonomy[famIndex].condiciones = newTaxonomy[famIndex].condiciones.filter(c => c !== value);
            const updatedProducts = products.map(p => (p.family === activeFamily.nombre && (p.condition === value || p.product_state === value)) ? { ...p, condition: '', product_state: '' } : p);
            await setProducts(updatedProducts);
        }

        await setWorkspaceSettings({ ...workspaceSettings!, custom_taxonomy: newTaxonomy });
    };

    const renderSection = (title: string, list: string[], addNewValue: string, setAddNewValue: (v: string) => void, type: 'family' | 'category' | 'condition', isInteractive: boolean) => (
        <Card className={`h-[600px] flex flex-col shadow-sm border ${isInteractive ? 'border-primary-200 dark:border-primary-800' : 'border-gray-200 dark:border-gray-700'} ${type === 'family' ? 'bg-indigo-50/10 dark:bg-indigo-900/10' : ''}`}>
            <div className="p-4 border-b dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{title}</h3>
                </div>
                <div className="flex space-x-2">
                    <input
                        disabled={!isInteractive && type !== 'family'}
                        type="text"
                        value={addNewValue}
                        onChange={e => setAddNewValue(e.target.value)}
                        placeholder={`NUEVA ${title.toUpperCase()}...`}
                        className="flex-1 p-2 border rounded-md dark:bg-gray-700 uppercase text-[11px] placeholder:text-gray-400 font-medium disabled:opacity-50"
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd(type)}
                    />
                    <button
                        disabled={!isInteractive && type !== 'family'}
                        onClick={() => handleAdd(type)}
                        className="bg-primary-600 text-white p-2 rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50"
                    >
                        <PlusIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {list.length > 0 ? (
                    [...new Set(list.map(i => i.toUpperCase()))].sort().map(item => {
                        const isEditing = editingItem?.type === type && editingItem?.originalValue.toUpperCase() === item;
                        const isSelected = type === 'family' && item === selectedFamilyName;

                        return (
                            <div 
                                key={item} 
                                onClick={() => type === 'family' && setSelectedFamilyName(item)}
                                className={`flex justify-between items-center p-2 rounded border transition-colors group ${type === 'family' ? 'cursor-pointer' : ''} ${isSelected ? 'bg-primary-100 dark:bg-primary-900 border-primary-300 dark:border-primary-700 shadow-sm' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                            >
                                {isEditing ? (
                                    <div className="flex flex-1 space-x-2 items-center" onClick={e => e.stopPropagation()}>
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
                                        <span className={`text-[11px] font-bold tracking-wider truncate mr-2 ${isSelected ? 'text-primary-800 dark:text-primary-200' : 'text-gray-700 dark:text-gray-300'}`}>{item}</span>
                                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
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
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 italic text-center p-4">
                        <p className="text-xs">No hay elementos de este tipo en la familia actual.</p>
                    </div>
                )}
            </div>
        </Card>
    );

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Configuración de Tipologías de Producto</h1>
            <p className="text-gray-600 dark:text-gray-400">Administra las familias, y sus categorías y condiciones correspondientes. Selecciona una familia para ver y editar sus sub-elementos.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {renderSection('Familias', taxonomy.map(f => f.nombre), newFamily, setNewFamily, 'family', true)}
                {renderSection(activeFamily ? `Categorías de ${activeFamily.nombre}` : 'Categorías', activeFamily ? activeFamily.categorias : [], newCategory, setNewCategory, 'category', !!activeFamily)}
                {renderSection(activeFamily ? `Condiciones de ${activeFamily.nombre}` : 'Condiciones', activeFamily ? activeFamily.condiciones : [], newCondition, setNewCondition, 'condition', !!activeFamily)}
            </div>
        </div>
    );
};
