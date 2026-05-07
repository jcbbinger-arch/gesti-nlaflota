import { 
    Wheat, 
    Shell, 
    Egg, 
    Fish, 
    Bean, 
    Leaf, 
    Milk, 
    Nut, 
    Sprout, 
    Droplets, 
    CircleDot, 
    FlaskConical, 
    Circle
} from 'lucide-react';
import React from 'react';

export const ALLERGENS_LIST = [
    "Gluten", "Crustáceos", "Huevos", "Pescado", "Cacahuetes", 
    "Soja", "Lácteos", "Frutos de cáscara", "Apio", "Mostaza", 
    "Sésamo", "Sulfitos", "Altramuces", "Moluscos"
];

export const ALLERGEN_ICONS: Record<string, React.ElementType> = {
    "Gluten": Wheat,
    "Crustáceos": Shell,
    "Huevos": Egg,
    "Pescado": Fish,
    "Cacahuetes": Bean,
    "Soja": Leaf,
    "Lácteos": Milk,
    "Frutos de cáscara": Nut,
    "Apio": Sprout,
    "Mostaza": Droplets,
    "Sésamo": CircleDot,
    "Sulfitos": FlaskConical,
    "Altramuces": Circle,
    "Moluscos": Shell
};

export const ALLERGEN_COLORS: Record<string, string> = {
    "Gluten": "#CE8E41",
    "Crustáceos": "#7DA5DE",
    "Huevos": "#D2C944",
    "Pescado": "#618FC7",
    "Cacahuetes": "#8D6241",
    "Soja": "#7AB869",
    "Lácteos": "#948777",
    "Frutos de cáscara": "#A84136",
    "Apio": "#88D97D",
    "Mostaza": "#D9BD44",
    "Sésamo": "#8E9797",
    "Sulfitos": "#8A44AB",
    "Altramuces": "#EBD944",
    "Moluscos": "#91C2DE"
};
