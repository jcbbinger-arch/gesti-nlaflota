import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/Card';
import { Recipe, Product, RecipeIngredient, DEFAULT_CATEGORIES } from '../../types';
import { PlusIcon, TrashIcon, PrinterIcon } from '../../components/icons';
import { Modal } from '../../components/Modal';
import { useCompany } from '../../contexts/CompanyContext';
import { calculateIngredientCost, areUnitsCompatible } from '../../lib/unitConverter';
import { ALLERGENS_LIST, ALLERGEN_ICONS } from '../../lib/allergens';
import { AlertTriangle } from 'lucide-react';

export const AllergenSelector: React.FC<{ selected: string[], onChange: (allergens: string[]) => void }> = ({ selected, onChange }) => {
    return (
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-4">
            {ALLERGENS_LIST.map(allergen => {
                const Icon = ALLERGEN_ICONS[allergen] || AlertTriangle;
                const isSelected = selected.includes(allergen);
                return (
                    <button
                        key={allergen}
                        type="button"
                        onClick={() => onChange(isSelected ? selected.filter(a => a !== allergen) : [...selected, allergen])}
                        className={`flex flex-col items-center p-2 rounded-lg border-2 ${isSelected ? 'bg-primary-100 border-primary-500' : 'bg-gray-50 border-gray-200'}`}
                    >
                        <Icon className="w-8 h-8 mb-1" />
                        <span className="text-xs text-center">{allergen}</span>
                    </button>
                );
            })}
        </div>
    );
};

const LabelPreviewModal: React.FC<{ recipe: Recipe, company: any, onClose: () => void }> = ({ recipe, company, onClose }) => {
    const { products } = useData();
    const { currentUser } = useAuth();
    
    // Use teacher profile if available, otherwise fallback to global company info
    const displayInfo = {
        name: currentUser?.instituteName || company.name,
        logo: currentUser?.instituteLogo || company.print_logo,
        teacher: currentUser?.teacherName || '',
        teacherLogo: currentUser?.teacherLogo || ''
    };

    const productsMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);
    const allAllergens = useMemo(() => {
        const allergens = new Set<string>();
        recipe.ingredients.forEach(ing => {
            const product = productsMap.get(ing.product_id);
            product?.allergens.forEach(a => allergens.add(a));
        });
        recipe.selected_allergens?.forEach(a => allergens.add(a));
        return Array.from(allergens);
    }, [recipe.ingredients, recipe.selected_allergens, productsMap]);

    const printLabel = () => {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            const labelContent = document.getElementById('label-content')?.innerHTML;
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Imprimir Etiqueta</title>
                        <script src="https://cdn.tailwindcss.com"></script>
                        <style>
                            @media print {
                                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                            }
                        </style>
                    </head>
                    <body class="font-sans">${labelContent}</body>
                </html>
            `);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => { // Timeout needed for content to render in some browsers
                 printWindow.print();
                 printWindow.close();
            }, 250);
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="Previsualización de Etiqueta" size="sm">
            <div id="label-content" className="w-full max-w-sm mx-auto border-2 border-black p-3 space-y-2 text-xs bg-white text-black">
                <div className="flex items-center justify-between border-b border-black pb-2">
                    <div className="flex items-center space-x-2">
                        <img src={displayInfo.logo} alt="Logo" className="h-10 w-auto" />
                        <h1 className="font-bold text-[10px] leading-tight max-w-[120px]">{displayInfo.name}</h1>
                    </div>
                    {displayInfo.teacherLogo && (
                        <div className="flex flex-col items-end">
                            <img src={displayInfo.teacherLogo} alt="Teacher Logo" className="h-8 w-auto" />
                            <span className="text-[8px] italic">{displayInfo.teacher}</span>
                        </div>
                    )}
                </div>
                <div>
                    <h2 className="text-center font-bold text-base uppercase tracking-wide">{recipe.name}</h2>
                </div>
                <div>
                    <p><span className="font-bold">Fecha de elaboración:</span> {new Date().toLocaleDateString()}</p>
                </div>
                <div className="border-t border-black pt-1">
                    <p><span className="font-bold">Ingredientes:</span> {recipe.ingredients.map(i => productsMap.get(i.product_id)?.name).join(', ')}.</p>
                </div>
                {allAllergens.length > 0 && (
                     <div className="border-t border-black pt-1">
                        <p><span className="font-bold">ALÉRGENOS:</span> <span className="font-bold uppercase">{allAllergens.join(', ')}</span>.</p>
                    </div>
                )}
            </div>
             <div className="flex justify-end space-x-2 mt-6 no-print">
                <button onClick={onClose} className="bg-gray-500 text-white px-4 py-2 rounded-md">Cerrar</button>
                <button onClick={printLabel} className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center"><PrinterIcon className="w-4 h-4 mr-2"/>Imprimir</button>
            </div>
        </Modal>
    );
};

export const RecipeForm: React.FC = () => {
    const { recipeId } = useParams<{ recipeId?: string }>();
    const navigate = useNavigate();
    const { recipes, setRecipes, products, workspaceSettings } = useData();
    const { currentUser } = useAuth();
    const { companyInfo } = useCompany();

    const categories = useMemo(() => workspaceSettings?.categories || DEFAULT_CATEGORIES, [workspaceSettings]);

    const [formState, setFormState] = useState<Omit<Recipe, 'id' | 'author_id'>>({
        name: '', description: '', photo: '', yield_amount: 1, yield_unit: 'raciones', category: '',
        ingredients: [], preparation_steps: '', key_points: '', is_public: false, cost: 0, price: 0,
        custom_section: { title: '', content: '' },
        presentation: '',
        temperature: 'Caliente',
        recommended_marking: '',
        service_type: '',
        client_description: '',
        service_time: '',
        selected_allergens: [],
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [showLabelPreview, setShowLabelPreview] = useState(false);

    const productsMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);

    useEffect(() => {
        if (recipeId) {
            const existingRecipe = recipes.find(r => r.id === recipeId);
            if (existingRecipe) {
                // Recalculate costs for all ingredients to ensure they are up to date
                const updatedIngredients = existingRecipe.ingredients.map(ing => {
                    const product = productsMap.get(ing.product_id);
                    if (product) {
                        const price = product.suppliers.sort((a,b) => a.price - b.price)[0]?.price || 0;
                        return {
                            ...ing,
                            cost: calculateIngredientCost(ing.quantity, ing.unit, price, product.unit)
                        };
                    }
                    return ing;
                });
                setFormState({ ...existingRecipe, ingredients: updatedIngredients });
            }
        }
    }, [recipeId, recipes, productsMap]);
    
    const filteredProducts = useMemo(() => {
        if (!searchTerm) return [];
        return products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) && p.status === 'Activo');
    }, [searchTerm, products]);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (name === 'custom_section_title') {
            setFormState(prev => ({ ...prev, custom_section: { ...prev.custom_section!, title: value } }));
        } else if (name === 'custom_section_content') {
            setFormState(prev => ({ ...prev, custom_section: { ...prev.custom_section!, content: value } }));
        } else {
            setFormState(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
        }
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onloadend = () => setFormState(prev => ({ ...prev, photo: reader.result as string }));
            reader.readAsDataURL(e.target.files[0]);
        }
    };
    
    const addIngredient = (product: Product) => {
        if (!formState.ingredients.some(i => i.product_id === product.id)) {
            const price = product.suppliers.sort((a,b) => a.price - b.price)[0]?.price || 0;
            const cost = calculateIngredientCost(1, product.unit, price, product.unit);
            const newIngredient: RecipeIngredient = { 
                product_id: product.id, 
                quantity: 1, 
                unit: product.unit,
                cost: cost
            };
            setFormState(prev => ({...prev, ingredients: [...prev.ingredients, newIngredient]}));
        }
        setSearchTerm('');
    };
    
    const handleIngredientChange = (index: number, field: 'quantity' | 'unit', value: string | number) => {
        const newIngredients = [...formState.ingredients];
        const ing = { ...newIngredients[index], [field]: value };
        
        const product = productsMap.get(ing.product_id);
        if (product) {
            const price = product.suppliers.sort((a,b) => a.price - b.price)[0]?.price || 0;
            ing.cost = calculateIngredientCost(ing.quantity, ing.unit, price, product.unit);
        }
        
        newIngredients[index] = ing;
        setFormState(prev => ({...prev, ingredients: newIngredients}));
    };

    const removeIngredient = (index: number) => {
        setFormState(prev => ({...prev, ingredients: prev.ingredients.filter((_, i) => i !== index)}));
    };
    
    const calculatedCost = useMemo(() => {
        return formState.ingredients.reduce((total, ing) => {
            return total + (ing.cost || 0);
        }, 0);
    }, [formState.ingredients]);

    const costPerServing = (calculatedCost / (formState.yield_amount || 1));

    const allAllergens = useMemo(() => {
        const allergens = new Set<string>();
        formState.ingredients.forEach(ing => {
            const product = productsMap.get(ing.product_id);
            product?.allergens.forEach(a => allergens.add(a));
        });
        return Array.from(allergens);
    }, [formState.ingredients, productsMap]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!currentUser) return;
        
        const recipeToSave: Recipe = {
            id: recipeId || `rec-${Date.now()}`,
            author_id: currentUser.id,
            ...formState,
            cost: calculatedCost
        };
        
        const newRecipes = recipeId 
            ? recipes.map(r => r.id === recipeId ? recipeToSave : r)
            : [...recipes, recipeToSave];
        
        setRecipes(newRecipes);
        navigate('/teacher/recipes');
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6">{recipeId ? 'Editar' : 'Nueva'} Ficha de Receta</h1>
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Columna Izquierda y Central */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="md:w-1/3">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Foto de la Ficha</label>
                                    <div className="mt-1 aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                                        {formState.photo ? <img src={formState.photo} alt="Vista previa" className="object-cover w-full h-full rounded-lg"/> : <span className="text-gray-400">Sin foto</span>}
                                    </div>
                                    <input type="file" accept="image/*" onChange={handlePhotoChange} className="mt-2 text-sm"/>
                                </div>
                                <div className="md:w-2/3 space-y-4">
                                    <input type="text" placeholder="Nombre de la Ficha" value={formState.name} onChange={handleFormChange} name="name" required className="w-full text-xl font-bold p-2 border-b-2"/>
                                    <div className="flex gap-4 items-center">
                                        <input type="number" placeholder="Raciones" value={formState.yield_amount} onChange={handleFormChange} name="yield_amount" min="1" className="w-1/3 p-2 border rounded"/>
                                        <input type="text" placeholder="Unidad" value={formState.yield_unit} onChange={handleFormChange} name="yield_unit" className="w-1/3 p-2 border rounded"/>
                                        <div className="w-1/3 flex items-center space-x-2">
                                            <select 
                                                name="category" 
                                                value={formState.category} 
                                                onChange={handleFormChange} 
                                                className="flex-1 p-2 border rounded dark:bg-gray-700"
                                                required
                                            >
                                                <option value="">Categoría</option>
                                                {categories.map(cat => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                            </select>
                                            {formState.category && workspaceSettings?.categoryConfigs?.find(c => c.name === formState.category) && (
                                                <div className="flex -space-x-2">
                                                    {workspaceSettings.categoryConfigs.find(c => c.name === formState.category)?.colors.map((color, i) => (
                                                        <div key={i} className="w-4 h-4 rounded-full border border-white shadow-sm" style={{ backgroundColor: color }} />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <textarea placeholder="Descripción corta" value={formState.description} onChange={handleFormChange} name="description" rows={2} className="w-full p-2 border rounded" />
                                </div>
                            </div>
                        </Card>

                        <Card title="Ingredientes (del Almacén Central)">
                            <div className="relative mb-4">
                                <input type="text" placeholder="Buscar producto para añadir..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700"/>
                                {searchTerm && (
                                    <ul className="absolute z-10 w-full bg-white dark:bg-gray-800 border rounded-b-md shadow-lg max-h-40 overflow-y-auto">
                                        {filteredProducts.map(p => <li key={p.id} onClick={() => addIngredient(p)} className="p-2 hover:bg-primary-100 cursor-pointer">{p.name}</li>)}
                                        {filteredProducts.length === 0 && <li className="p-2 text-gray-500">No se encontraron productos</li>}
                                    </ul>
                                )}
                            </div>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {formState.ingredients.map((ing, index) => {
                                    const product = productsMap.get(ing.product_id);
                                    const isCompatible = areUnitsCompatible(ing.unit, product?.unit || '');
                                    
                                    return (
                                        <div key={ing.product_id} className="grid grid-cols-12 gap-2 items-center">
                                            <span className="col-span-4 truncate" title={product?.name}>{product?.name}</span>
                                            <input 
                                                type="number" 
                                                step="0.01" 
                                                value={ing.quantity} 
                                                onChange={e => handleIngredientChange(index, 'quantity', parseFloat(e.target.value))} 
                                                className="col-span-2 p-1 border rounded dark:bg-gray-700"
                                            />
                                            <select 
                                                value={ing.unit} 
                                                onChange={e => handleIngredientChange(index, 'unit', e.target.value)} 
                                                className="col-span-2 p-1 border rounded dark:bg-gray-700"
                                            >
                                                <option value="kg">kg</option>
                                                <option value="g">g</option>
                                                <option value="l">l</option>
                                                <option value="ml">ml</option>
                                                <option value="ud">ud</option>
                                                <option value="unidad">unidad</option>
                                            </select>
                                            <span className={`col-span-2 text-right font-mono text-sm ${!isCompatible ? 'text-red-500' : ''}`}>
                                                {(ing.cost || 0).toFixed(2)}€
                                            </span>
                                            <div className="col-span-2 flex justify-end items-center space-x-1">
                                                {!isCompatible && (
                                                    <span className="text-red-500 cursor-help" title="Unidades incompatibles (Peso vs Volumen)">⚠️</span>
                                                )}
                                                <button type="button" onClick={() => removeIngredient(index)} className="text-red-500 p-1">
                                                    <TrashIcon className="w-5 h-5"/>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>

                        <Card title="Elaboración">
                            <textarea placeholder="Pasos detallados de la receta..." value={formState.preparation_steps} onChange={handleFormChange} name="preparation_steps" rows={10} required className="w-full p-2 border rounded" />
                        </Card>
                        
                        <Card title="Instrucciones de Servicio">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium">Presentación (plato, copa...)</label>
                                    <input type="text" name="presentation" value={formState.presentation || ''} onChange={handleFormChange} className="mt-1 block w-full p-2 border rounded" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Temperatura de Servicio</label>
                                    <select name="temperature" value={formState.temperature || 'Caliente'} onChange={handleFormChange} className="mt-1 block w-full p-2 border rounded">
                                        <option value="Caliente">Caliente</option>
                                        <option value="Frio">Frío</option>
                                        <option value="Ambiente">Ambiente</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Marcaje Recomendado</label>
                                    <input type="text" name="recommended_marking" value={formState.recommended_marking || ''} onChange={handleFormChange} className="mt-1 block w-full p-2 border rounded" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Tiempo de Pase</label>
                                    <input type="text" name="service_time" value={formState.service_time || ''} placeholder="Ej: 5 min" onChange={handleFormChange} className="mt-1 block w-full p-2 border rounded" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium">Tipo de Servicio</label>
                                    <input type="text" name="service_type" value={formState.service_type || ''} placeholder="Inglesa, salseado, terminado en sala..." onChange={handleFormChange} className="mt-1 block w-full p-2 border rounded" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium">Breve Descripción para el Cliente</label>
                                    <textarea name="client_description" value={formState.client_description || ''} rows={3} onChange={handleFormChange} className="mt-1 block w-full p-2 border rounded" />
                                </div>
                            </div>
                        </Card>

                        <Card title="Notas Importantes">
                            <textarea placeholder="Advertencias, maridajes, conservación, etc." value={formState.key_points} onChange={handleFormChange} name="key_points" rows={3} className="w-full p-2 border rounded" />
                        </Card>

                        <Card title={<input type="text" value={formState.custom_section?.title || ''} onChange={handleFormChange} name="custom_section_title" placeholder="Título de Sección Personalizable" className="text-xl font-bold p-1 w-full"/>}>
                             <textarea placeholder="Contenido de la sección personalizable..." value={formState.custom_section?.content || ''} onChange={handleFormChange} name="custom_section_content" rows={3} className="w-full p-2 border rounded" />
                        </Card>
                    </div>

                    {/* Columna Derecha */}
                    <div className="space-y-6">
                        <Card title="Coste y Alérgenos">
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm">Coste Total</p>
                                    <p className="font-bold text-lg">{calculatedCost.toLocaleString('es-ES', {style: 'currency', currency: 'EUR'})}</p>
                                </div>
                                <div>
                                    <p className="text-sm">Coste por Ración</p>
                                    <p className="font-bold text-lg">{costPerServing.toLocaleString('es-ES', {style: 'currency', currency: 'EUR'})}</p>
                                </div>
                                <div>
                                    <label>Precio de Venta</label>
                                    <input type="number" step="0.01" placeholder="Precio" value={formState.price} onChange={handleFormChange} name="price" required className="w-full mt-1 p-2 border rounded"/>
                                </div>
                                <div className="border-t pt-4">
                                    <h4 className="font-semibold mb-2">Seleccionar Alérgenos</h4>
                                    <AllergenSelector 
                                        selected={formState.selected_allergens || []} 
                                        onChange={(allergens) => setFormState({...formState, selected_allergens: allergens})} 
                                    />
                                </div>
                                <div className="border-t pt-4">
                                    <h4 className="font-semibold mb-2">Alérgenos Detectados (Ingredientes)</h4>
                                    {allAllergens.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {allAllergens.map(a => <span key={a} className="bg-yellow-200 text-yellow-800 text-xs font-semibold px-2 py-1 rounded-full">{a}</span>)}
                                        </div>
                                    ) : <p className="text-sm text-gray-500">Sin alérgenos detectados.</p>}
                                </div>
                            </div>
                        </Card>
                        
                        <Card title="Acciones">
                            <div className="space-y-3">
                                <label className="flex items-center">
                                    <input type="checkbox" checked={formState.is_public} onChange={e => setFormState({...formState, is_public: e.target.checked})} className="h-4 w-4 rounded" />
                                    <span className="ml-2 text-sm">Hacer ficha pública para otros profesores</span>
                                </label>
                                <button type="submit" className="w-full bg-primary-600 text-white py-3 rounded-md hover:bg-primary-700 font-bold">Guardar Ficha</button>
                                <button type="button" onClick={() => setShowLabelPreview(true)} className="w-full bg-gray-700 text-white py-2 rounded-md hover:bg-gray-800 flex items-center justify-center">
                                    <PrinterIcon className="w-5 h-5 mr-2"/> Generar Etiqueta
                                </button>
                                <button type="button" onClick={() => navigate('/teacher/recipes')} className="w-full bg-gray-200 dark:bg-gray-600 py-2 rounded-md hover:bg-gray-300">Cancelar</button>
                            </div>
                        </Card>
                    </div>
                </div>
            </form>
            {showLabelPreview && <LabelPreviewModal recipe={formState as Recipe} company={companyInfo} onClose={() => setShowLabelPreview(false)} />}
        </div>
    );
};
