import { Wheat, Shell, Egg, Fish, Nut, Bean, Milk, AlertTriangle, Leaf, Shell as ShellIcon } from 'lucide-react';
import React from 'react';

export const ALLERGENS_LIST = ["Gluten", "Crustáceos", "Huevos", "Pescado", "Cacahuetes", "Soja", "Lácteos", "Frutos de cáscara", "Apio", "Mostaza", "Sésamo", "Sulfitos", "Altramuces", "Moluscos"];

export const ALLERGEN_ICONS: Record<string, React.ElementType> = {
    "Gluten": Wheat,
    "Crustáceos": Shell,
    "Huevos": Egg,
    "Pescado": Fish,
    "Cacahuetes": Nut,
    "Soja": Bean,
    "Lácteos": Milk,
    "Frutos de cáscara": Nut,
    "Apio": Leaf,
    "Mostaza": Leaf,
    "Sésamo": Wheat,
    "Sulfitos": AlertTriangle,
    "Altramuces": Bean,
    "Moluscos": ShellIcon
};
