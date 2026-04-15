import React, { useState } from 'react';
import { useCreator } from '../../contexts/CreatorContext';
import { Card } from '../../components/Card';
import { Modal } from '../../components/Modal';
import { Creator } from '../../types';
import { SignatureIcon, TrashIcon, WarningIcon, DownloadIcon } from '../../components/icons';
import { printPage } from '../../utils/export';

export const CreatorDashboard: React.FC = () => {
  const { creatorInfo, setCreatorInfo } = useCreator();
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetStep, setResetStep] = useState(1);
  const [resetInput, setResetInput] = useState('');

  const [formState, setFormState] = useState<Creator>(creatorInfo);

  React.useEffect(() => {
    setFormState(creatorInfo);
  }, [creatorInfo]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormState({ ...formState, [e.target.name]: e.target.value });
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 500 * 1024) {
        alert('El archivo es demasiado grande. Por favor, sube una imagen de menos de 500KB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormState({ ...formState, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCreatorInfo(formState);
    alert('¡Firma del creador actualizada!');
  };

  const handleFactoryReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Panel del Creador</h1>
        <button onClick={printPage} className="no-print bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 flex items-center">
            <DownloadIcon className="w-5 h-5 mr-2" />
            Descargar PDF
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <Card title="Configura tu Firma" icon={<SignatureIcon className="w-8 h-8"/>}>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Nombre del Creador</label>
              <input type="text" name="name" value={formState.name} onChange={handleFormChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-primary-500 focus:ring-primary-500"/>
            </div>
            <div>
              <label className="block text-sm font-medium">Logo</label>
              <div className="mt-1 flex items-center space-x-4">
                <img src={formState.logo} alt="Logo Preview" className="h-12 w-12 rounded-full object-cover bg-gray-200"/>
                <input type="file" name="logo" accept="image/*" onChange={handleLogoChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"/>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium">Email de Contacto</label>
              <input type="text" name="website" value={formState.website} onChange={handleFormChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-primary-500 focus:ring-primary-500"/>
            </div>
            <div>
              <label className="block text-sm font-medium">Texto de Copyright</label>
              <input type="text" name="copyright" value={formState.copyright} onChange={handleFormChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-primary-500 focus:ring-primary-500"/>
            </div>
             <div>
              <label className="block text-sm font-medium">Nombre de la Aplicación</label>
              <input type="text" name="app_name" value={formState.app_name || ''} onChange={handleFormChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-primary-500 focus:ring-primary-500"/>
            </div>
            <button type="submit" className="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 no-print">Guardar Firma</button>
          </form>
        </Card>

        <div className="space-y-6">
          <Card title="Zona Peligrosa" icon={<TrashIcon className="w-8 h-8 text-red-500"/>} className="border border-red-500">
             <p className="mb-4">Restablece la aplicación a su estado inicial. Esto eliminará todos los datos del almacenamiento local de tu navegador y no se puede deshacer.</p>
             <button onClick={() => { setIsResetModalOpen(true); setResetStep(1); setResetInput(''); }} className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 no-print">Restablecer a Ajustes de Fábrica</button>
          </Card>
        </div>
      </div>

      <Modal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} title="Confirmar Restablecimiento de Fábrica">
        {resetStep === 1 ? (
          <div>
            <div className="text-center">
                <WarningIcon className="w-16 h-16 text-red-500 mx-auto"/>
                <p className="text-lg font-semibold my-4">¿Estás absolutamente seguro?</p>
                <p className="text-gray-500">Esta acción es irreversible. Todos los datos, incluidos usuarios, productos, pedidos y tus configuraciones, se eliminarán permanentemente.</p>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button onClick={() => setIsResetModalOpen(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300">Cancelar</button>
              <button onClick={() => setResetStep(2)} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Entiendo, continuar</button>
            </div>
          </div>
        ) : (
          <div>
            <p className="mb-4">Para confirmar, escribe <strong className="text-red-500">RESET</strong> en el cuadro de abajo.</p>
            <input 
              type="text"
              value={resetInput}
              onChange={(e) => setResetInput(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-md p-2 text-center font-mono dark:bg-gray-700 dark:border-gray-600"
            />
            <div className="mt-6 flex justify-end">
              <button 
                onClick={handleFactoryReset}
                disabled={resetInput !== 'RESET'}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-md disabled:bg-red-300 disabled:cursor-not-allowed"
              >
                Eliminar Todos los Datos
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};