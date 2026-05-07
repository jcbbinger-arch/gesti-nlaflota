import React from 'react';
import { ALLERGENS_LIST, ALLERGEN_ICONS, ALLERGEN_COLORS } from '../lib/allergens';
import { Info } from 'lucide-react';

interface AllergensControlProps {
    selected?: string[];
}

export const AllergensControl: React.FC<AllergensControlProps> = ({ selected = [] }) => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm w-full">
            <div className="flex items-center justify-center space-x-2 mb-8 border-b border-gray-50 dark:border-gray-700 pb-4">
                <div className="text-amber-500">
                    <Info className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-800 dark:text-gray-200">
                    Control de Alérgenos
                </h3>
            </div>

            <div className="flex flex-wrap justify-center gap-x-8 gap-y-10">
                {ALLERGENS_LIST.map(allergen => {
                    const Icon = ALLERGEN_ICONS[allergen];
                    const color = ALLERGEN_COLORS[allergen];
                    const isPresent = selected.includes(allergen);

                    return (
                        <div 
                            key={allergen} 
                            className={`flex flex-col items-center group transition-all duration-300 ${isPresent ? 'opacity-100' : 'opacity-10'}`}
                        >
                            <div 
                                className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-110"
                                style={{ backgroundColor: color }}
                            >
                                <Icon className="w-6 h-6 text-white" />
                            </div>
                            <span className="mt-3 text-[9px] font-black uppercase tracking-widest text-gray-800 dark:text-gray-200 text-center w-24">
                                {allergen}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
