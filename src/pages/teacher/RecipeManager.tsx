import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/Card';
import { Modal } from '../../components/Modal';
import { ComposeMessageModal } from '../shared/Messaging';
import { 
    Share2, 
    Eye, 
    Edit2, 
    Trash2, 
    Users, 
    Lock, 
    Unlock, 
    Image as ImageIcon, 
    Coins, 
    Info, 
    Settings, 
    Plus, 
    Wine, 
    Briefcase, 
    Bean, 
    ChefHat, 
    Martini, 
    Sparkles 
} from 'lucide-react';
import { Recipe, Message, User } from '../../types';
import { SettingsModal } from '../../components/SettingsModal';
import { AIHubModal } from '../../components/AIHubModal';
import { motion, AnimatePresence } from 'framer-motion';

const ALLERGEN_ICONS: Record<string, string> = {
    'Gluten': '🌾',
    'Crustáceos': '🦞',
    'Huevos': '🥚',
    'Pescado': '🐟',
    'Cacahuetes': '🥜',
    'Soja': '🫘',
    'Lácteos': '🥛',
    'Frutos de cáscara': '🌰',
    'Apio': '🥬',
    'Mostaza': '🍯',
    'Sésamo': '🥯',
    'Sulfitos': '🧪',
    'Altramuces': '🧬',
    'Moluscos': '🐚'
};

const ShareRecipeModal: React.FC<{ 
    recipe: Recipe; 
    onClose: () => void; 
    onSend: (message: any) => void;
    users: User[];
}> = ({ recipe, onClose, onSend, users }) => {
    
    const recipeBody = `
¡Hola!

Te comparto esta receta que podría interesarte:

**${recipe.name}**

**Descripción:**
${recipe.description}

**Rendimiento:** ${recipe.yield_amount} ${recipe.yield_unit}

**Preparación:**
${recipe.preparation_steps}

---
Este mensaje ha sido generado automáticamente.
    `;

    return (
        <ComposeMessageModal 
            users={users}
            onClose={onClose}
            onSend={onSend}
            initialSubject={`Receta compartida: ${recipe.name}`}
            initialBody={recipeBody}
        />
    );
};

const RecipeListItem: React.FC<{
    recipe: Recipe;
    authorName: string;
    isOwner: boolean;
    getCategoryColors: (cat: string) => string[];
    onShare: () => void;
    onDelete: () => void;
    onDuplicate?: () => void;
}> = ({ recipe, authorName, isOwner, getCategoryColors, onShare, onDelete, onDuplicate }) => {
    const colors = getCategoryColors(recipe.category);
    const navigate = useNavigate();

    return (
        <motion.div 
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="group relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row overflow-hidden h-auto sm:h-32"
        >
            {/* Top accent bar shortened */}
            {colors.length > 0 && (
                <div className="absolute top-0 left-0 w-full h-[3px] flex opacity-70">
                    {colors.map((c, i) => <div key={i} className="flex-1 h-full" style={{ backgroundColor: c }} />)}
                </div>
            )}

            {/* Compact Image */}
            <div className="w-full sm:w-40 h-32 sm:h-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center overflow-hidden flex-shrink-0">
                {recipe.photo ? (
                    <img 
                        src={recipe.photo} 
                        alt={recipe.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                    />
                ) : (
                    <div className="flex flex-col items-center text-gray-200">
                        <ImageIcon className="w-8 h-8" />
                    </div>
                )}
            </div>

            {/* Content Container - Much more compact */}
            <div className="flex-1 p-3 sm:p-4 flex flex-col justify-between overflow-hidden">
                <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 overflow-hidden">
                            <span className="px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider bg-gray-100 dark:bg-gray-700 text-gray-500 whitespace-nowrap">
                                {recipe.category}
                            </span>
                            {recipe.is_public ? (
                                <Unlock className="w-3 h-3 text-gray-300" />
                            ) : (
                                <Lock className="w-3 h-3 text-emerald-500" />
                            )}
                            <span className="text-[9px] font-bold text-gray-400 whitespace-nowrap">
                                {recipe.yield_amount} {recipe.yield_unit}
                            </span>
                        </div>
                        <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight truncate flex items-center">
                            {recipe.name}
                            {recipe.recipe_type === 'bakery' && <Bean className="w-3.5 h-3.5 ml-2 text-orange-500" />}
                            {recipe.recipe_type === 'cocktail' && <Martini className="w-3.5 h-3.5 ml-2 text-amber-500" />}
                            {recipe.recipe_type === 'service_tech' && <Briefcase className="w-3.5 h-3.5 ml-2 text-emerald-500" />}
                        </h3>
                        <div className="flex items-center text-[9px] font-bold text-gray-400 uppercase tracking-widest truncate">
                            {authorName}
                        </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                        <div className="text-xl font-black text-indigo-900 dark:text-indigo-300 leading-none">
                            {recipe.cost.toFixed(2)}€
                        </div>
                        <div className="text-[8px] font-black text-indigo-300 uppercase mt-0.5">
                            P/R
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-end mt-2">
                    <div className="flex -space-x-1">
                        {recipe.selected_allergens?.slice(0, 5).map(allergen => (
                            <span 
                                key={allergen} 
                                title={allergen}
                                className="w-6 h-6 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center text-xs shadow-sm border border-gray-100 dark:border-gray-600"
                            >
                                {ALLERGEN_ICONS[allergen] || '⚠️'}
                            </span>
                        ))}
                        {recipe.selected_allergens && recipe.selected_allergens.length > 5 && (
                            <span className="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center text-[8px] font-bold text-gray-400 border border-gray-100">
                                +{recipe.selected_allergens.length - 5}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center bg-gray-50 dark:bg-gray-700/50 rounded-lg p-0.5 gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            {isOwner ? (
                                <>
                                    <button onClick={onShare} className="p-1.5 text-gray-400 hover:text-primary-600 rounded-md"><Share2 className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => navigate(`/teacher/recipes/edit/${recipe.id}`)} className="p-1.5 text-gray-400 hover:text-amber-600 rounded-md"><Edit2 className="w-3.5 h-3.5" /></button>
                                    <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-600 rounded-md"><Trash2 className="w-3.5 h-3.5" /></button>
                                </>
                            ) : (
                                onDuplicate && (
                                    <button onClick={onDuplicate} className="px-2 py-1 text-[8px] font-black uppercase text-gray-500 hover:text-emerald-600">Copiar</button>
                                )
                            )}
                        </div>

                        <Link 
                            to={`/teacher/recipes/view/${recipe.id}`}
                            className="inline-flex items-center justify-center px-4 py-2 bg-[#0e1627] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all"
                        >
                            VER <Eye className="w-3 h-3 ml-1.5" />
                        </Link>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};


export const RecipeManager: React.FC = () => {
    const { recipes, setRecipes, users, messages, setMessages, products, workspaceSettings } = useData();
    const { currentUser, isOwner } = useAuth();
    const navigate = useNavigate();

    const [searchTerm, setSearchTerm] = useState('');
    const [recipeToShare, setRecipeToShare] = useState<Recipe | null>(null);
    const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null);
    const [deleteConfirmStep, setDeleteConfirmStep] = useState(0);
    const [showSettings, setShowSettings] = useState(false);
    const [showAIHub, setShowAIHub] = useState(false);

    const handleAIImport = (jsonString: string) => {
        try {
            // Save data to session storage so the form can pick it up
            sessionStorage.setItem('ai_import_recipe', jsonString);
            navigate('/teacher/recipes/new');
        } catch (err) {
            console.error('Error storing AI data:', err);
        }
    };

    const usersMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);
    const productsMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);

    const accessibleRecipes = useMemo(() => {
        return recipes.filter(r => isOwner(r.author_id) || r.is_public);
    }, [recipes, isOwner]);

    const sortedRecipes = useMemo(() => {
        return [...accessibleRecipes].sort((a, b) => b.id.localeCompare(a.id));
    }, [accessibleRecipes]);

    const filteredRecipes = useMemo(() => {
        if (!searchTerm) return sortedRecipes;
        
        const lowerCaseSearch = searchTerm.toLowerCase();
        return sortedRecipes.filter(recipe => {
            if (recipe.name.toLowerCase().includes(lowerCaseSearch)) return true;
            return recipe.ingredients.some(ing => 
                productsMap.get(ing.product_id)?.name.toLowerCase().includes(lowerCaseSearch)
            );
        });
    }, [sortedRecipes, searchTerm, productsMap]);

    const myRecipes = useMemo(() => {
        const results = filteredRecipes.filter(r => isOwner(r.author_id));
        return searchTerm ? results : results.slice(0, 15);
    }, [filteredRecipes, isOwner, searchTerm]);

    const publicRecipes = useMemo(() => {
        const results = filteredRecipes.filter(r => r.is_public && !isOwner(r.author_id));
        return searchTerm ? results : results.slice(0, 15);
    }, [filteredRecipes, isOwner, searchTerm]);

    const getCategoryColors = (categoryName: string) => {
        const config = workspaceSettings?.categoryConfigs?.find(c => c.name === categoryName);
        return config?.colors || [];
    };

    const handleDuplicate = (recipe: Recipe) => {
        if (!currentUser) return;
        const newRecipe: Recipe = {
            ...recipe,
            id: `rec-${Date.now()}`,
            author_id: currentUser.id,
            name: `${recipe.name} (Copia)`,
            is_public: false,
        };
        setRecipes(prev => [...prev, newRecipe]);
        navigate(`/teacher/recipes/edit/${newRecipe.id}`);
    };

    const handleShare = (message: Omit<Message, 'id' | 'date' | 'sender_id' | 'read_by'>) => {
        if (!currentUser) return;
        const fullMessage: Message = {
            id: `msg-${Date.now()}`,
            sender_id: currentUser.id,
            date: new Date().toISOString(),
            read_by: {},
            ...message
        };
        setMessages([...messages, fullMessage]);
        setRecipeToShare(null);
        alert('¡Receta compartida!');
    };

    const handleDelete = () => {
        if (!recipeToDelete) return;
        setRecipes(prev => prev.filter(r => r.id !== recipeToDelete.id));
        setRecipeToDelete(null);
        setDeleteConfirmStep(0);
    };


    return (
        <div className="max-w-7xl mx-auto space-y-8">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tight leading-none mb-2">Explorar Recetas</h1>
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Gestión centralizada de fichas técnicas</p>
                </div>
                <div className="no-print flex items-center space-x-3 w-full md:w-auto">
                    <button 
                        onClick={() => setShowAIHub(true)}
                        className="flex-1 md:flex-initial bg-white/10 text-white py-3 px-6 rounded-2xl hover:bg-white/20 flex items-center justify-center font-black uppercase tracking-widest text-xs transition-all border border-white/5"
                    >
                        <Sparkles className="w-4 h-4 mr-2 text-primary-400" /> Digitalizar IA
                    </button>
                    <button 
                        onClick={() => setShowSettings(true)}
                        className="flex-1 md:flex-initial bg-gray-100 text-gray-600 py-3 px-5 rounded-2xl hover:bg-gray-200 flex items-center justify-center font-bold uppercase tracking-widest text-xs transition-colors"
                    >
                        <Settings className="w-4 h-4 mr-2" /> Configurar
                    </button>
                </div>
            </div>

            {/* CREATION ACTIONS GROUPED BY DEPARTMENT */}
            <div className="bg-white/5 dark:bg-slate-800/30 rounded-[2rem] p-6 border border-white/10 mb-10 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 blur-[100px] rounded-full -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full -ml-32 -mb-32"></div>
                
                <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-8 divide-y lg:divide-y-0 lg:divide-x divide-white/10">
                    {/* KITCHEN & BAKERY GROUP */}
                    <div className="space-y-6 lg:pr-8">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center">
                                <ChefHat className="w-4 h-4 text-orange-500" />
                            </div>
                            <div>
                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Cocina y Pastelería</h3>
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Producción y Elaboración</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <Link 
                                to="/teacher/recipes/new" 
                                className="flex-1 bg-[#0e1627] text-white py-4 px-6 rounded-2xl hover:bg-black flex items-center justify-center font-black uppercase tracking-widest text-[10px] shadow-lg transition-all hover:-translate-y-1 active:translate-y-0"
                            >
                                <Plus className="w-4 h-4 mr-2" /> Nueva Receta
                            </Link>
                            <Link 
                                to="/teacher/recipes/new?type=bakery" 
                                className="flex-1 bg-white/5 text-orange-200 py-4 px-6 rounded-2xl hover:bg-white/10 flex items-center justify-center font-black uppercase tracking-widest text-[10px] border border-white/5 shadow-lg transition-all hover:-translate-y-1 active:translate-y-0"
                            >
                                <Bean className="w-4 h-4 mr-2" /> Ficha Panadería
                            </Link>
                        </div>
                    </div>

                    {/* SERVICE & COCKTAIL GROUP */}
                    <div className="space-y-6 lg:pl-8 pt-8 lg:pt-0">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                <Wine className="w-4 h-4 text-emerald-500" />
                            </div>
                            <div>
                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Servicio y Sala</h3>
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Atención y Mixología</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <Link 
                                to="/teacher/recipes/new?type=cocktail" 
                                className="flex-1 bg-amber-600/90 text-white py-4 px-6 rounded-2xl hover:bg-amber-700 flex items-center justify-center font-black uppercase tracking-widest text-[10px] shadow-lg shadow-amber-900/20 transition-all hover:-translate-y-1 active:translate-y-0"
                            >
                                <Martini className="w-4 h-4 mr-2" /> Nuevo Cóctel
                            </Link>
                            <Link 
                                to="/teacher/recipes/new?type=service_tech" 
                                className="flex-1 bg-emerald-600/90 text-white py-4 px-6 rounded-2xl hover:bg-emerald-700 flex items-center justify-center font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-900/20 transition-all hover:-translate-y-1 active:translate-y-0"
                            >
                                <Briefcase className="w-4 h-4 mr-2" /> Ficha Servicio
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <div className="relative group">
                <input
                    type="search"
                    placeholder="Buscar por receta, ingrediente o categoría..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full h-16 pl-6 pr-12 bg-white dark:bg-gray-800 border-2 border-transparent focus:border-primary-500 rounded-3xl shadow-xl shadow-gray-100 dark:shadow-none font-bold text-gray-700 text-lg transition-all outline-none"
                />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-300">
                    <Eye className="w-6 h-6" />
                </div>
            </div>

            <div className="space-y-12">
                {/* My Recipes Section */}
                <section>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-black text-gray-800 dark:text-white uppercase tracking-tighter flex items-center">
                            <Lock className="w-5 h-5 mr-3 text-primary-500" />
                            Mis Fichas Recientes
                        </h2>
                        {searchTerm === '' && (
                            <span className="bg-gray-100 px-3 py-1 rounded-full text-[10px] font-black text-gray-400 uppercase">Últimas 15</span>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-1 gap-6">
                        <AnimatePresence mode="popLayout">
                            {myRecipes.length > 0 ? (
                                myRecipes.map(recipe => (
                                    <RecipeListItem 
                                        key={recipe.id}
                                        recipe={recipe}
                                        isOwner={true}
                                        authorName={usersMap.get(recipe.author_id)?.name || 'Autor desconocido'}
                                        getCategoryColors={getCategoryColors}
                                        onShare={() => setRecipeToShare(recipe)}
                                        onDelete={() => {
                                            setRecipeToDelete(recipe);
                                            setDeleteConfirmStep(1);
                                        }}
                                    />
                                ))
                            ) : (
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="p-12 text-center bg-gray-50/50 dark:bg-gray-800/30 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700"
                                >
                                    <p className="text-gray-500 font-bold italic">No se han encontrado recetas personales.</p>
                                    <Link to="/teacher/recipes/new" className="text-primary-600 font-bold hover:underline mt-4 inline-block">¡Crea tu primera ficha!</Link>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </section>

                {/* Public Recipes Section */}
                <section>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-black text-gray-800 dark:text-white uppercase tracking-tighter flex items-center">
                            <Unlock className="w-5 h-5 mr-3 text-amber-500" />
                            Comunidad Publica
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        <AnimatePresence mode="popLayout">
                            {publicRecipes.length > 0 ? (
                                publicRecipes.map(recipe => (
                                    <RecipeListItem 
                                        key={recipe.id}
                                        recipe={recipe}
                                        isOwner={false}
                                        authorName={usersMap.get(recipe.author_id)?.name || 'Autor desconocido'}
                                        getCategoryColors={getCategoryColors}
                                        onShare={() => setRecipeToShare(recipe)}
                                        onDelete={() => {}} 
                                        onDuplicate={() => handleDuplicate(recipe)}
                                    />
                                ))
                            ) : (
                                <div className="p-12 text-center bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-200">
                                    <p className="text-gray-500 font-bold italic">No hay fichas compartidas públicamente.</p>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </section>
            </div>

            {recipeToShare && (
                <ShareRecipeModal 
                    recipe={recipeToShare}
                    onClose={() => setRecipeToShare(null)}
                    onSend={handleShare}
                    users={users}
                />
            )}

            {showSettings && (
                <SettingsModal onClose={() => setShowSettings(false)} />
            )}

            {showAIHub && (
                <AIHubModal 
                    isOpen={showAIHub}
                    onClose={() => setShowAIHub(false)}
                    onImport={handleAIImport}
                />
            )}

            {recipeToDelete && (
                <Modal 
                    isOpen={true} 
                    onClose={() => { setRecipeToDelete(null); setDeleteConfirmStep(0); }}
                    title="Confirmar Eliminación"
                >
                    <div className="p-6 text-center">
                        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 className="w-8 h-8" />
                        </div>
                        
                        <h3 className="text-xl font-black uppercase tracking-tight mb-2">Eliminar Receta</h3>
                        
                        {deleteConfirmStep === 1 ? (
                            <>
                                <p className="text-gray-500 mb-6">¿Estás seguro de que deseas eliminar <strong>{recipeToDelete.name}</strong>? Esta acción no se puede deshacer.</p>
                                <div className="flex space-x-3">
                                    <button 
                                        onClick={() => { setRecipeToDelete(null); setDeleteConfirmStep(0); }}
                                        className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold uppercase tracking-widest text-xs"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        onClick={() => setDeleteConfirmStep(2)}
                                        className="flex-1 py-3 bg-red-500 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-red-600"
                                    >
                                        Sí, estoy seguro
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="bg-red-50 p-4 rounded-xl border border-red-100 mb-6 font-bold text-red-700 text-sm">
                                    ⚠️ ATENCIÓN: Esta es la confirmación definitiva. La ficha desaparecerá de tu sistema.
                                </div>
                                <div className="flex space-x-3">
                                    <button 
                                        onClick={() => { setRecipeToDelete(null); setDeleteConfirmStep(0); }}
                                        className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold uppercase tracking-widest text-xs"
                                    >
                                        Mejor no
                                    </button>
                                    <button 
                                        onClick={handleDelete}
                                        className="flex-1 py-3 bg-red-700 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-red-800 animate-pulse"
                                    >
                                        ELIMINAR DEFINITIVAMENTE
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </Modal>
            )}
        </div>
    );
};