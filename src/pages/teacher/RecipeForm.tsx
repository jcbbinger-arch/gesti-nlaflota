import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/Card';
import { Recipe, Product, RecipeIngredient, DEFAULT_CATEGORIES, SubPreparation } from '../../types';
import { PlusIcon, TrashIcon, PrinterIcon } from '../../components/icons';
import { Modal } from '../../components/Modal';
import { useCompany } from '../../contexts/CompanyContext';
import { calculateIngredientCost, areUnitsCompatible } from '../../lib/unitConverter';
import { ALLERGENS_LIST, ALLERGEN_ICONS, ALLERGEN_COLORS } from '../../lib/allergens';
import { AllergensControl } from '../../components/AllergensControl';
import { compressImage } from '../../lib/imageCompression';
import { ChefHat, Sparkles, ScanText, ImageIcon, AlertTriangle, Wand2, Terminal } from 'lucide-react';
import { AIHubModal } from '../../components/AIHubModal';
import { AIDigitalizedRecipe } from '../../services/geminiService';

export const AllergenSelector: React.FC<{ selected: string[], onChange: (allergens: string[]) => void }> = ({ selected, onChange }) => {
    return (
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-3">
            {ALLERGENS_LIST.map(allergen => {
                const Icon = ALLERGEN_ICONS[allergen] || AlertTriangle;
                const color = ALLERGEN_COLORS[allergen];
                const isSelected = selected.includes(allergen);
                return (
                    <button
                        key={allergen}
                        type="button"
                        onClick={() => onChange(isSelected ? selected.filter(a => a !== allergen) : [...selected, allergen])}
                        className={`flex flex-col items-center p-2 rounded-xl border-2 transition-all group ${isSelected ? 'border-primary-500 bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700 border-transparent opacity-50'}`}
                    >
                        <div 
                            className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 shadow-sm transition-transform group-hover:scale-110 ${!isSelected ? 'grayscale opacity-50' : ''}`}
                            style={{ backgroundColor: isSelected ? color : '#9ca3af' }}
                        >
                            <Icon className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-[8px] font-black uppercase text-center text-gray-500 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white truncate w-full">{allergen}</span>
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
        
        // Main ingredients
        recipe.ingredients.forEach(ing => {
            const product = productsMap.get(ing.product_id);
            product?.allergens.forEach(a => allergens.add(a));
        });

        // Sub-preparation ingredients
        recipe.sub_preparations?.forEach(sub => {
            sub.ingredients.forEach(ing => {
                const product = productsMap.get(ing.product_id);
                product?.allergens.forEach(a => allergens.add(a));
            });
        });

        recipe.selected_allergens?.forEach(a => allergens.add(a));
        return Array.from(allergens);
    }, [recipe.ingredients, recipe.selected_allergens, recipe.sub_preparations, productsMap]);

    const allIngredientsList = useMemo(() => {
        const names: string[] = [];
        recipe.ingredients.forEach(i => {
            const p = productsMap.get(i.product_id);
            const isSubPrep = recipe.sub_preparations?.some(sub => sub.name.toLowerCase() === i.product_id.toLowerCase());
            if (p) names.push(p.name);
            else if (isSubPrep) names.push(i.product_id);
            else names.push(i.product_id.toUpperCase()); // Bold/Caps for unidentified in label context
        });
        recipe.sub_preparations?.forEach(sub => {
            sub.ingredients.forEach(i => {
                const p = productsMap.get(i.product_id);
                const isSubPrep = recipe.sub_preparations?.some(s => s.name.toLowerCase() === i.product_id.toLowerCase());
                if (p) names.push(p.name);
                else if (isSubPrep) names.push(i.product_id);
                else names.push(i.product_id.toUpperCase());
            });
        });
        return Array.from(new Set(names)).join(', ');
    }, [recipe.ingredients, recipe.sub_preparations, productsMap]);

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
                    <p><span className="font-bold">Ingredientes:</span> {allIngredientsList}.</p>
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
        temperature: '',
        recommended_marking: '',
        service_type: '',
        client_description: '',
        service_explanation: '',
        cutlery_required: '',
        service_time: '',
        selected_allergens: [],
        service_checklist: [],
        sub_preparations: [],
        chemical_analysis: '',
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [linkingIndex, setLinkingIndex] = useState<{ tab: number; index: number } | null>(null);
    const [showLabelPreview, setShowLabelPreview] = useState(false);
    const [showAIHub, setShowAIHub] = useState(false);
    const [aiHubTab, setAiHubTab] = useState<'digitalize' | 'molecular'>('digitalize');
    const [activeElabTab, setActiveElabTab] = useState<-1 | number>(-1); // -1 for main, index for sub_preparations

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

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64 = reader.result as string;
                try {
                    // Compress to max 800px width, 70% quality
                    const compressed = await compressImage(base64, 800, 0.7);
                    setFormState(prev => ({ ...prev, photo: compressed }));
                } catch (error) {
                    console.error("Error compressing image:", error);
                    setFormState(prev => ({ ...prev, photo: base64 }));
                }
            };
            reader.readAsDataURL(file);
        }
    };
    
    const addIngredient = (product: Product) => {
        const price = product.suppliers.sort((a,b) => a.price - b.price)[0]?.price || 0;
        const cost = calculateIngredientCost(1, product.unit, price, product.unit);
        
        if (linkingIndex) {
            const { tab, index } = linkingIndex;
            const newIngredient: RecipeIngredient = { 
                product_id: product.id, 
                quantity: 1, 
                unit: product.unit,
                cost: cost
            };

            if (tab === -1) {
                const newIngredients = [...formState.ingredients];
                newIngredients[index] = newIngredient;
                setFormState(prev => ({...prev, ingredients: newIngredients}));
            } else {
                const subs = [...(formState.sub_preparations || [])];
                subs[tab].ingredients[index] = newIngredient;
                setFormState(prev => ({...prev, sub_preparations: subs}));
            }
            setLinkingIndex(null);
        } else {
            const newIngredient: RecipeIngredient = { 
                product_id: product.id, 
                quantity: 1, 
                unit: product.unit,
                cost: cost
            };

            if (activeElabTab === -1) {
                if (!formState.ingredients.some(i => i.product_id === product.id)) {
                    setFormState(prev => ({...prev, ingredients: [...prev.ingredients, newIngredient]}));
                }
            } else {
                const subs = [...(formState.sub_preparations || [])];
                if (!subs[activeElabTab].ingredients.some(i => i.product_id === product.id)) {
                    subs[activeElabTab].ingredients.push(newIngredient);
                    setFormState(prev => ({...prev, sub_preparations: subs}));
                }
            }
        }
        setSearchTerm('');
    };

    const addGenericIngredient = () => {
        if (!searchTerm.trim()) return;
        const newIngredient: RecipeIngredient = { 
            product_id: searchTerm, 
            quantity: 1, 
            unit: 'ud',
            cost: 0
        };

        if (activeElabTab === -1) {
            setFormState(prev => ({...prev, ingredients: [...prev.ingredients, newIngredient]}));
        } else {
            const subs = [...(formState.sub_preparations || [])];
            subs[activeElabTab].ingredients.push(newIngredient);
            setFormState(prev => ({...prev, sub_preparations: subs}));
        }
        setSearchTerm('');
    };
    
    const handleIngredientChange = (index: number, field: 'quantity' | 'unit', value: string | number) => {
        if (activeElabTab === -1) {
            const newIngredients = [...formState.ingredients];
            const ing = { ...newIngredients[index], [field]: value };
            
            const product = productsMap.get(ing.product_id);
            if (product) {
                const price = product.suppliers.sort((a,b) => a.price - b.price)[0]?.price || 0;
                ing.cost = calculateIngredientCost(ing.quantity, ing.unit, price, product.unit);
            }
            
            newIngredients[index] = ing;
            setFormState(prev => ({...prev, ingredients: newIngredients}));
        } else {
            const subs = [...(formState.sub_preparations || [])];
            const newIngredients = [...subs[activeElabTab].ingredients];
            const ing = { ...newIngredients[index], [field]: value };
            
            const product = productsMap.get(ing.product_id);
            if (product) {
                const price = product.suppliers.sort((a,b) => a.price - b.price)[0]?.price || 0;
                ing.cost = calculateIngredientCost(ing.quantity, ing.unit, price, product.unit);
            }
            
            newIngredients[index] = ing;
            subs[activeElabTab].ingredients = newIngredients;
            setFormState(prev => ({...prev, sub_preparations: subs}));
        }
    };

    const removeIngredient = (index: number) => {
        if (activeElabTab === -1) {
            setFormState(prev => ({...prev, ingredients: prev.ingredients.filter((_, i) => i !== index)}));
        } else {
            const subs = [...(formState.sub_preparations || [])];
            subs[activeElabTab].ingredients = subs[activeElabTab].ingredients.filter((_, i) => i !== index);
            setFormState(prev => ({...prev, sub_preparations: subs}));
        }
    };
    
    const calculatedCost = useMemo(() => {
        let total = formState.ingredients.reduce((acc, ing) => acc + (ing.cost || 0), 0);
        if (formState.sub_preparations) {
            formState.sub_preparations.forEach(sub => {
                total += sub.ingredients.reduce((acc, ing) => acc + (ing.cost || 0), 0);
            });
        }
        return total;
    }, [formState.ingredients, formState.sub_preparations]);

    const costPerServing = (calculatedCost / (formState.yield_amount || 1));

    const allAllergens = useMemo(() => {
        const allergens = new Set<string>();
        formState.ingredients.forEach(ing => {
            const product = productsMap.get(ing.product_id);
            product?.allergens.forEach(a => allergens.add(a));
        });
        if (formState.sub_preparations) {
            formState.sub_preparations.forEach(sub => {
                sub.ingredients.forEach(ing => {
                    const product = productsMap.get(ing.product_id);
                    product?.allergens.forEach(a => allergens.add(a));
                });
            });
        }
        return Array.from(allergens);
    }, [formState.ingredients, formState.sub_preparations, productsMap]);

    const addSubPreparation = () => {
        const newSub: SubPreparation = {
            id: `sub-${Date.now()}`,
            name: `Nueva Elaboración ${ (formState.sub_preparations?.length || 0) + 2}`,
            ingredients: [],
            preparation_steps: ''
        };
        setFormState(prev => ({
            ...prev,
            sub_preparations: [...(prev.sub_preparations || []), newSub]
        }));
        setActiveElabTab((formState.sub_preparations?.length || 0));
    };

    const removeSubPreparation = (index: number) => {
        const subs = (formState.sub_preparations || []).filter((_, i) => i !== index);
        setFormState(prev => ({ ...prev, sub_preparations: subs }));
        setActiveElabTab(-1);
    };

    const handleSubPrepChange = (index: number, field: keyof SubPreparation, value: any) => {
        const subs = [...(formState.sub_preparations || [])];
        subs[index] = { ...subs[index], [field]: value };
        setFormState(prev => ({ ...prev, sub_preparations: subs }));
    };

    const handleAIImport = (jsonString: string) => {
        try {
            // Clean JSON string from potential markdown backticks or AI citation tags
            const cleanJson = jsonString
                .replace(/```json/g, '')
                .replace(/```/g, '')
                .replace(/\[cite\]/g, '')
                .replace(/\[cite_start\]/g, '')
                .replace(/\[cite_end\]/g, '')
                .replace(/\\n/g, '\n') // Handle escaped newlines
                .trim();

            // Extract just the { ... } part in case there is noise
            const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
            const finalJson = jsonMatch ? jsonMatch[0] : cleanJson;
            
            const aiData = JSON.parse(finalJson);

            // Handle Molecular Data if present but don't return early if it also has recipe data
            if (aiData.molecularData) {
                const molecularText = `
--- ANÁLISIS MOLECULAR ---
Compuestos: ${aiData.molecularData.compounds?.join(', ')}
Afinidades: ${aiData.molecularData.affinities?.join(', ')}
Maridaje: ${aiData.molecularData.pairingSuggestion}
Técnica: ${aiData.molecularData.vanguardTechnique}
Justificación: ${aiData.molecularData.scientificJustification}
`.trim();

                setFormState(prev => ({
                    ...prev,
                    chemical_analysis: (prev.chemical_analysis ? prev.chemical_analysis + '\n\n' : '') + molecularText
                }));
                // If it ONLY has molecular data, we return. If it has recipe data (like 'name'), we continue.
                if (!aiData.name && !aiData.nombre) return;
            }

            // Map AI keys to Form keys (Support English and Spanish)
            const getVal = (...keys: string[]) => {
                for (const key of keys) {
                    if (aiData[key] !== undefined) return aiData[key];
                }
                return undefined;
            };

            const name = getVal('name', 'nombre', 'title', 'titulo');
            const instructions = getVal('instructions', 'instrucciones', 'preparation_steps', 'elaboracion', 'pasos');
            const notes = getVal('notes', 'notas', 'key_points', 'puntos_clave', 'consejos');
            const checklist = getVal('serviceChecklist', 'checklist', 'mise_en_place', 'comprobaciones');
            const yieldQty = getVal('yieldQuantity', 'yield_amount', 'cantidad_pax', 'pax', 'raciones', 'produccion');
            const yieldUnit = getVal('yieldUnit', 'unidad_produccion', 'unidad');
            const category = getVal('category', 'categoria');
            const presentation = getVal('presentation', 'presentacion', 'emplatado');
            const temp = getVal('servingTemp', 'temperature', 'temperatura', 'temp');
            const clientDesc = getVal('clientDescription', 'description', 'descripcion_cliente', 'descripcion');
            const serviceExp = getVal('serviceExplanation', 'explicacion_servicio', 'storytelling');
            const serviceType = getVal('serviceType', 'serviceTechnique', 'tipo_servicio', 'tecnica');
            const cutlery = getVal('cutlery', 'cutlery_required', 'cuberteria', 'marcaje');
            const serviceTime = getVal('serviceTime', 'service_time', 'tiempo_pase', 'tiempo');

            // Standard Digitalize
            const importedIngredients: RecipeIngredient[] = [];
            const ingList = aiData.ingredients || aiData.ingredientes || [];
            
            if (Array.isArray(ingList)) {
                ingList.forEach((aiIng: any) => {
                    const ingName = aiIng.name || aiIng.nombre || aiIng.producto || '';
                    if (!ingName) return;

                    // Try improved matching
                    const matchingProduct = products.find(p => 
                        p.name.toLowerCase() === ingName.toLowerCase() ||
                        p.name.toLowerCase().includes(ingName.toLowerCase()) ||
                        ingName.toLowerCase().includes(p.name.toLowerCase())
                    );

                    if (matchingProduct) {
                        const price = matchingProduct.suppliers.sort((a,b) => a.price - b.price)[0]?.price || 0;
                        const rawQty = aiIng.quantity || aiIng.cantidad || 0;
                        const qty = typeof rawQty === 'string' ? parseFloat(rawQty) : rawQty;
                        const unit = aiIng.unit || aiIng.unidad || matchingProduct.unit;
                        
                        const cost = calculateIngredientCost(qty, unit, price, matchingProduct.unit);
                        importedIngredients.push({
                            product_id: matchingProduct.id,
                            quantity: qty,
                            unit: unit,
                            cost
                        });
                    } else {
                        // Add as unlinked ingredient
                        const rawQty = aiIng.quantity || aiIng.cantidad || 0;
                        const qty = typeof rawQty === 'string' ? parseFloat(rawQty) : rawQty;
                        importedIngredients.push({
                            product_id: ingName, // Store name as ID for unlinked
                            quantity: qty,
                            unit: aiIng.unit || aiIng.unidad || 'ud',
                            cost: 0
                        });
                    }
                });
            }

            setFormState(prev => ({
                ...prev,
                name: name || prev.name,
                yield_amount: (typeof yieldQty === 'string' ? parseFloat(yieldQty) : yieldQty) || prev.yield_amount || 1,
                yield_unit: yieldUnit || prev.yield_unit,
                category: (category && categories.includes(category)) ? category : prev.category,
                preparation_steps: instructions || prev.preparation_steps,
                key_points: notes || (aiData.molecularData ? prev.key_points : prev.key_points), // Molecular already updated key_points
                presentation: presentation || prev.presentation,
                temperature: temp || prev.temperature,
                client_description: clientDesc || prev.client_description,
                service_explanation: serviceExp || prev.service_explanation,
                service_type: serviceType || prev.service_type,
                cutlery_required: cutlery || prev.cutlery_required,
                service_time: serviceTime || prev.service_time,
                service_checklist: checklist || prev.service_checklist || [],
                ingredients: importedIngredients.length > 0 ? importedIngredients : prev.ingredients
            }));

            if (importedIngredients.length > 0) {
                const unlinkedCount = importedIngredients.filter(i => !productsMap.has(i.product_id)).length;
                if (unlinkedCount > 0) {
                    alert(`Se han importado ${importedIngredients.length} ingredientes, de los cuales ${unlinkedCount} no se han podido vincular automáticamente con productos de tu almacén. Aparecerán en rojo.`);
                }
            }
        } catch (error) {
            console.error("Import Error:", error);
            alert("El código pegado no es un JSON válido o tiene errores estructurales.");
        }
    };

    const handlePasteImage = async (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                if (blob) {
                    const reader = new FileReader();
                    reader.onloadend = async () => {
                        const base64 = reader.result as string;
                        try {
                            const compressed = await compressImage(base64);
                            setFormState(prev => ({ ...prev, photo: compressed }));
                        } catch (error) {
                            console.error('Paste error:', error);
                        }
                    };
                    reader.readAsDataURL(blob);
                }
            }
        }
    };

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
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{recipeId ? 'Editar' : 'Nueva'} Ficha de Receta</h1>
                <div className="flex space-x-2">
                    <button 
                        type="button" 
                        onClick={() => {
                            setAiHubTab('digitalize');
                            setShowAIHub(true);
                        }}
                        className="flex items-center px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-200 transition-all"
                    >
                        <ScanText className="w-4 h-4 mr-2" /> Digitalizar AI
                    </button>
                    <button 
                        type="button" 
                        onClick={() => {
                            setAiHubTab('molecular');
                            setShowAIHub(true);
                        }}
                        className="flex items-center px-4 py-2 bg-purple-100 text-purple-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-purple-200 transition-all"
                    >
                        <Sparkles className="w-4 h-4 mr-2" /> Flavor Lab
                    </button>
                </div>
            </div>
            
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Columna Izquierda y Central */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card noPadding>
                            <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x dark:divide-gray-700">
                                {/* Foto de la Ficha */}
                                <div className="md:w-5/12 p-6 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800/50 rounded-l-xl">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 self-start">Foto de la Ficha</h3>
                                    <div 
                                        className="relative group w-full aspect-square bg-white dark:bg-gray-700 rounded-xl shadow-inner border-2 border-dashed border-gray-200 dark:border-gray-600 flex items-center justify-center overflow-hidden transition-all hover:border-primary-400"
                                        onPaste={handlePasteImage}
                                        tabIndex={0}
                                    >
                                        {formState.photo ? (
                                            <>
                                                <img src={formState.photo} alt="Vista previa" className="object-cover w-full h-full"/>
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <label className="cursor-pointer bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-white text-xs font-bold hover:bg-white/30 transition-colors">
                                                        Cambiar Imagen (Ctrl+V)
                                                        <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden"/>
                                                    </label>
                                                </div>
                                            </>
                                        ) : (
                                            <label className="cursor-pointer flex flex-col items-center p-8 text-center group">
                                                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                                    <ImageIcon className="w-8 h-8 text-gray-400" />
                                                </div>
                                                <span className="text-sm font-bold text-gray-400">Sin foto</span>
                                                <span className="text-[10px] text-gray-400 mt-1 uppercase tracking-tight">Haz clic o pega (Ctrl+V)</span>
                                                <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden"/>
                                            </label>
                                        )}
                                    </div>
                                    <div className="mt-4 w-full">
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            onChange={handlePhotoChange} 
                                            id="main-photo-upload"
                                            className="hidden"
                                        />
                                        <label 
                                            htmlFor="main-photo-upload"
                                            className="block w-full text-center px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 transition-colors cursor-pointer"
                                        >
                                            Seleccionar archivo
                                        </label>
                                    </div>
                                </div>
                                
                                {/* Info Principal */}
                                <div className="md:w-7/12 p-6 space-y-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Nombre de la Receta</label>
                                            <input 
                                                type="text" 
                                                placeholder="Nombre de la Ficha" 
                                                value={formState.name} 
                                                onChange={handleFormChange} 
                                                name="name" 
                                                required 
                                                className="w-full text-2xl font-black p-0 border-none focus:ring-0 placeholder:text-gray-300 bg-transparent dark:text-white"
                                            />
                                        </div>
                                        
                                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Producción</label>
                                                <div className="flex items-center space-x-2">
                                                    <input 
                                                        type="number" 
                                                        value={formState.yield_amount || 0} 
                                                        onChange={handleFormChange} 
                                                        name="yield_amount" 
                                                        min="1" 
                                                        className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl font-bold"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Unidad</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="raciones" 
                                                    value={formState.yield_unit} 
                                                    onChange={handleFormChange} 
                                                    name="yield_unit" 
                                                    className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl font-bold"
                                                />
                                            </div>
                                            <div className="col-span-2 lg:col-span-1">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Categoría</label>
                                                <select 
                                                    name="category" 
                                                    value={formState.category} 
                                                    onChange={handleFormChange} 
                                                    className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl font-bold appearance-none"
                                                    required
                                                >
                                                    <option value="">Categoría</option>
                                                    {categories.map(cat => (
                                                        <option key={cat} value={cat}>{cat}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Descripción corta</label>
                                            <textarea 
                                                placeholder="Describe brevemente el concepto del plato..." 
                                                value={formState.description} 
                                                onChange={handleFormChange} 
                                                name="description" 
                                                rows={3} 
                                                className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm placeholder:text-gray-400"
                                            />
                                        </div>

                                        {/* ALÉRGENOS DETECTADOS (COMPACTO) */}
                                        {allAllergens.length > 0 && (
                                            <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 self-start">
                                                <span className="text-[8px] font-black uppercase tracking-widest text-gray-400 mr-2">Alérgenos detectados:</span>
                                                <div className="flex -space-x-1">
                                                    {allAllergens.map(a => {
                                                        const Icon = ALLERGEN_ICONS[a] || AlertTriangle;
                                                        const color = ALLERGEN_COLORS[a];
                                                        return (
                                                            <div 
                                                                key={a} 
                                                                className="w-6 h-6 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900 shadow-sm relative group"
                                                                style={{ backgroundColor: color }}
                                                                title={a}
                                                            >
                                                                <Icon className="w-3.5 h-3.5 text-white" />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* TABS DE ELABORACIONES */}
                        <div className="flex items-center space-x-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                            <button 
                                type="button"
                                onClick={() => setActiveElabTab(-1)}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeElabTab === -1 ? 'bg-gray-900 text-white shadow-lg' : 'bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-50'}`}
                            >
                                1. Elaboración Principal
                            </button>
                            {(formState.sub_preparations || []).map((sub, idx) => (
                                <button 
                                    key={sub.id}
                                    type="button"
                                    onClick={() => setActiveElabTab(idx)}
                                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center space-x-2 ${activeElabTab === idx ? 'bg-gray-900 text-white shadow-lg' : 'bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-50'}`}
                                >
                                    <span>{idx + 2}. {sub.name}</span>
                                    <TrashIcon 
                                        className="w-3 h-3 text-red-400 hover:text-red-600 ml-1" 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeSubPreparation(idx);
                                        }}
                                    />
                                </button>
                            ))}
                            <button 
                                type="button"
                                onClick={addSubPreparation}
                                className="p-2 bg-white dark:bg-gray-800 text-primary-500 rounded-xl hover:bg-primary-50 transition-all border border-dashed border-primary-200"
                            >
                                <PlusIcon className="w-4 h-4" />
                            </button>
                        </div>

                        <Card noPadding>
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
                                            <ChefHat className="w-4 h-4 text-primary-600" />
                                        </div>
                                        {activeElabTab === -1 ? (
                                            <h3 className="text-sm font-black uppercase tracking-widest text-gray-800 dark:text-white">Elaboración Principal</h3>
                                        ) : (
                                            <input 
                                                type="text"
                                                value={(formState.sub_preparations || [])[activeElabTab].name}
                                                onChange={(e) => handleSubPrepChange(activeElabTab, 'name', e.target.value)}
                                                className="bg-transparent text-sm font-black uppercase tracking-widest text-gray-800 dark:text-white border-b border-dashed border-gray-300 focus:border-primary-500 outline-none"
                                            />
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {/* INGREDIENTES */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Escandallo de Ingredientes</h4>
                                            <div className="relative w-64">
                                                <input 
                                                    type="text" 
                                                    placeholder="Añadir ingrediente..." 
                                                    value={searchTerm} 
                                                    onChange={e => setSearchTerm(e.target.value)} 
                                                    className="w-full pl-8 pr-4 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs"
                                                />
                                                <PlusIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                                {searchTerm && (
                                                    <ul className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-2xl max-h-48 overflow-y-auto ring-1 ring-black/5">
                                                        {filteredProducts.map(p => (
                                                            <li 
                                                                key={p.id} 
                                                                onClick={() => addIngredient(p)} 
                                                                className="p-3 hover:bg-primary-50 dark:hover:bg-primary-900/20 cursor-pointer flex items-center space-x-3 border-b border-gray-50 dark:border-gray-700 last:border-0"
                                                            >
                                                                <div className="flex-1">
                                                                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{p.name}</p>
                                                                    <p className="text-[10px] text-gray-400">{p.category} | {p.family}</p>
                                                                </div>
                                                                <span className="text-[10px] bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-500 uppercase">{p.unit}</span>
                                                            </li>
                                                        ))}
                                                        {filteredProducts.length === 0 && searchTerm.trim() && (
                                                            <li 
                                                                onClick={addGenericIngredient}
                                                                className="p-4 text-xs text-primary-600 font-bold hover:bg-primary-50 cursor-pointer flex items-center justify-center space-x-2"
                                                            >
                                                                <PlusIcon className="w-4 h-4" />
                                                                <span>Añadir "{searchTerm}" como ingrediente genérico</span>
                                                            </li>
                                                        )}
                                                        {filteredProducts.length === 0 && !searchTerm.trim() && <li className="p-4 text-xs text-gray-500 italic text-center">Sin resultados</li>}
                                                    </ul>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            {(activeElabTab === -1 ? formState.ingredients : (formState.sub_preparations || [])[activeElabTab].ingredients).map((ing, index) => {
                                                const product = productsMap.get(ing.product_id);
                                                const isCompatible = areUnitsCompatible(ing.unit, product?.unit || '');
                                                const isSubPrep = formState.sub_preparations?.some(sub => sub.name.toLowerCase() === ing.product_id.toLowerCase());
                                                const isUnidentified = !product && !isSubPrep;
                                                
                                                return (
                                                    <div key={`${index}-${ing.product_id}`} className={`group flex items-center space-x-3 p-3 bg-white dark:bg-gray-800 border ${isUnidentified ? 'border-red-200 bg-red-50/30' : 'border-gray-100 dark:border-gray-700'} rounded-xl hover:border-primary-200 dark:hover:border-primary-800 transition-all`}>
                                                        <div 
                                                            className={`flex-1 flex items-center space-x-3 ${isUnidentified ? 'cursor-pointer' : ''}`}
                                                            onClick={() => {
                                                                if (isUnidentified) {
                                                                    setLinkingIndex({ tab: activeElabTab, index: index });
                                                                    setSearchTerm(ing.product_id);
                                                                }
                                                            }}
                                                        >
                                                            <div className={`w-1.5 h-1.5 rounded-full ${isUnidentified ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : isSubPrep ? 'bg-amber-400' : 'bg-primary-400'}`} />
                                                            <div className="flex flex-col">
                                                                <span className={`text-[11px] font-bold truncate w-40 ${isUnidentified ? 'text-red-600' : isSubPrep ? 'text-amber-600' : 'text-gray-700 dark:text-gray-300'}`} title={product?.name || ing.product_id}>
                                                                    {product?.name || ing.product_id}
                                                                </span>
                                                                {isUnidentified && (
                                                                    <span className="text-[8px] font-black uppercase text-red-400 animate-pulse">Desvinculado - Haz clic para enlazar</span>
                                                                )}
                                                                {isSubPrep && (
                                                                    <span className="text-[8px] font-black uppercase text-amber-500">Sub-elaboración local</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex items-center space-x-2">
                                                            <input 
                                                                type="number" 
                                                                step="0.01" 
                                                                value={ing.quantity || 0} 
                                                                onChange={e => handleIngredientChange(index, 'quantity', parseFloat(e.target.value) || 0)} 
                                                                className="w-16 p-1 bg-gray-50 dark:bg-gray-900 border-none rounded text-xs text-center font-bold"
                                                            />
                                                            <select 
                                                                value={ing.unit} 
                                                                onChange={e => handleIngredientChange(index, 'unit', e.target.value)} 
                                                                className="w-14 p-1 bg-gray-50 dark:bg-gray-900 border-none rounded text-[10px] font-black uppercase text-gray-500"
                                                            >
                                                                <option value="kg">kg</option>
                                                                <option value="g">g</option>
                                                                <option value="l">l</option>
                                                                <option value="ml">ml</option>
                                                                <option value="ud">ud</option>
                                                                <option value="unidad">ud</option>
                                                            </select>
                                                        </div>

                                                        <div className="w-16 text-right">
                                                            <span className={`text-[10px] font-mono font-bold ${!isCompatible ? 'text-red-500' : 'text-gray-400'}`}>
                                                                {(ing.cost || 0).toFixed(2)}€
                                                            </span>
                                                        </div>

                                                        <button type="button" onClick={() => removeIngredient(index)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all">
                                                            <TrashIcon className="w-3.5 h-3.5"/>
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                            {(activeElabTab === -1 ? formState.ingredients : (formState.sub_preparations || [])[activeElabTab].ingredients).length === 0 && (
                                                <div className="py-8 text-center bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-700">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-300">No hay ingredientes añadidos</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* PROCEDIMIENTO */}
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Procedimiento de Cocina</h4>
                                        <textarea 
                                            placeholder="Describe paso a paso los procesos técnicos de esta elaboración... (Ej: 1. Paso uno. 2. Paso dos.)" 
                                            value={activeElabTab === -1 ? formState.preparation_steps : (formState.sub_preparations || [])[activeElabTab].preparation_steps} 
                                            onChange={(e) => {
                                                if (activeElabTab === -1) {
                                                    setFormState(prev => ({ ...prev, preparation_steps: e.target.value }));
                                                } else {
                                                    handleSubPrepChange(activeElabTab, 'preparation_steps', e.target.value);
                                                }
                                            }} 
                                            rows={12} 
                                            className="w-full p-6 bg-gray-50 dark:bg-gray-900/50 border-none rounded-2xl text-sm placeholder:text-gray-300 leading-relaxed ring-1 ring-gray-100 dark:ring-gray-800 focus:ring-2 focus:ring-primary-500/50 transition-all font-medium" 
                                        />
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* EXAMEN QUÍMICO */}
                        <Card title="🔬 Examen Químico y Organoléptico">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Análisis de Estructura, Texturas y Reacciones</label>
                                <textarea 
                                    name="chemical_analysis"
                                    value={formState.chemical_analysis || ''}
                                    onChange={handleFormChange}
                                    placeholder="Detalla reacciones de Maillard, desnaturalización de proteínas, gelificaciones, pH o perfiles aromáticos..." 
                                    rows={6} 
                                    className="w-full p-4 bg-indigo-50/30 dark:bg-indigo-900/10 border-none rounded-2xl text-sm italic placeholder:text-indigo-300 leading-relaxed ring-1 ring-indigo-100 dark:ring-indigo-900/30 focus:ring-2 focus:ring-indigo-500/50 transition-all" 
                                />
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                                        <p className="text-[8px] font-black uppercase text-gray-400 mb-1">Textura Predominante</p>
                                        <p className="text-xs font-bold text-indigo-600">Crujiente / Cremosa</p>
                                    </div>
                                    <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                                        <p className="text-[8px] font-black uppercase text-gray-400 mb-1">Punto de Acidez (pH)</p>
                                        <p className="text-xs font-bold text-amber-600">Equilibrado</p>
                                    </div>
                                    <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                                        <p className="text-[8px] font-black uppercase text-gray-400 mb-1">Umami / Sabor</p>
                                        <p className="text-xs font-bold text-emerald-600">Intenso</p>
                                    </div>
                                </div>
                            </div>
                        </Card>
                        
                        <Card noPadding>
                            <div className="bg-[#121421] text-gray-300 p-8 rounded-xl space-y-8 border border-white/5 shadow-2xl">
                                <div className="flex items-center space-x-3 mb-2 border-b border-white/10 pb-4">
                                    <div className="p-2 bg-primary-500/20 rounded-lg">
                                        <ChefHat className="w-8 h-8 text-primary-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">Ficha de Servicio (SALA)</h2>
                                        <p className="text-[10px] font-bold text-primary-400 uppercase tracking-widest">Protocolos de pase, servicio y atención al cliente</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Izquierda: Comunicación y Protocolo */}
                                    <div className="space-y-8">
                                        <div className="space-y-4">
                                            <div className="flex items-center space-x-2 text-amber-400">
                                                <AlertTriangle className="w-4 h-4" />
                                                <h4 className="text-[10px] font-black uppercase tracking-widest">Explicación sugerente para el Camarero</h4>
                                            </div>
                                            <textarea 
                                                name="service_explanation"
                                                value={formState.service_explanation || ''}
                                                onChange={handleFormChange}
                                                placeholder="Describe cómo se le debe presentar el plato al cliente, destacando texturas o ingredientes clave..."
                                                className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary-500/50 transition-all resize-none"
                                            />
                                        </div>

                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Tipo de Servicio (Protocolo)</h4>
                                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                                                {[
                                                    { id: 'AMERICANA', desc: 'Práctico, rápido, plato montado en cocina.' },
                                                    { id: 'INGLESA', desc: 'Servicio desde fuente a plato por la izquierda.' },
                                                    { id: 'FRANCESA', desc: 'El cliente se sirve de la fuente que el camarero presenta.' },
                                                    { id: 'GUERIDÓN', desc: 'Trinchado o emplatado frente al cliente (Sala).' },
                                                    { id: 'PLAT DE MILIEU', desc: 'El plato se coloca en el centro para compartir.' },
                                                    { id: 'BUFFET', desc: 'Autoservicio o estaciones asistidas.' },
                                                    { id: 'VENTA DIRECTA', desc: 'Takeaway o servicio directo en mostrador.' }
                                                ].map(tech => (
                                                    <button
                                                        key={tech.id}
                                                        type="button"
                                                        onClick={() => setFormState(prev => ({ ...prev, service_type: tech.id }))}
                                                        className={`py-3 px-2 text-[10px] font-black rounded-lg transition-all border ${formState.service_type === tech.id ? 'bg-primary-500 border-primary-400 text-white shadow-lg shadow-primary-500/20' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                                                    >
                                                        {tech.id}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                                <div className="flex items-center space-x-2 text-primary-400 mb-1">
                                                    <ScanText className="w-3 h-3" />
                                                    <span className="text-[10px] font-bold uppercase">Definición del Protocolo seleccionado</span>
                                                </div>
                                                <p className="text-xs italic opacity-60">
                                                    {formState.service_type === 'AMERICANA' && 'Plato sale terminado de cocina. Se sirve por la derecha.'}
                                                    {formState.service_type === 'INGLESA' && 'Camarero sirve desde fuente con pinza por la izquierda del comensal.'}
                                                    {formState.service_type === 'FRANCESA' && 'Se presenta fuente por la izquierda y el comensal se sirve solo.'}
                                                    {formState.service_type === 'GUERIDÓN' && 'Uso de mesa auxiliar para terminar el plato frente al cliente.'}
                                                    {formState.service_type === 'PLAT DE MILIEU' && 'Ideal para raciones o platos compartidos en centro de mesa.'}
                                                    {formState.service_type === 'BUFFET' && 'Configuración en línea de servicio o estaciones temáticas.'}
                                                    {formState.service_type === 'VENTA DIRECTA' && 'Protocolo rápido para consumo externo o barra.'}
                                                    {!formState.service_type && 'Selecciona una técnica para ver el protocolo detallado.'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Derecha: Temperatura y Cubertería */}
                                    <div className="space-y-8">
                                        <div className="space-y-4">
                                            <div className="flex items-center space-x-2 text-indigo-400">
                                                <Terminal className="w-4 h-4" />
                                                <h4 className="text-[10px] font-black uppercase tracking-widest">Temperatura Medida en Pase</h4>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {[
                                                    { id: 'CARNES/PESCADOS', val: '60-70ºC' },
                                                    { id: 'SOPAS/CREMAS', val: '70ºC' },
                                                    { id: 'GUISOS/ARROCES', val: '60-70ºC' },
                                                    { id: 'ENTREMESES/QUESOS', val: '18-22ºC' },
                                                    { id: 'ENSALADAS/FRÍOS', val: '4-10ºC' },
                                                    { id: 'HELADOS/SORBETES', val: '-1 a 2ºC' }
                                                ].map(temp => (
                                                    <button
                                                        key={temp.id}
                                                        type="button"
                                                        onClick={() => setFormState(prev => ({ ...prev, temperature: temp.val }))}
                                                        className="py-1.5 px-3 text-[8px] font-bold rounded-full bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white transition-all uppercase tracking-tighter"
                                                    >
                                                        {temp.id}
                                                    </button>
                                                ))}
                                            </div>
                                            <input 
                                                type="text"
                                                name="temperature"
                                                value={formState.temperature || ''}
                                                onChange={handleFormChange}
                                                placeholder="EJ: 60-70ºC o RANGO ÓPTIMO"
                                                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-mono text-primary-400 focus:ring-2 focus:ring-primary-500/50 transition-all uppercase"
                                            />
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center space-x-2 text-emerald-400">
                                                <Wand2 className="w-4 h-4" />
                                                <h4 className="text-[10px] font-black uppercase tracking-widest">Marcaje y Cubertería Necesaria</h4>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {['ENTREMESES', 'TRINCHEROS', 'PESCADO', 'POSTRE', 'OSTRAS', 'CAVIAR', 'CONSOMÉ', 'MARISCO', 'CARNE BLANDA', 'CARNE FIBROSA'].map(cut => (
                                                    <button
                                                        key={cut}
                                                        type="button"
                                                        onClick={() => {
                                                            const current = formState.cutlery_required || '';
                                                            const cleanCurrent = current.toUpperCase();
                                                            if (!cleanCurrent.includes(cut)) {
                                                                setFormState(prev => ({ 
                                                                    ...prev, 
                                                                    cutlery_required: prev.cutlery_required ? `${prev.cutlery_required} + ${cut}` : cut 
                                                                }));
                                                            }
                                                        }}
                                                        className="py-1 px-3 text-[8px] font-bold rounded-full bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white transition-all uppercase"
                                                    >
                                                        {cut}
                                                    </button>
                                                ))}
                                            </div>
                                            <textarea 
                                                name="cutlery_required"
                                                value={formState.cutlery_required || ''}
                                                onChange={handleFormChange}
                                                placeholder="EJ: C. PESCADO + T. PESCADO + PLATO TRINCHERO..."
                                                className="w-full h-24 bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-mono text-emerald-400 focus:ring-2 focus:ring-emerald-500/50 transition-all resize-none uppercase"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-8 border-t border-white/10">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Instrucciones de Emplatado y Acabado Final</h4>
                                    </div>
                                    
                                    <div className="relative mt-2">
                                        <textarea 
                                            name="presentation"
                                            value={formState.presentation || ''}
                                            onChange={handleFormChange}
                                            placeholder="Describe el paso final antes del pase..."
                                            className="w-full h-40 bg-white/5 border-2 border-dashed border-white/10 rounded-2xl p-6 text-sm italic opacity-80 focus:ring-0 focus:border-primary-500/50 transition-all resize-none"
                                        />
                                    </div>
                                </div>

                                {/* MISE EN PLACE CHECKLIST */}
                                <div className="p-6 bg-amber-500/5 rounded-2xl border border-amber-500/10 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-500">Checklist de Mise en Place (Repaso Final)</h4>
                                        <button 
                                            type="button"
                                            onClick={() => setFormState(prev => ({ ...prev, service_checklist: [...(prev.service_checklist || []), ''] }))}
                                            className="p-1 hover:bg-amber-500/20 rounded-lg text-amber-500 transition-colors"
                                        >
                                            <PlusIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {(formState.service_checklist || []).map((item, index) => (
                                            <div key={index} className="flex items-center space-x-2 bg-black/20 p-2 rounded-xl border border-white/5">
                                                <input 
                                                    type="text"
                                                    value={item}
                                                    onChange={(e) => {
                                                        const newList = [...(formState.service_checklist || [])];
                                                        newList[index] = e.target.value;
                                                        setFormState(prev => ({ ...prev, service_checklist: newList }));
                                                    }}
                                                    placeholder="Ej: Repasar copas, Temperatura de salsa..."
                                                    className="flex-1 bg-transparent text-[10px] text-gray-300 focus:outline-none"
                                                />
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        const newList = (formState.service_checklist || []).filter((_, i) => i !== index);
                                                        setFormState(prev => ({ ...prev, service_checklist: newList }));
                                                    }}
                                                    className="text-gray-500 hover:text-red-500 transition-colors"
                                                >
                                                    <TrashIcon className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                        {(formState.service_checklist || []).length === 0 && (
                                            <p className="text-[10px] text-gray-500 italic col-span-2">No hay elementos en la lista de comprobación.</p>
                                        )}
                                    </div>
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
                                    <input type="number" step="0.01" placeholder="Precio" value={formState.price || 0} onChange={handleFormChange} name="price" required className="w-full mt-1 p-2 border rounded"/>
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
                                            {allAllergens.map(a => {
                                                const Icon = ALLERGEN_ICONS[a] || AlertTriangle;
                                                const color = ALLERGEN_COLORS[a];
                                                return (
                                                    <div key={a} className="group relative flex flex-col items-center" title={a}>
                                                        <div 
                                                            className="w-8 h-8 rounded-full flex items-center justify-center border border-white dark:border-gray-800 shadow-sm"
                                                            style={{ backgroundColor: color }}
                                                        >
                                                            <Icon className="w-4 h-4 text-white" />
                                                        </div>
                                                    </div>
                                                );
                                            })}
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
            <AIHubModal 
                isOpen={showAIHub} 
                initialTab={aiHubTab}
                onClose={() => setShowAIHub(false)} 
                onImport={handleAIImport} 
            />
        </div>
    );
};
