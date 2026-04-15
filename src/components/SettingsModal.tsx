import React, { useState } from 'react';
import { Modal } from './Modal';
import { ConfirmModal } from './ConfirmModal';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { WorkspaceSettings, DEFAULT_CATEGORIES, DEFAULT_CATEGORY_CONFIGS } from '../types';
import { TrashIcon, PlusIcon } from './icons';
import { resizeImage } from '../utils/image';

export const SettingsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { currentUser, updateCurrentUser } = useAuth();
    const { workspaceSettings, setWorkspaceSettings } = useData();
    
    const isProfileIncomplete = currentUser && (!currentUser.instituteName || !currentUser.teacherName);
    
    const [activeTab, setActiveTab] = useState<'categories' | 'profile'>(isProfileIncomplete ? 'profile' : 'categories');
    const [newCategory, setNewCategory] = useState('');
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Profile state
    const [profileForm, setProfileForm] = useState({
        teacherName: currentUser?.teacherName || currentUser?.name || '',
        teacherLogo: currentUser?.teacherLogo || '',
        instituteName: currentUser?.instituteName || '',
        instituteLogo: currentUser?.instituteLogo || ''
    });

    const currentSettings: WorkspaceSettings = workspaceSettings || {
        workspaceId: currentUser?.workspaceId || '',
        categories: DEFAULT_CATEGORIES,
        categoryConfigs: DEFAULT_CATEGORY_CONFIGS
    };

    // Ensure all categories have colors
    React.useEffect(() => {
        if (workspaceSettings && workspaceSettings.categories) {
            let needsUpdate = false;
            const updatedConfigs = [...(workspaceSettings.categoryConfigs || [])];
            
            workspaceSettings.categories.forEach(cat => {
                const config = updatedConfigs.find(c => c.name === cat);
                if (!config || !config.colors || config.colors.length < 2) {
                    needsUpdate = true;
                    const existingIndex = updatedConfigs.findIndex(c => c.name === cat);
                    const newConfig = { name: cat, colors: ["#3b82f6", "#60a5fa"] };
                    if (existingIndex >= 0) {
                        updatedConfigs[existingIndex] = newConfig;
                    } else {
                        updatedConfigs.push(newConfig);
                    }
                }
            });

            if (needsUpdate) {
                setWorkspaceSettings({
                    ...workspaceSettings,
                    categoryConfigs: updatedConfigs
                });
            }
        }
    }, [workspaceSettings, setWorkspaceSettings]);

    const handleSaveProfile = async () => {
        if (!profileForm.teacherName || !profileForm.instituteName) {
            setError("Por favor, completa el nombre del profesor e instituto.");
            return;
        }
        await updateCurrentUser(profileForm);
        onClose();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, field: 'teacherLogo' | 'instituteLogo') => {
        if (e.target.files && e.target.files[0]) {
            try {
                const resized = await resizeImage(e.target.files[0], 400, 400);
                setProfileForm(prev => ({ ...prev, [field]: resized }));
            } catch (error) {
                console.error("Error resizing image:", error);
                alert("Error al procesar la imagen.");
            }
        }
    };

    const handleAddCategory = () => {
        if (!newCategory.trim()) return;
        if (currentSettings.categories.includes(newCategory.trim())) {
            setError("La categoría ya existe.");
            return;
        }
        setError(null);

        const newSettings = {
            ...currentSettings,
            categories: [...currentSettings.categories, newCategory.trim()].sort(),
            categoryConfigs: [...(currentSettings.categoryConfigs || []), { name: newCategory.trim(), colors: ["#3b82f6", "#60a5fa"] }]
        };
        setWorkspaceSettings(newSettings);
        setNewCategory('');
    };

    const handleRemoveCategory = (category: string) => {
        const newSettings = {
            ...currentSettings,
            categories: currentSettings.categories.filter(c => c !== category),
            categoryConfigs: currentSettings.categoryConfigs?.filter(c => c.name !== category) || []
        };
        setWorkspaceSettings(newSettings);
        setConfirmDelete(null);
    };

    const handleColorChange = (category: string, colorIndex: number, colorValue: string) => {
        let configs = [...(currentSettings.categoryConfigs || [])];
        let configIndex = configs.findIndex(c => c.name === category);
        
        if (configIndex >= 0) {
            let newColors = [...configs[configIndex].colors];
            newColors[colorIndex] = colorValue;
            configs[configIndex] = { ...configs[configIndex], colors: newColors };
        } else {
            let newColors = ['#ffffff', '#ffffff', '#ffffff'];
            newColors[colorIndex] = colorValue;
            configs.push({ name: category, colors: newColors });
        }

        const newSettings = { ...currentSettings, categoryConfigs: configs };
        setWorkspaceSettings(newSettings);
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="Configuración del Espacio de Trabajo" size="xl">
            <div className="flex border-b mb-6">
                <button 
                    onClick={() => setActiveTab('categories')}
                    className={`px-4 py-2 font-medium ${activeTab === 'categories' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500'}`}
                >
                    Categorías y Colores
                </button>
                <button 
                    onClick={() => setActiveTab('profile')}
                    className={`px-4 py-2 font-medium ${activeTab === 'profile' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500'}`}
                >
                    Perfil y Marca
                </button>
            </div>

            <div className="space-y-6">
                {error && (
                    <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded relative">
                        {error}
                        <button onClick={() => setError(null)} className="absolute top-0 right-0 p-2">×</button>
                    </div>
                )}
                {activeTab === 'categories' ? (
                    <>
                        <div>
                            <h3 className="text-lg font-medium mb-2">Añadir Categoría</h3>
                            <div className="flex space-x-2">
                                <input 
                                    type="text" 
                                    value={newCategory} 
                                    onChange={e => setNewCategory(e.target.value)}
                                    placeholder="Nueva categoría..."
                                    className="flex-1 p-2 border rounded dark:bg-gray-700"
                                />
                                <button 
                                    onClick={handleAddCategory}
                                    className="bg-primary-600 text-white px-4 py-2 rounded flex items-center hover:bg-primary-700"
                                >
                                    <PlusIcon className="w-5 h-5 mr-1" /> Añadir
                                </button>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-medium mb-2">Categorías Actuales</h3>
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {currentSettings.categories.map(category => {
                                    const config = currentSettings.categoryConfigs?.find(c => c.name === category);
                                    const colors = config?.colors || ['#ffffff', '#ffffff', '#ffffff'];

                                    return (
                                        <div key={category} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded border">
                                            <span className="font-medium flex-1">{category}</span>
                                            <div className="flex items-center space-x-4">
                                                <div className="flex space-x-2">
                                                    <input 
                                                        type="color" 
                                                        value={colors[0]} 
                                                        onChange={e => handleColorChange(category, 0, e.target.value)}
                                                        title="Color 1"
                                                        className="w-8 h-8 cursor-pointer"
                                                    />
                                                    <input 
                                                        type="color" 
                                                        value={colors[1]} 
                                                        onChange={e => handleColorChange(category, 1, e.target.value)}
                                                        title="Color 2"
                                                        className="w-8 h-8 cursor-pointer"
                                                    />
                                                    <input 
                                                        type="color" 
                                                        value={colors[2]} 
                                                        onChange={e => handleColorChange(category, 2, e.target.value)}
                                                        title="Color 3"
                                                        className="w-8 h-8 cursor-pointer"
                                                    />
                                                </div>
                                                <button 
                                                    onClick={() => setConfirmDelete(category)}
                                                    className="text-red-500 hover:text-red-700 p-1"
                                                    title="Eliminar categoría"
                                                >
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                                {currentSettings.categories.length === 0 && (
                                    <p className="text-gray-500 text-sm">No hay categorías configuradas.</p>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium border-b pb-2">Datos del Profesor</h3>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre del Profesor</label>
                                <input 
                                    type="text" 
                                    value={profileForm.teacherName}
                                    onChange={e => setProfileForm({...profileForm, teacherName: e.target.value})}
                                    className="mt-1 block w-full p-2 border rounded dark:bg-gray-700"
                                    placeholder="Ej: Juan Pérez"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Logo/Firma Profesor</label>
                                <input 
                                    type="file" 
                                    accept="image/*"
                                    onChange={e => handleFileChange(e, 'teacherLogo')}
                                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                                />
                                {profileForm.teacherLogo && (
                                    <img src={profileForm.teacherLogo} alt="Preview" className="mt-2 h-16 w-auto border rounded" />
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-lg font-medium border-b pb-2">Datos del Instituto</h3>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre del Instituto</label>
                                <input 
                                    type="text" 
                                    value={profileForm.instituteName}
                                    onChange={e => setProfileForm({...profileForm, instituteName: e.target.value})}
                                    className="mt-1 block w-full p-2 border rounded dark:bg-gray-700"
                                    placeholder="Ej: IES Gastronomía"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Logo Instituto</label>
                                <input 
                                    type="file" 
                                    accept="image/*"
                                    onChange={e => handleFileChange(e, 'instituteLogo')}
                                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                                />
                                {profileForm.instituteLogo && (
                                    <img src={profileForm.instituteLogo} alt="Preview" className="mt-2 h-16 w-auto border rounded" />
                                )}
                            </div>
                        </div>

                        <div className="md:col-span-2 flex justify-end">
                            <button 
                                onClick={handleSaveProfile}
                                className="bg-primary-600 text-white px-6 py-2 rounded font-bold hover:bg-primary-700"
                            >
                                Guardar Perfil y Marca
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex justify-end pt-4 border-t">
                    <button onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300">
                        Cerrar
                    </button>
                </div>
            </div>

            <ConfirmModal 
                isOpen={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                onConfirm={() => confirmDelete && handleRemoveCategory(confirmDelete)}
                title="Eliminar Categoría"
                message={`¿Estás seguro de eliminar la categoría "${confirmDelete}"?`}
                type="danger"
            />
        </Modal>
    );
};
