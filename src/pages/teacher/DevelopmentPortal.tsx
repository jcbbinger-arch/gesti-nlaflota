import React from 'react';
import { Card } from '../../components/Card';
import { RecipeIcon } from '../../components/icons';

export const DevelopmentPortal: React.FC = () => {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Portal de Desarrollo</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Recetas a la vista del cliente (Servicios)">
                    <p className="text-gray-500 italic">En desarrollo...</p>
                </Card>
                <Card title="Cocteles y Combinados">
                    <p className="text-gray-500 italic">En desarrollo...</p>
                </Card>
                <Card title="Vinos y Maridaje">
                    <p className="text-gray-500 italic">En desarrollo...</p>
                </Card>
                <Card title="Panadería (Humedad/Temperaturas)">
                    <p className="text-gray-500 italic">En desarrollo...</p>
                </Card>
            </div>
        </div>
    );
};
