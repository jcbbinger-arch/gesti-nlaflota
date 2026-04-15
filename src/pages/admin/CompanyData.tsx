

import React, { useState, useMemo, useEffect } from 'react';
import { useCompany } from '../../contexts/CompanyContext';
import { Card } from '../../components/Card';
import { CompanyIcon } from '../../components/icons';
import { Company, Profile, User, SUPER_USER_EMAILS, DEFAULT_CATEGORY_CONFIGS } from '../../types';
import { useData } from '../../contexts/DataContext';
import { DEFAULT_CATEGORIES } from '../../types';
import { resizeImage } from '../../utils/image';

export const CompanyData: React.FC = () => {
  const { companyInfo, setCompanyInfo } = useCompany();
  const { users, workspaceSettings, setWorkspaceSettings } = useData();
  const [formState, setFormState] = useState<Company>(companyInfo);
  const [isSaved, setIsSaved] = useState(false);

  const [newCategory, setNewCategory] = useState('');
  
  // Ensure we have default configs if none exist
  const categories = useMemo(() => workspaceSettings?.categories || DEFAULT_CATEGORIES, [workspaceSettings]);
  const categoryConfigs = useMemo(() => {
    if (workspaceSettings?.categoryConfigs && workspaceSettings.categoryConfigs.length > 0) {
      return workspaceSettings.categoryConfigs;
    }
    return DEFAULT_CATEGORY_CONFIGS;
  }, [workspaceSettings]);

  const handleAddCategory = () => {
    if (!newCategory.trim()) return;
    const updatedCategories = [...categories, newCategory.trim()];
    const newConfig = { name: newCategory.trim(), colors: ["#3b82f6", "#60a5fa"] };
    setWorkspaceSettings({
        ...workspaceSettings!,
        categories: updatedCategories,
        categoryConfigs: [...categoryConfigs, newConfig]
    });
    setNewCategory('');
  };

  const handleRemoveCategory = (cat: string) => {
    const updatedCategories = categories.filter(c => c !== cat);
    const updatedConfigs = categoryConfigs.filter(c => c.name !== cat);
    setWorkspaceSettings({
        ...workspaceSettings!,
        categories: updatedCategories,
        categoryConfigs: updatedConfigs
    });
  };

  const handleUpdateCategoryColor = (catName: string, colorIndex: number, color: string) => {
    const configs = [...categoryConfigs];
    let config = configs.find(c => c.name === catName);
    if (!config) {
        config = { name: catName, colors: ["#cccccc", "#cccccc", "#cccccc"] };
        configs.push(config);
    }
    const newColors = [...config.colors];
    newColors[colorIndex] = color;
    config.colors = newColors;

    setWorkspaceSettings({
        ...workspaceSettings!,
        categoryConfigs: configs
    });
  };

  useEffect(() => {
    setFormState(companyInfo);
  }, [companyInfo]);

  // FIX: Replaced Profile.MANAGER with Profile.ALMACEN, which exists in the enum.
  const managerUsers = useMemo(() => users.filter(u => u.profiles.includes(Profile.ALMACEN) && !SUPER_USER_EMAILS.includes(u.email)), [users]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const isNumber = type === 'number';
    setFormState({ ...formState, [name]: isNumber ? parseFloat(value) : value });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logo' | 'print_logo') => {
    if (e.target.files && e.target.files[0]) {
      try {
        const resized = await resizeImage(e.target.files[0], 400, 400);
        setFormState({ ...formState, [field]: resized });
      } catch (error) {
        console.error("Error resizing image:", error);
        alert("Error al procesar la imagen.");
      }
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCompanyInfo(formState);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6">Datos de la Empresa</h1>
      <Card title="Información General y de Contacto" icon={<CompanyIcon className="w-8 h-8" />}>
        <form onSubmit={handleFormSubmit} className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium">Nombre de la Empresa</label>
              <input type="text" name="name" value={formState.name} onChange={handleFormChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600"/>
            </div>
            <div>
              <label className="block text-sm font-medium">CIF</label>
              <input type="text" name="cif" value={formState.cif} onChange={handleFormChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600"/>
            </div>
             <div>
              <label className="block text-sm font-medium">Teléfono</label>
              <input type="text" name="phone" value={formState.phone} onChange={handleFormChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600"/>
            </div>
             <div>
              <label className="block text-sm font-medium">Email</label>
              <input type="email" name="email" value={formState.email} onChange={handleFormChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600"/>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium">Dirección</label>
              <textarea name="address" value={formState.address} onChange={handleFormChange} rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600"/>
            </div>
          </div>

          <hr className="dark:border-gray-700"/>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div>
                <label className="block text-sm font-medium">Logo Principal (Interfaz)</label>
                <input type="file" name="logo" accept="image/*,.gif" onChange={(e) => handleFileChange(e, 'logo')} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"/>
            </div>
            <div className="flex justify-center">
                <img src={formState.logo} alt="Logo Preview" className="h-16 w-auto bg-gray-100 dark:bg-gray-600 p-2 rounded-md"/>
            </div>
            <div>
                <label className="block text-sm font-medium">Logo para Documentos (Impresión)</label>
                <input type="file" name="print_logo" accept="image/png, image/jpeg" onChange={(e) => handleFileChange(e, 'print_logo')} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"/>
            </div>
            <div className="flex justify-center">
                <img src={formState.print_logo} alt="Print Logo Preview" className="h-16 w-auto bg-white p-2 rounded-md shadow-sm"/>
            </div>
          </div>

          <hr className="dark:border-gray-700"/>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium">Encargado de Almacén</label>
                    <select name="manager_user_id" value={formState.manager_user_id} onChange={handleFormChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600">
                        <option value="">-- Seleccionar Encargado --</option>
                        {managerUsers.map(user => (
                            <option key={user.id} value={user.id}>{user.name}</option>
                        ))}
                    </select>
                </div>
                 <div>
                    <label className="block text-sm font-medium">Presupuesto por Defecto (€)</label>
                    <input type="number" name="default_budget" value={formState.default_budget} onChange={handleFormChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600"/>
                </div>
            </div>

          <div className="flex justify-end pt-4">
            <button type="submit" className="bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700">
                {isSaved ? '¡Guardado!' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </Card>

      <Card title="Categorías de Recetas y Colores" className="mt-6">
          <div className="space-y-6">
              <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Nueva categoría..."
                    className="flex-1 rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600"
                  />
                  <button 
                    onClick={handleAddCategory}
                    className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
                  >
                      Añadir
                  </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {categories.map(cat => {
                      const config = categoryConfigs.find(c => c.name === cat);
                      return (
                          <div key={cat} className="p-4 border dark:border-gray-700 rounded-lg space-y-3">
                              <div className="flex justify-between items-center">
                                  <span className="font-bold">{cat}</span>
                                  <button 
                                    onClick={() => handleRemoveCategory(cat)}
                                    className="text-red-500 hover:text-red-700 text-xs"
                                  >
                                      Eliminar
                                  </button>
                              </div>
                              <div className="flex gap-2">
                                  {[0, 1, 2].map(i => (
                                      <div key={i} className="flex flex-col items-center gap-1">
                                          <input 
                                            type="color" 
                                            value={config?.colors[i] || '#cccccc'}
                                            onChange={(e) => handleUpdateCategoryColor(cat, i, e.target.value)}
                                            className="w-8 h-8 rounded cursor-pointer"
                                          />
                                          <span className="text-[10px] text-gray-500">Color {i+1}</span>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      </Card>
    </div>
  );
};