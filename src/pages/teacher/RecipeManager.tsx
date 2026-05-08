import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/Card';
import { Modal } from '../../components/Modal';
import { ComposeMessageModal } from '../shared/Messaging';
import { PlusIcon, DownloadIcon, ShareIcon, PencilIcon, CogIcon, EyeIcon, TrashIcon } from '../../components/icons';
import { printPage } from '../../utils/export';
import { Recipe, Message, User } from '../../types';
import { SettingsModal } from '../../components/SettingsModal';

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


export const RecipeManager: React.FC = () => {
    const { recipes, setRecipes, users, messages, setMessages, products } = useData();
    const { currentUser, isOwner } = useAuth();
    const navigate = useNavigate();

    const [searchTerm, setSearchTerm] = useState('');
    const [recipeToShare, setRecipeToShare] = useState<Recipe | null>(null);
    const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null);
    const [deleteConfirmStep, setDeleteConfirmStep] = useState(0);
    const [showSettings, setShowSettings] = useState(false);

    const usersMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);
    const productsMap = useMemo(() => {
        return new Map(products.map(p => [p.id, p]));
    }, [products]);

    const filteredRecipes = useMemo(() => {
        if (!searchTerm) return recipes;
        const lowerCaseSearch = searchTerm.toLowerCase();
        return recipes.filter(recipe => {
            // Search by recipe name
            if (recipe.name.toLowerCase().includes(lowerCaseSearch)) return true;
            // Search by ingredient name
            return recipe.ingredients.some(ing => 
                productsMap.get(ing.product_id)?.name.toLowerCase().includes(lowerCaseSearch)
            );
        });
    }, [recipes, searchTerm, productsMap]);

    const myRecipes = useMemo(() => filteredRecipes.filter(r => isOwner(r.author_id)), [filteredRecipes, isOwner]);
    const publicRecipes = useMemo(() => filteredRecipes.filter(r => r.is_public && !isOwner(r.author_id)), [filteredRecipes, isOwner]);
    const { workspaceSettings } = useData();

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
            is_public: false, // Duplicates are private by default
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
        <div>
             <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Mis Recetas</h1>
                <div className="no-print flex items-center space-x-2">
                    <button 
                        onClick={() => setShowSettings(true)}
                        className="bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 flex items-center dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                        title="Configurar Categorías"
                    >
                        <CogIcon className="w-5 h-5 mr-1" /> Configurar
                    </button>
                    <Link to="/teacher/recipes/new" className="bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 flex items-center">
                        <PlusIcon className="w-5 h-5 mr-1" /> Nueva Receta
                    </Link>
                </div>
            </div>

            <Card>
                <input
                    type="search"
                    placeholder="Buscar por nombre de receta o ingrediente..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full p-2 border rounded-md mb-6 dark:bg-gray-700"
                />

                {/* My Recipes */}
                <h2 className="text-2xl font-semibold mb-3">Mis Fichas</h2>
                {myRecipes.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {myRecipes.map(recipe => {
                            const colors = getCategoryColors(recipe.category);
                            return (
                                <div key={recipe.id} className="p-4 border rounded-lg dark:border-gray-600 shadow-sm bg-blue-50 dark:bg-blue-900/20 relative overflow-hidden">
                                    {colors.length > 0 && (
                                        <div className="absolute top-0 left-0 w-full h-1 flex">
                                            {colors.map((c, i) => <div key={i} className="flex-1 h-full" style={{ backgroundColor: c }} />)}
                                        </div>
                                    )}
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-lg">{recipe.name}</h3>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/50 dark:bg-black/20 font-medium">
                                            {recipe.category}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 truncate">{recipe.description}</p>
                                    <div className="mt-2 text-xs">
                                        <span>Coste: {recipe.cost.toFixed(2)}€</span>
                                        <span className="ml-4">Precio: {recipe.price.toFixed(2)}€</span>
                                    </div>
                                    <div className="text-right mt-2 no-print flex justify-end items-center space-x-3">
                                         <button onClick={() => setRecipeToShare(recipe)} title="Compartir" className="text-gray-500 hover:text-primary-600"><ShareIcon className="w-5 h-5"/></button>
                                         <Link to={`/teacher/recipes/view/${recipe.id}`} title="Ver Ficha de Pase" className="text-amber-600 hover:text-amber-700"><EyeIcon className="w-5 h-5"/></Link>
                                         <Link to={`/teacher/recipes/edit/${recipe.id}`} title="Editar" className="text-primary-600 hover:underline"><PencilIcon className="w-5 h-5"/></Link>
                                         <button 
                                            onClick={() => {
                                                setRecipeToDelete(recipe);
                                                setDeleteConfirmStep(1);
                                            }} 
                                            title="Eliminar" 
                                            className="text-red-500 hover:text-red-700"
                                          >
                                            <TrashIcon className="w-5 h-5"/>
                                          </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-gray-500">No tienes recetas. <Link to="/teacher/recipes/new" className="text-primary-600 hover:underline">¡Crea la primera!</Link></p>
                )}

                {/* Public Recipes */}
                <h2 className="text-2xl font-semibold mt-8 mb-3">Fichas Públicas</h2>
                 {publicRecipes.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {publicRecipes.map(recipe => {
                            const colors = getCategoryColors(recipe.category);
                            return (
                                <div key={recipe.id} className="p-4 border rounded-lg dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 relative overflow-hidden">
                                    {colors.length > 0 && (
                                        <div className="absolute top-0 left-0 w-full h-1 flex">
                                            {colors.map((c, i) => <div key={i} className="flex-1 h-full" style={{ backgroundColor: c }} />)}
                                        </div>
                                    )}
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-lg">{recipe.name}</h3>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/50 dark:bg-black/20 font-medium">
                                            {recipe.category}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 truncate">{recipe.description}</p>
                                    <p className="text-xs text-gray-400 mt-1">Autor: {usersMap.get(recipe.author_id)?.name || 'Desconocido'}</p>
                                    <div className="text-right mt-2 no-print flex justify-end items-center space-x-3">
                                         <button onClick={() => setRecipeToShare(recipe)} title="Compartir" className="text-gray-500 hover:text-primary-600"><ShareIcon className="w-5 h-5"/></button>
                                         <Link to={`/teacher/recipes/view/${recipe.id}`} title="Ver Ficha de Pase" className="text-amber-600 hover:text-amber-700"><EyeIcon className="w-5 h-5"/></Link>
                                         <button onClick={() => handleDuplicate(recipe)} className="text-sm bg-green-600 text-white py-1 px-3 rounded-md hover:bg-green-700">Hacer Mía</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-gray-500">No hay otras recetas públicas disponibles.</p>
                )}
            </Card>

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
                            <TrashIcon className="w-8 h-8" />
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