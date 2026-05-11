import React from 'react';
import { Card } from '../../components/Card';
import { ChefHat, Wine, GlassWater, ThermometerSun } from 'lucide-react';

export const DevelopmentPortal: React.FC = () => {
    return (
        <div className="p-6 max-w-7xl mx-auto">
            <header className="mb-8">
                <h1 className="text-3xl font-black text-gray-800 dark:text-white uppercase tracking-tighter">Portal de Desarrollo</h1>
                <p className="text-gray-500 font-medium">Nuevas funcionalidades y módulos en fase de diseño</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card 
                    title="Recetas a la Vista del Cliente" 
                    icon={<ChefHat className="w-5 h-5 text-primary-500" />}
                >
                    <div className="space-y-4">
                        <div className="p-4 bg-primary-50 dark:bg-primary-900/10 rounded-xl border border-primary-100 dark:border-primary-800">
                            <p className="text-xs font-black text-primary-600 uppercase mb-2">Estado: Planificación</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Módulo para la creación de fichas técnicas de platos elaborados frente al cliente (Gueridón).
                            </p>
                            <span className="mt-4 inline-block text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded uppercase">Por desarrollar</span>
                        </div>
                    </div>
                </Card>

                <Card 
                    title="Cócteles y Combinados" 
                    icon={<GlassWater className="w-5 h-5 text-indigo-500" />}
                >
                    <div className="space-y-4">
                        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-800">
                            <p className="text-xs font-black text-indigo-600 uppercase mb-2">Estado: Planificación</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Fichas de coctelería clásica y de autor. Control de cristalería, decoración (garnish) y método de elaboración.
                            </p>
                            <span className="mt-4 inline-block text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded uppercase">Por desarrollar</span>
                        </div>
                    </div>
                </Card>

                <Card 
                    title="Bodega y Vinos" 
                    icon={<Wine className="w-5 h-5 text-red-500" />}
                >
                    <div className="space-y-4">
                        <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-800">
                            <p className="text-xs font-black text-red-600 uppercase mb-2">Estado: Planificación</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Gestión de fichas de cata y maridajes recomendados para integrar en el Menú del Servicio.
                            </p>
                            <span className="mt-4 inline-block text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded uppercase">Por desarrollar</span>
                        </div>
                    </div>
                </Card>

                <Card 
                    title="Módulo de Panadería Avanzada" 
                    icon={<ThermometerSun className="w-5 h-5 text-amber-500" />}
                >
                    <div className="space-y-4">
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800">
                            <p className="text-xs font-black text-amber-600 uppercase mb-2">Estado: Planificación</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Fichas técnicas específicas con control de humedad de masa, tiempos de fermentación y temperaturas de cocción.
                            </p>
                            <span className="mt-4 inline-block text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded uppercase">Por desarrollar</span>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};
