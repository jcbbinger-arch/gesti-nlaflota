// lib/unitConverter.ts

// Factores de conversión a unidades base (gramos o mililitros)
const CONVERSION_FACTORS: Record<string, number> = {
  'kg': 1000,
  'g': 1,
  'l': 1000,
  'ml': 1,
  'unidad': 1, // Para productos contables
  'Uds': 1,
  'ud': 1
};

export const convertToBaseUnit = (quantity: number, unit: string): number => {
  return quantity * (CONVERSION_FACTORS[unit] || 1);
};

export const areUnitsCompatible = (unit1: string, unit2: string): boolean => {
  const weightUnits = ['kg', 'g'];
  const volumeUnits = ['l', 'ml'];
  const unitUnits = ['unidad', 'Uds', 'ud'];

  const getCategory = (u: string) => {
    if (weightUnits.includes(u)) return 'weight';
    if (volumeUnits.includes(u)) return 'volume';
    if (unitUnits.includes(u)) return 'unit';
    return 'other';
  };

  const cat1 = getCategory(unit1);
  const cat2 = getCategory(unit2);

  if (cat1 === 'other' || cat2 === 'other') return true; // Allow if unknown
  return cat1 === cat2;
};

export const calculateIngredientCost = (
  quantity: number,
  unit: string,
  pricePerUnit: number, // Precio por la unidad base del producto (ej: precio por kg o por litro)
  unitOfPrice: string   // La unidad en la que está definido el precio (ej: 'kg', 'l')
): number => {
  if (!areUnitsCompatible(unit, unitOfPrice)) {
    // In strict mode we might return 0 or throw, but for now let's try to calculate 
    // assuming 1kg = 1l for simplicity if they are mixed, or just return 0 if incompatible
    // The requirement says "mostrar una advertencia o bloquear el cálculo"
    return 0; 
  }

  const quantityInBase = convertToBaseUnit(quantity, unit);
  const pricePerBaseUnit = pricePerUnit / (CONVERSION_FACTORS[unitOfPrice] || 1);
  
  // If base is grams/ml, and price was per kg/l (1000 base units)
  // cost = quantityInBase * (pricePerUnit / 1000)
  return quantityInBase * pricePerBaseUnit;
};
