import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/Card';
import { Modal } from '../../components/Modal';
import { ComposeMessageModal } from '../shared/Messaging';
import { Share2, Eye, Edit2, Trash2, Users, Lock, Unlock, Image as ImageIcon, Coins, Info, Settings, Plus } from 'lucide-react';
import { Recipe, Message, User } from '../../types';
import { SettingsModal } from '../../components/SettingsModal';
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="group relative bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col md:flex-row overflow-hidden"
        >
            {/* Top accent bar */}
            {colors.length > 0 && (
                <div className="absolute top-0 left-0 w-full h-[6px] flex">
                    {colors.map((c, i) => <div key={i} className="flex-1 h-full" style={{ backgroundColor: c }} />)}
                </div>
            )}

            {/* Image Placeholder / Photo */}
            <div className="w-full md:w-56 h-48 md:h-auto bg-gray-50 dark:bg-gray-900 flex items-center justify-center overflow-hidden border-r border-gray-50 dark:border-gray-700">
                {recipe.photo ? (
                    <img 
                        src={recipe.photo} 
                        alt={recipe.name} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                    />
                ) : (
                    <div className="flex flex-col items-center text-gray-200">
                        <ImageIcon className="w-12 h-12 mb-2" />
                    </div>
                )}
            </div>

            {/* Content Container */}
            <div className="flex-1 p-4 md:p-6 flex flex-col justify-between">
                <div>
                    {/* Header: Badges and Cost */}
                    <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-gray-100 dark:bg-gray-700 text-gray-500">
                                {recipe.category}
                            </span>
                            
                            {recipe.is_public ? (
                                <span className="flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-gray-400 border border-gray-200">
                                    <Unlock className="w-3 h-3 mr-1" /> Público
                                </span>
                            ) : (
                                <span className="flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-emerald-500 text-white shadow-sm shadow-emerald-100">
                                    <Lock className="w-3 h-3 mr-1" /> Privado
                                </span>
                            )}

                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                {recipe.yield_amount} {recipe.yield_unit}
                            </span>
                        </div>

                        <div className="text-right">
                            <div className="text-2xl font-black text-indigo-900 dark:text-indigo-300 leading-none">
                                {recipe.cost.toFixed(2)}€
                            </div>
                            <div className="text-[10px] font-black text-indigo-400 dark:text-indigo-500 uppercase tracking-tighter mt-1">
                                Coste / Ración
                            </div>
                        </div>
                    </div>

                    {/* Title and Author */}
                    <div className="mb-4">
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight line-clamp-1">
                            {recipe.name}
                        </h3>
                        <div className="flex items-center mt-1 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            <Users className="w-3 h-3 mr-1.5" />
                            {authorName}
                        </div>
                    </div>
                </div>

                {/* Footer: Allergens and Actions */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pt-4 border-t border-gray-50 dark:border-gray-700/50">
                    <div className="flex flex-wrap gap-1.5">
                        {recipe.selected_allergens?.map(allergen => (
                            <span 
                                key={allergen} 
                                title={allergen}
                                className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-sm shadow-sm border border-amber-100/50"
                            >
                                {ALLERGEN_ICONS[allergen] || '⚠️'}
                            </span>
                        ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                        <div className="flex items-center bg-gray-50 dark:bg-gray-700/30 rounded-xl p-1 gap-1 mr-2">
                            {isOwner ? (
                                <>
                                    <button 
                                        onClick={onShare}
                                        className="p-2 text-gray-400 hover:text-primary-600 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-all"
                                        title="Compartir"
                                    >
                                        <Share2 className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => navigate(`/teacher/recipes/edit/${recipe.id}`)}
                                        className="p-2 text-gray-400 hover:text-amber-600 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-all"
                                        title="Editar"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={onDelete}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-all"
                                        title="Eliminar"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </>
                            ) : (
                                onDuplicate && (
                                    <button 
                                        onClick={onDuplicate}
                                        className="px-3 py-2 text-[10px] font-black uppercase text-gray-500 hover:text-emerald-600 transition-colors"
                                    >
                                        Hacer mía
                                    </button>
                                )
                            )}
                        </div>

                        <Link 
                            to={`/teacher/recipes/view/${recipe.id}`}
                            className="flex-1 md:flex-initial inline-flex items-center justify-center px-5 py-2.5 bg-[#0e1627] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#1a253a] transition-colors shadow-lg shadow-slate-200 dark:shadow-none"
                        >
                            Ver Ficha <Eye className="w-3.5 h-3.5 ml-2" />
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

    const usersMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);
    const productsMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);

    const sortedRecipes = useMemo(() => {
        // Sort by ID descending (most recent first)
        return [...recipes].sort((a, b) => b.id.localeCompare(a.id));
    }, [recipes]);

    const filteredRecipes = useMemo(() => {
        let results = sortedRecipes;
        
        if (searchTerm) {
            const lowerCaseSearch = searchTerm.toLowerCase();
            results = sortedRecipes.filter(recipe => {
                if (recipe.name.toLowerCase().includes(lowerCaseSearch)) return true;
                return recipe.ingredients.some(ing => 
                    productsMap.get(ing.product_id)?.name.toLowerCase().includes(lowerCaseSearch)
                );
            });
        } else {
            // If no search, limit to last 15
            results = sortedRecipes.slice(0, 15);
        }

        return results;
    }, [sortedRecipes, searchTerm, productsMap]);

    const myRecipes = useMemo(() => filteredRecipes.filter(r => isOwner(r.author_id)), [filteredRecipes, isOwner]);
    const publicRecipes = useMemo(() => filteredRecipes.filter(r => r.is_public && !isOwner(r.author_id)), [filteredRecipes, isOwner]);

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
                        onClick={() => setShowSettings(true)}
                        className="flex-1 md:flex-initial bg-gray-100 text-gray-600 py-3 px-5 rounded-2xl hover:bg-gray-200 flex items-center justify-center font-bold uppercase tracking-widest text-xs transition-colors"
                    >
                        <Settings className="w-4 h-4 mr-2" /> Configurar
                    </button>
                    <Link 
                        to="/teacher/recipes/new" 
                        className="flex-1 md:flex-initial bg-primary-600 text-white py-3 px-6 rounded-2xl hover:bg-primary-700 flex items-center justify-center font-black uppercase tracking-widest text-xs shadow-lg shadow-primary-100 transition-all hover:-translate-y-0.5 active:translate-y-0"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Nueva Receta
                    </Link>
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