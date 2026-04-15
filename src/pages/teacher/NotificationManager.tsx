import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../../components/Card';
import { ClipboardDocumentListIcon } from '../../components/icons';

export const NotificationManager: React.FC = () => {
    const { sale_items } = useData();
    const [selectedItems, setSelectedItems] = useState<string[]>([]);

    const activeItems = useMemo(() => sale_items.filter(item => item.status === 'Activo' && item.rations > 0), [sale_items]);

    const toggleItem = (id: string) => {
        setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const generateTemplate = () => {
        const items = activeItems.filter(item => selectedItems.includes(item.id));
        if (items.length === 0) return 'Por favor, selecciona al menos un plato.';

        let template = `Hola,\n\n¡Tenemos nuevas comidas para llevar disponibles!\n\n`;
        items.forEach(item => {
            template += `- ${item.name}: ${item.price.toFixed(2)}€ (${item.rations} raciones disponibles)\n  Alérgenos: ${item.allergens.join(', ')}\n\n`;
        });
        template += `Puedes realizar tu reserva aquí: [ENLACE_A_LA_PLATAFORMA]\n\n¡Esperamos tu pedido!`;
        return template;
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generateTemplate());
        alert('Plantilla copiada al portapapeles');
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6">Notificaciones de Ventas</h1>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Seleccionar Platos para Notificar">
                    <div className="space-y-2">
                        {activeItems.map(item => (
                            <label key={item.id} className="flex items-center space-x-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                                <input type="checkbox" checked={selectedItems.includes(item.id)} onChange={() => toggleItem(item.id)} className="form-checkbox h-5 w-5 text-primary-600" />
                                <span>{item.name} - {item.price.toFixed(2)}€</span>
                            </label>
                        ))}
                    </div>
                </Card>
                <Card title="Plantilla de Correo">
                    <pre className="whitespace-pre-wrap text-sm bg-gray-50 dark:bg-gray-800 p-4 rounded-md mb-4 border dark:border-gray-700">
                        {generateTemplate()}
                    </pre>
                    <button onClick={copyToClipboard} className="bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 flex items-center">
                        <ClipboardDocumentListIcon className="w-5 h-5 mr-1" /> Copiar al Portapapeles
                    </button>
                </Card>
            </div>
        </div>
    );
};
