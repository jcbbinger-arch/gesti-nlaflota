import React from 'react';
import { Card } from '../../components/Card';
import { DownloadIcon } from '../../components/icons';
import { printPage } from '../../utils/export';

export const StudentMiniEconomato: React.FC = () => {

    const dummyStock = [
        { name: 'Solomillo de Práctica', stock: 5, min_stock: 10 },
        { name: 'Harina de Demostración', stock: 25, min_stock: 15 },
        { name: 'Aceite Ficticio', stock: 2, min_stock: 5 },
    ];

    const getStockLevelClass = (current: number, min: number) => {
        if (current <= 0) return 'bg-red-200 dark:bg-red-900 border-red-400';
        if (current <= min) return 'bg-yellow-200 dark:bg-yellow-900 border-yellow-400';
        return 'bg-green-200 dark:bg-green-900 border-green-400';
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Práctica: Mini-Economato</h1>
                <button onClick={printPage} className="no-print bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 flex items-center">
                    <DownloadIcon className="w-5 h-5 mr-2" />
                    Descargar PDF
                </button>
            </div>
             <p className="mb-6 text-gray-500">Revisa el stock del almacén simulado y detecta qué productos necesitan ser repuestos.</p>

            <Card title="Stock del Aula">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {dummyStock.map((item, index) => (
                        <div key={index} className={`p-4 rounded-lg border ${getStockLevelClass(item.stock, item.min_stock)}`}>
                            <h4 className="font-bold">{item.name}</h4>
                            <p>Stock Actual: <span className="font-bold text-xl">{item.stock}</span></p>
                            <p className="text-sm">Stock Mínimo: {item.min_stock}</p>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
};