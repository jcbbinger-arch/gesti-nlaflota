import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../../components/Card';
import { Modal } from '../../components/Modal';
import { PlusIcon, DownloadIcon, WarningIcon, TrashIcon, ProductIcon, ShieldCheckIcon } from '../../components/icons';
import { Product, Supplier, ProductState, WarehouseStatus, Profile } from '../../types';
import { exportToCsv } from '../../utils/export';
import { parseCsv } from '../../utils/csv';
import { useAuth } from '../../contexts/AuthContext';
import { resizeImage } from '../../utils/image';
import productClassification from '../../data/clasificacion_productos.json';

const ALLERGENS_LIST = [
    "Gluten", "Crustáceos", "Huevos", "Pescado", "Cacahuetes", 
    "Soja", "Lácteos", "Frutos de cáscara", "Apio", "Mostaza", 
    "Sésamo", "Sulfitos", "Altramuces", "Moluscos"
];

const PREDEFINED_FAMILIES = [
    "ACEITES Y GRASAS", "AGUAS, REFRESCOS Y CERVEZAS", "ARROCES, PASTAS Y LEGUMBRES", "CAFÉS E INFUSIONES",
    "CARNES", "CONSERVAS", "DESTILADOS Y COCTELERÍA", "EMBUTIDOS", "ESPECIAS Y CONDIMENTOS",
    "FRUTOS SECOS", "HARINAS, SEMILLAS Y GRANOS", "LÁCTEOS Y HUEVOS", "LICORES Y APERITIVOS",
    "MARISCO", "PASTELERÍA Y PANADERÍA", "PATO", "PESCADOS", "QUESOS", "SALSAS Y CREMAS", "VARIOS",
    "VEGETALES", "VINOS", "NO ESTÁN EN LA LISTA/NUEVOS", "OTROS"
];

const PREDEFINED_CATEGORIES = [
    "ACEITES", "AGUAS", "ALGAS", "ARROCES", "AVES Y CAZA", "AZÚCARES", "CABRITO", "CACAO/CHOCOLATES",
    "CAFÉS", "CERDO", "CERVEZAS", "CONDIMENTOS", "CONSERVAS", "CORDERO", "CREMAS", "DESHIDRATADOS",
    "DESTILADOS Y COCTELERÍA", "EMBUTIDOS", "ESPECIAS", "FLORES", "FRUTAS", "FRUTAS CONFITADAS",
    "FRUTAS DESHIDRATADAS", "FRUTAS PROCESADAS", "FRUTOS SECOS", "GRANOS", "GRASAS", "HARINAS",
    "HIERBAS", "HUEVOS", "INFUSIONES", "LÁCTEOS", "LEGUMBRES", "LICORES Y APERITIVOS", "LIOFILIZADOS",
    "MARISCO", "MERMELADAS", "OTROS", "PASTAS", "PATO", "PESCADO", "PREPARADOS", "QUESOS", "REFRESCOS",
    "SALSAS", "SEMILLAS", "SETAS", "SIROPES", "VACUNO", "VERDURAS", "VINOS", "ZUMOS"
].sort();

const PRODUCT_STATES: ProductState[] = [
    'FRESCO', 'CONGELADO', 'OTROS', 'CONSERVAS', 'AHUMADO', 'DESALADO', 'UHT', 'ESTERILIZADO', 'ENLATADO', 'DESHIDRATADO'
];

const WAREHOUSE_STATUSES: WarehouseStatus[] = ['Disponible', 'Bajo Pedido', 'Descontinuado'];

// FIX: Export ProductFormModal so it can be reused in other components.
export const ProductFormModal: React.FC<{ product: Product | null; onClose: () => void; onSave: (product: Product) => void; allProducts: Product[]; allSuppliers: Supplier[] }> = ({ product, onClose, onSave, allProducts, allSuppliers }) => {
    const { workspaceSettings, setWorkspaceSettings } = useData();
    const [formState, setFormState] = useState<Product>(product || { 
        id: '', name: '', description: '', reference: `REF-${Date.now().toString().slice(-6)}`, unit: 'Uds', suppliers: [], tax: 21, category: '', family: '', condition: '', allergens: [], status: 'Activo', product_state: 'FRESCO', warehouse_status: 'Disponible', image: ''
    });
    
    // Families from JSON + custom ones from workspace
    const families = useMemo(() => {
        const jsonFamilies = Object.keys(productClassification.families);
        const customFamilies = workspaceSettings?.families || [];
        const productFamilies = allProducts.map(p => p.family).filter(f => f);
        return [...new Set([...jsonFamilies, ...productFamilies, ...customFamilies])].map(f => f.toUpperCase()).sort();
    }, [allProducts, workspaceSettings]);

    // Categories filter based on family
    const categories = useMemo(() => {
        const familyData = (productClassification.families as any)[formState.family.toUpperCase()];
        const jsonCategories = familyData ? Object.keys(familyData.categories) : [];
        const customCategories = workspaceSettings?.categories || [];
        const productCategories = allProducts.filter(p => p.family === formState.family).map(p => p.category).filter(c => c);
        
        // If we have a family match in JSON, we prioritize those categories
        if (familyData) {
            return [...new Set([...jsonCategories, ...customCategories])].map(c => c.toUpperCase()).sort();
        }
        
        return [...new Set([...PREDEFINED_CATEGORIES, ...productCategories, ...customCategories])].map(c => c.toUpperCase()).sort();
    }, [allProducts, workspaceSettings, formState.family]);

    // Conditions filter based on category
    const conditions = useMemo(() => {
        const familyData = (productClassification.families as any)[formState.family.toUpperCase()];
        const categoryData = familyData ? familyData.categories[formState.category.toUpperCase()] : null;
        const jsonConditions = categoryData ? categoryData.conditions : [];
        
        const customConditions = workspaceSettings?.product_conditions || [];
        const productStates = allProducts.filter(p => p.category === formState.category).map(p => p.product_state).filter((s): s is ProductState => !!s);
        
        if (categoryData) {
             return [...new Set([...jsonConditions, ...customConditions])].map(s => s.toUpperCase()).sort();
        }
        
        return [...new Set([...PRODUCT_STATES, ...productStates, ...customConditions])].map(s => s.toUpperCase()).sort();
    }, [allProducts, workspaceSettings, formState.family, formState.category]);

    const [addModalType, setAddModalType] = useState<'family' | 'category' | 'condition' | null>(null);
    const [removeModalType, setRemoveModalType] = useState<'family' | 'category' | 'condition' | null>(null);
    const [newListItemName, setNewListItemName] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const updatedValue = type === 'number' ? parseFloat(value) || 0 : value;
        
        if (name === 'family') {
            setFormState(prev => ({ ...prev, family: value, category: '', condition: '', product_state: '' }));
        } else if (name === 'category') {
            setFormState(prev => {
                const familyData = (productClassification.families as any)[prev.family.toUpperCase()];
                const categoryData = familyData ? familyData.categories[value.toUpperCase()] : null;
                const defaultCondition = categoryData && categoryData.conditions.length > 0 ? categoryData.conditions[0] : '';
                
                return { 
                    ...prev, 
                    category: value, 
                    condition: defaultCondition,
                    product_state: defaultCondition.toUpperCase() 
                };
            });
        } else if (name === 'product_state') {
             setFormState(prev => ({ ...prev, product_state: value, condition: value }));
        } else {
            setFormState(prev => ({ ...prev, [name]: updatedValue }));
        }
    };

    const handleSupplierChange = (index: number, field: 'supplier_id' | 'price', value: string) => {
        const newSuppliers = [...formState.suppliers];
        newSuppliers[index] = {...newSuppliers[index], [field]: field === 'price' ? parseFloat(value) || 0 : value};
        setFormState({...formState, suppliers: newSuppliers});
    }

    const handleAllergenChange = (allergen: string) => {
        const newAllergens = formState.allergens.includes(allergen)
            ? formState.allergens.filter(a => a !== allergen)
            : [...formState.allergens, allergen];
        setFormState({ ...formState, allergens: newAllergens });
    };

    const handleAddNew = (type: 'family' | 'category' | 'condition') => {
        setNewListItemName('');
        setAddModalType(type);
    };

    const handleSaveNew = async (e: React.FormEvent) => {
        e.preventDefault();
        const newValue = newListItemName.trim().toUpperCase();
        if (addModalType && newValue) {
            if (addModalType === 'family' && !families.includes(newValue)) {
                const currentCustom = (workspaceSettings?.families || []).map(f => f.toUpperCase());
                await setWorkspaceSettings({
                    ...workspaceSettings!,
                    families: [...currentCustom, newValue]
                });
                setFormState(prev => ({...prev, family: newValue}));
            }
            if (addModalType === 'category' && !categories.includes(newValue)) {
                const currentCustom = (workspaceSettings?.categories || []).map(c => c.toUpperCase());
                await setWorkspaceSettings({
                    ...workspaceSettings!,
                    categories: [...currentCustom, newValue]
                });
                setFormState(prev => ({...prev, category: newValue}));
            }
            if (addModalType === 'condition' && !conditions.includes(newValue)) {
                const currentCustom = (workspaceSettings?.product_conditions || []).map(c => c.toUpperCase());
                await setWorkspaceSettings({
                    ...workspaceSettings!,
                    product_conditions: [...currentCustom, newValue]
                });
                setFormState(prev => ({...prev, product_state: newValue}));
            }
        }
        setAddModalType(null);
    };

    const handleRemoveNew = (type: 'family' | 'category' | 'condition') => {
        setRemoveModalType(type);
    };

    const handleConfirmRemove = async (valueToRemove: string) => {
        if (!removeModalType) return;
        
        if (window.confirm(`¿Estás seguro de que quieres eliminar "${valueToRemove}" de la lista de sugerencias? Esta acción no se puede deshacer.`)) {
            if (removeModalType === 'family') {
                const currentCustom = (workspaceSettings?.families || []).map(f => f.toUpperCase());
                await setWorkspaceSettings({
                    ...workspaceSettings!,
                    families: currentCustom.filter(f => f !== valueToRemove)
                });
                if (formState.family.toUpperCase() === valueToRemove) {
                    setFormState(prev => ({ ...prev, family: '' }));
                }
            }
            if (removeModalType === 'category') {
                const currentCustom = (workspaceSettings?.categories || []).map(c => c.toUpperCase());
                await setWorkspaceSettings({
                    ...workspaceSettings!,
                    categories: currentCustom.filter(c => c !== valueToRemove)
                });
                 if (formState.category.toUpperCase() === valueToRemove) {
                    setFormState(prev => ({ ...prev, category: '' }));
                }
            }
            if (removeModalType === 'condition') {
                const currentCustom = (workspaceSettings?.product_conditions || []).map(s => s.toUpperCase());
                await setWorkspaceSettings({
                    ...workspaceSettings!,
                    product_conditions: currentCustom.filter(c => c !== valueToRemove)
                });
                 if ((formState.product_state || '').toUpperCase() === valueToRemove) {
                    setFormState(prev => ({ ...prev, product_state: '' }));
                }
            }
        }
    };
    
    const addSupplier = () => setFormState({...formState, suppliers: [...formState.suppliers, {supplier_id: '', price: 0}]});
    const removeSupplier = (index: number) => setFormState({...formState, suppliers: formState.suppliers.filter((_, i) => i !== index)});

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...formState,
            family: formState.family.toUpperCase(),
            category: formState.category.toUpperCase(),
            product_state: formState.product_state?.toUpperCase()
        });
    };

    const handleClose = () => {
        if (addModalType || removeModalType) {
            setAddModalType(null);
            setRemoveModalType(null);
        } else {
            onClose();
        }
    };

    useEffect(() => {
        const handlePaste = async (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;

            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const file = items[i].getAsFile();
                    if (file) {
                        try {
                            const resized = await resizeImage(file, 200, 200, 0.5);
                            setFormState(prev => ({ ...prev, image: resized }));
                        } catch (error) {
                            console.error("Error processing pasted image:", error);
                        }
                    }
                }
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, []);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            // Resize to 200x200 with 0.5 quality for storage efficiency
            const resized = await resizeImage(file, 200, 200, 0.5);
            setFormState({ ...formState, image: resized });
        } catch (error) {
            console.error("Error resizing image:", error);
            alert("Error al procesar la imagen.");
        }
    };
    
    const renderMainForm = () => {
        const units = ["Uds", "kg", "g", "L", "ml", "Pack", "Docena"];
        return (
            <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto p-1">
                <div className="flex items-start space-x-4">
                    <div className="flex-1 space-y-4">
                        <input type="text" name="name" value={formState.name} onChange={handleChange} placeholder="Nombre del Producto" required className="mt-1 block w-full rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600"/>
                        <textarea name="description" value={formState.description} onChange={handleChange} placeholder="Descripción" rows={2} className="mt-1 block w-full rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600"/>
                        
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">Enlace de la imagen (URL)</label>
                            <input 
                                type="text" 
                                name="image" 
                                value={formState.image?.startsWith('data:') ? '' : formState.image} 
                                onChange={handleChange} 
                                placeholder="Pega aquí el enlace de la imagen..." 
                                className="block w-full rounded-md border-gray-300 shadow-sm text-sm dark:bg-gray-700 dark:border-gray-600"
                            />
                            {formState.image?.startsWith('data:') && (
                                <p className="text-[10px] text-green-600 mt-1 flex items-center">
                                    <ShieldCheckIcon className="w-3 h-3 mr-1" /> Imagen cargada directamente
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="w-32 h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-800 relative group shrink-0">
                        {formState.image ? (
                            <>
                                <img src={formState.image} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                <button type="button" onClick={() => setFormState({...formState, image: ''})} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    <TrashIcon className="w-3 h-3" />
                                </button>
                            </>
                        ) : (
                            <div className="text-center p-2">
                                <PlusIcon className="w-6 h-6 mx-auto text-gray-400" />
                                <span className="text-[10px] text-gray-500">Subir o Pegar</span>
                            </div>
                        )}
                        <input 
                            type="file" 
                            accept="image/*"
                            className="absolute inset-0 opacity-0 cursor-pointer" 
                            onChange={handleImageUpload}
                            title="Selecciona una imagen o pega una directamente (Ctrl+V)"
                        />
                    </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm">Referencia (Automática)</label>
                        <input type="text" name="reference" value={formState.reference} readOnly className="mt-1 block w-full rounded-md shadow-sm dark:bg-gray-800 dark:border-gray-600 bg-gray-100 cursor-not-allowed"/>
                    </div>
                    <input type="number" name="tax" value={formState.tax} onChange={handleChange} placeholder="IVA %" className="mt-1 block w-full rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600"/>
                     <div>
                        <label className="text-sm">Unidad de Medida</label>
                        <select name="unit" value={formState.unit} onChange={handleChange} className="mt-1 block w-full rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600">
                           {units.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                     </div>
                     {formState.unit === 'Uds' && (
                        <div className="flex space-x-2 items-end">
                            <div className="flex-1">
                                <label className="text-xs text-gray-500">Equivalencia (Peso/Volumen)</label>
                                <input type="number" name="unit_size" value={formState.unit_size || ''} onChange={handleChange} placeholder="Ej: 300" className="mt-1 block w-full rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 text-sm"/>
                            </div>
                            <select name="unit_size_type" value={formState.unit_size_type || 'g'} onChange={handleChange} className="mb-0.5 block rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 text-sm">
                                <option value="g">g</option>
                                <option value="kg">kg</option>
                                <option value="ml">ml</option>
                                <option value="L">L</option>
                            </select>
                        </div>
                     )}
                      <div>
                        <label className="text-sm">Estado (Catálogo)</label>
                        <select name="status" value={formState.status} onChange={handleChange} className="mt-1 block w-full rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600">
                            <option value="Activo">Activo</option>
                            <option value="Inactivo">Inactivo</option>
                        </select>
                     </div>
                      <div>
                        <label className="text-sm">Estado (Almacén)</label>
                        <select name="warehouse_status" value={formState.warehouse_status} onChange={handleChange} className="mt-1 block w-full rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600">
                            {WAREHOUSE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                     </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                        <label className="text-sm flex justify-between items-center font-medium text-gray-700 dark:text-gray-300">1. Familia 
                            <span className="space-x-2">
                                <button type="button" onClick={() => handleAddNew('family')} className="text-[10px] text-primary-600 hover:underline">Añadir</button>
                                <button type="button" onClick={() => handleRemoveNew('family')} className="text-[10px] text-red-500 hover:underline">Eliminar</button>
                            </span>
                        </label>
                        <select name="family" value={formState.family} onChange={handleChange} className="mt-1 block w-full rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600">
                            <option value="">-- Selecciona Familia --</option>
                            {families.map(f => <option key={f} value={f}>{f.toUpperCase()}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="text-sm flex justify-between items-center font-medium text-gray-700 dark:text-gray-300">2. Categoría 
                            <span className="space-x-2">
                                <button type="button" onClick={() => handleAddNew('category')} className="text-[10px] text-primary-600 hover:underline">Añadir</button>
                                <button type="button" onClick={() => handleRemoveNew('category')} className="text-[10px] text-red-500 hover:underline">Eliminar</button>
                            </span>
                        </label>
                        <select name="category" value={formState.category} onChange={handleChange} disabled={!formState.family} className="mt-1 block w-full rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">
                            <option value="">-- Selecciona Categoría --</option>
                            {categories.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-sm flex justify-between items-center font-medium text-gray-700 dark:text-gray-300">3. Condición
                            <span className="space-x-2 text-[10px]">
                                <button type="button" onClick={() => handleAddNew('condition')} className="text-primary-600 hover:underline">Añadir</button>
                                <button type="button" onClick={() => handleRemoveNew('condition')} className="text-red-500 hover:underline">Eliminar</button>
                            </span>
                        </label>
                        <select name="product_state" value={formState.product_state} onChange={handleChange} disabled={!formState.category} className="mt-1 block w-full rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">
                             <option value="">-- Selecciona Condición --</option>
                            {conditions.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                        </select>
                    </div>
                </div>

                <div className="pt-2">
                    <h4 className="font-semibold">Alérgenos</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2">
                        {ALLERGENS_LIST.map(allergen => (
                            <label key={allergen} className="flex items-center space-x-2 text-sm p-1">
                                <input type="checkbox" checked={formState.allergens.includes(allergen)} onChange={() => handleAllergenChange(allergen)} />
                                <span>{allergen}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="pt-2">
                     <h4 className="font-semibold">Proveedores y Precios</h4>
                     {formState.suppliers.map((s, index) => (
                         <div key={index} className="flex items-center space-x-2 mt-2">
                            <select value={s.supplier_id} onChange={(e) => handleSupplierChange(index, 'supplier_id', e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600">
                                <option value="">-- Selecciona --</option>
                                {allSuppliers.map(sup => <option key={sup.id} value={sup.id}>{sup.name}</option>)}
                            </select>
                            <input type="number" step="0.01" value={s.price} onChange={(e) => handleSupplierChange(index, 'price', e.target.value)} placeholder="Precio" className="w-32 p-2 border rounded dark:bg-gray-700 dark:border-gray-600"/>
                            <button type="button" onClick={() => removeSupplier(index)} className="text-red-500 p-1"><TrashIcon className="w-5 h-5"/></button>
                         </div>
                     ))}
                     <button type="button" onClick={addSupplier} className="text-sm text-primary-600 mt-2">Añadir Proveedor</button>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={onClose} className="bg-gray-200 dark:bg-gray-600 px-4 py-2 rounded-md">Cancelar</button>
                    <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-md">Guardar</button>
                </div>
            </form>
        );
    };

    const renderAddForm = () => {
        const type = addModalType!;
        const placeholder = type === 'family' ? 'Ej: LACTEOS Y DERIVADOS' : type === 'category' ? 'Ej: VERDURAS' : 'Ej: BOTELLINES DE CRISTAL';
        const buttonText = type === 'family' ? 'Guardar Familia' : type === 'category' ? 'Guardar Categoría' : 'Guardar Condición';
        return (
            <form onSubmit={handleSaveNew}>
                <label>Nombre de la {type === 'family' ? 'Familia' : type === 'category' ? 'Categoría' : 'Condición'}</label>
                <input
                    type="text"
                    value={newListItemName}
                    onChange={e => setNewListItemName(e.target.value)}
                    placeholder={placeholder}
                    className="w-full mt-1 p-2 border rounded-md dark:bg-gray-700 uppercase"
                    required autoFocus
                />
                <div className="flex justify-end mt-4 space-x-2">
                    <button type="button" onClick={() => setAddModalType(null)} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">Cancelar</button>
                    <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700">{buttonText}</button>
                </div>
            </form>
        );
    };

    const renderRemoveList = () => {
        const type = removeModalType!;
        const items = type === 'family' ? families : type === 'category' ? categories : conditions;
        const predefinedItems = type === 'family' ? PREDEFINED_FAMILIES : type === 'category' ? PREDEFINED_CATEGORIES : PRODUCT_STATES;
        const removableItems = items.filter(item => !predefinedItems.includes(item.toUpperCase()));

        return (
            <div>
                <div className="space-y-2 max-h-60 overflow-y-auto p-1">
                    {removableItems.length > 0 ? (
                        removableItems.map(item => (
                            <div key={item} className="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-700 rounded">
                                <span className="uppercase">{item}</span>
                                <button onClick={() => handleConfirmRemove(item)} className="text-red-500 hover:text-red-700">
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-500 text-sm">No hay elementos personalizados para eliminar.</p>
                    )}
                </div>
                 <div className="flex justify-end mt-4">
                    <button type="button" onClick={() => setRemoveModalType(null)} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">Cerrar</button>
                </div>
            </div>
        );
    };

    let content, title;
    let modalSize: 'sm' | 'xl' = 'xl';

    if (addModalType) {
        title = addModalType === 'family' ? 'Añadir Nueva Familia' : addModalType === 'category' ? 'Añadir Nueva Categoría' : 'Añadir Nueva Condición';
        content = renderAddForm();
        modalSize = 'sm';
    } else if (removeModalType) {
        title = removeModalType === 'family' ? 'Eliminar Familia de la Lista' : removeModalType === 'category' ? 'Eliminar Categoría de la Lista' : 'Eliminar Condición de la Lista';
        content = renderRemoveList();
        modalSize = 'sm';
    } else {
        title = product ? 'Editar Producto' : 'Añadir Nuevo Producto';
        content = renderMainForm();
        modalSize = 'xl';
    }

    return (
        <Modal isOpen={true} onClose={handleClose} title={title} size={modalSize}>
            {content}
        </Modal>
    );
};


export const ProductManager: React.FC = () => {
    const { products, setProducts, suppliers, workspaceSettings } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [filter, setFilter] = useState('');
    const [familyFilter, setFamilyFilter] = useState('');
    const [deleteStep, setDeleteStep] = useState(1);
    const [isImporting, setIsImporting] = useState(false);

    const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const text = event.target?.result as string;
                const importedData = parseCsv(text);
                
                if (importedData.length === 0) {
                    alert("El archivo CSV está vacío o no tiene el formato correcto.");
                    return;
                }

                const updatedProducts = [...products];
                let addedCount = 0;
                let updatedCount = 0;

                for (const item of importedData) {
                    if (!item.name) continue;

                    const existingIndex = updatedProducts.findIndex(p => 
                        (item.reference && p.reference === String(item.reference)) || 
                        (item.name && p.name.toLowerCase() === String(item.name).toLowerCase())
                    );

                    let itemSuppliers = Array.isArray(item.suppliers) ? [...item.suppliers] : [];
                    
                    const csvSupplierName = item.supplier_name || item.proveedor || item.supplier;
                    const csvPrice = parseFloat(item.price || item.precio);
                    
                    if (csvSupplierName && !isNaN(csvPrice) && suppliers) {
                        const matchedSupplier = suppliers.find(s => s.name.toLowerCase() === String(csvSupplierName).toLowerCase());
                        if (matchedSupplier) {
                            const alreadyExists = itemSuppliers.some((s: any) => s.supplier_id === matchedSupplier.id);
                            if (!alreadyExists) {
                                itemSuppliers.push({ supplier_id: matchedSupplier.id, price: csvPrice });
                            }
                        }
                    }

                    const productData: Product = {
                        id: existingIndex >= 0 ? updatedProducts[existingIndex].id : `prod-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                        name: String(item.name),
                        description: String(item.description || ''),
                        reference: String(item.reference || `REF-${Math.random().toString(36).substr(2, 6).toUpperCase()}`),
                        unit: String(item.unit || 'Uds'),
                        tax: parseFloat(item.tax) || 21,
                        category: String(item.category || 'OTROS').toUpperCase(),
                        family: String(item.family || 'VARIOS').toUpperCase(),
                        allergens: Array.isArray(item.allergens) ? item.allergens : (typeof item.allergens === 'string' ? item.allergens.split('|').map((a: string) => a.trim()) : []),
                        status: item.status === 'Inactivo' ? 'Inactivo' : 'Activo',
                        product_state: (String(item.product_state || item.condition || 'FRESCO').toUpperCase() as ProductState),
                        condition: String(item.condition || item.product_state || 'FRESCO').toUpperCase(),
                        warehouse_status: (item.warehouse_status as WarehouseStatus) || 'Disponible',
                        suppliers: itemSuppliers.length > 0 ? itemSuppliers : (existingIndex >= 0 ? updatedProducts[existingIndex].suppliers : []),
                        image: item.image || item.imagen || (existingIndex >= 0 ? updatedProducts[existingIndex].image : ''),
                        unit_size: parseFloat(item.unit_size) || (existingIndex >= 0 ? updatedProducts[existingIndex].unit_size : undefined),
                        unit_size_type: (item.unit_size_type as any) || (existingIndex >= 0 ? updatedProducts[existingIndex].unit_size_type : 'g')
                    };

                    if (existingIndex >= 0) {
                        updatedProducts[existingIndex] = productData;
                        updatedCount++;
                    } else {
                        updatedProducts.push(productData);
                        addedCount++;
                    }
                }

                await setProducts(updatedProducts);
                alert(`Importación finalizada: ${addedCount} productos añadidos, ${updatedCount} productos actualizados.`);
            } catch (error) {
                console.error("Error importing CSV:", error);
                alert("Error al importar el archivo CSV. Asegúrate de que el formato sea correcto.");
            } finally {
                setIsImporting(false);
                if (e.target) e.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    const downloadTemplate = () => {
        const template = [
            {
                name: "Ejemplo Producto",
                description: "Descripción del producto",
                reference: "REF001",
                unit: "Kg",
                tax: 21,
                category: "CARNES",
                family: "CARNES",
                allergens: ["Gluten", "Lácteos"],
                status: "Activo",
                product_state: "FRESCO",
                condition: "FRESCO",
                warehouse_status: "Disponible",
                image: "https://picsum.photos/seed/product/200/200",
                supplier_name: "Makro",
                price: 10.5,
                unit_size: 300,
                unit_size_type: "g"
            }
        ];
        exportToCsv("plantilla_productos.csv", template);
    };

    const suppliersMap = useMemo(() => new Map(suppliers.map(s => [s.id, s])), [suppliers]);
    const activeSuppliers = useMemo(() => new Set(suppliers.filter(s => s.status === 'Activo').map(s => s.id)), [suppliers]);

    const getBestPriceInfo = (product: Product) => {
        if (!product.suppliers || product.suppliers.length === 0) {
            return { price: null, supplierName: 'N/A', otherSupplierCount: 0 };
        }

        const activeProductSuppliers = product.suppliers.filter(ps => activeSuppliers.has(ps.supplier_id));

        if (activeProductSuppliers.length === 0) {
            return { price: null, supplierName: 'Ninguno Activo', otherSupplierCount: product.suppliers.length };
        }

        const sortedByPrice = [...activeProductSuppliers].sort((a, b) => a.price - b.price);
        const best = sortedByPrice[0];
        const supplier = suppliersMap.get(best.supplier_id);

        return {
            price: best.price,
            supplierName: supplier?.name || 'Desconocido',
            otherSupplierCount: activeProductSuppliers.length - 1
        };
    };
    
    const uniqueFamilies = useMemo(() => {
        const jsonFamilies = Object.keys(productClassification.families);
        const productFamilies = products.map(p => p.family).filter(Boolean);
        const customFamilies = workspaceSettings?.families || [];
        return [...new Set([...jsonFamilies, ...productFamilies, ...customFamilies])].map(f => f.toUpperCase()).sort();
    }, [products, workspaceSettings]);

    const filteredProducts = useMemo(() => {
        return products
            .filter(p => filter ? p.name.toLowerCase().includes(filter.toLowerCase()) : true)
            .filter(p => familyFilter ? p.family.toUpperCase() === familyFilter.toUpperCase() : true)
            .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
    }, [products, filter, familyFilter]);

    const handleOpenModal = (product: Product | null = null) => {
        setSelectedProduct(product);
        setIsModalOpen(true);
    };

    const handleSaveProduct = (productData: Product) => {
        if (selectedProduct) {
            setProducts(products.map(p => (p.id === productData.id ? productData : p)));
        } else {
            setProducts([...products, { ...productData, id: `prod-${Date.now()}` }]);
        }
        setIsModalOpen(false);
    };

    const handleOpenDeleteModal = (product: Product) => {
        setSelectedProduct(product);
        setDeleteStep(1);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteProduct = () => {
        if (selectedProduct) {
            setProducts(products.filter(p => p.id !== selectedProduct.id));
        }
        setIsDeleteModalOpen(false);
        setSelectedProduct(null);
    };

    const handleExport = () => {
        exportToCsv('productos.csv', products);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-baseline space-x-3">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Gestión de Productos</h1>
                    <span className="text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2.5 py-0.5 rounded-full border dark:border-gray-700">
                        {products.length} productos
                    </span>
                </div>
                <div className="flex items-center space-x-2 no-print">
                    <button onClick={downloadTemplate} className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 flex items-center text-sm">
                         Plantilla CSV
                    </button>
                    <label className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 flex items-center cursor-pointer text-sm">
                        <PlusIcon className="w-4 h-4 mr-1" /> Importar CSV
                        <input type="file" accept=".csv" onChange={handleImportCsv} className="hidden" disabled={isImporting} />
                    </label>
                    <button onClick={handleExport} className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 flex items-center text-sm">
                        <DownloadIcon className="w-4 h-4 mr-1" /> Exportar CSV
                    </button>
                    <button onClick={() => handleOpenModal()} className="bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 flex items-center text-sm">
                        <PlusIcon className="w-4 h-4 mr-1" /> Nuevo Producto
                    </button>
                </div>
            </div>

            <Card noPadding>
                <div className="sticky top-0 z-20 bg-white dark:bg-gray-800 px-6 pt-6 pb-4 no-print flex items-center space-x-4">
                    <div className="flex-1">
                        <input type="text" placeholder="Buscar producto por nombre..." value={filter} onChange={e => setFilter(e.target.value)} className="w-full p-2 border rounded-md dark:bg-gray-700"/>
                    </div>
                    <select value={familyFilter} onChange={e => setFamilyFilter(e.target.value)} className="p-2 border rounded-md dark:bg-gray-700">
                        <option value="">Todas las Familias</option>
                        {uniqueFamilies.map(family => <option key={family} value={family}>{family.toUpperCase()}</option>)}
                    </select>
                    {(filter || familyFilter) && (
                        <div className="text-xs text-gray-500 font-medium whitespace-nowrap">
                            Encontrados: {filteredProducts.length}
                        </div>
                    )}
                </div>
                <div className="overflow-x-auto px-6 pb-6">
                    <table className="w-full text-sm">
                        <thead className="sticky top-[82px] z-10 text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th className="px-4 py-2 text-left w-16">Imagen</th>
                                <th className="px-4 py-2 text-left">Nombre</th>
                                <th className="px-4 py-2 text-left">Mejor Precio</th>
                                <th className="px-4 py-2 text-left">Proveedor Principal</th>
                                <th className="px-4 py-2 text-left">Estado</th>
                                <th className="px-4 py-2 text-left">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map(product => {
                                const bestPriceInfo = getBestPriceInfo(product);
                                return (
                                <tr key={product.id} className="border-b dark:border-gray-700">
                                    <td className="px-4 py-2">
                                        <div className="w-10 h-10 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden border dark:border-gray-600">
                                            {product.image ? (
                                                <img src={product.image} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                            ) : (
                                                <ProductIcon className="w-5 h-5 text-gray-400" />
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-2 font-medium">
                                        <div>{product.name}</div>
                                        {product.unit === 'Uds' && product.unit_size && (
                                            <div className="text-[10px] text-gray-500">
                                                1 ud = {product.unit_size}{product.unit_size_type || 'g'}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-2">
                                        <div className="font-mono text-sm">
                                            {bestPriceInfo.price !== null ? `${bestPriceInfo.price.toFixed(2)}€` : 'N/A'}
                                            <span className="text-xs text-gray-500 ml-1">/{product.unit}</span>
                                        </div>
                                        {bestPriceInfo.price !== null && product.unit === 'Uds' && product.unit_size && (
                                            <div className="text-[10px] text-primary-600 font-semibold">
                                                {(() => {
                                                    const size = product.unit_size;
                                                    const type = product.unit_size_type || 'g';
                                                    let pricePerBase = 0;
                                                    let baseLabel = '';

                                                    if (type === 'g') {
                                                        pricePerBase = (bestPriceInfo.price / size) * 1000;
                                                        baseLabel = 'kg';
                                                    } else if (type === 'kg') {
                                                        pricePerBase = bestPriceInfo.price / size;
                                                        baseLabel = 'kg';
                                                    } else if (type === 'ml') {
                                                        pricePerBase = (bestPriceInfo.price / size) * 1000;
                                                        baseLabel = 'L';
                                                    } else if (type === 'L') {
                                                        pricePerBase = bestPriceInfo.price / size;
                                                        baseLabel = 'L';
                                                    }

                                                    return pricePerBase > 0 ? `(${pricePerBase.toFixed(2)}€/${baseLabel})` : '';
                                                })()}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-2">
                                        {bestPriceInfo.supplierName}
                                        {bestPriceInfo.otherSupplierCount > 0 && (
                                            <span className="ml-2 text-xs bg-gray-200 dark:bg-gray-600 rounded-full px-2 py-0.5">
                                                +{bestPriceInfo.otherSupplierCount}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2">
                                         <span className={`px-2 py-1 text-xs font-semibold rounded-full ${product.status === 'Activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {product.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 space-x-2 no-print">
                                        <button onClick={() => handleOpenModal(product)} className="text-primary-600 hover:underline">Editar</button>
                                        <button onClick={() => handleOpenDeleteModal(product)} className="text-red-600 hover:underline">Eliminar</button>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            </Card>

            {isModalOpen && <ProductFormModal product={selectedProduct} onClose={() => setIsModalOpen(false)} onSave={handleSaveProduct} allProducts={products} allSuppliers={suppliers} />}
            
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirmar Eliminación">
                {deleteStep === 1 ? (
                    <div>
                        <div className="text-center">
                            <WarningIcon className="w-16 h-16 text-red-500 mx-auto"/>
                            <p className="text-lg font-semibold my-4">¿Seguro que quieres eliminar {selectedProduct?.name}?</p>
                            <p className="text-gray-500">Esta acción no se puede deshacer.</p>
                        </div>
                        <div className="mt-6 flex justify-end space-x-3">
                            <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300">Cancelar</button>
                            <button onClick={() => setDeleteStep(2)} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Sí, eliminar</button>
                        </div>
                    </div>
                ) : (
                    <div>
                        <p className="mb-4 text-center">Para confirmar, haz clic de nuevo en el botón de eliminar.</p>
                        <div className="mt-6 flex justify-end">
                             <button onClick={handleDeleteProduct} className="w-full px-4 py-2 bg-red-600 text-white rounded-md">Confirmar Eliminación Permanente</button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};
