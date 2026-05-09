// lib/unitConverter.ts

// Factores de conversión a unidades base (gramos o mililitros)
const CONVERSION_FACTORS: Record<string, number> = {
  'kg': 1000,
  'g': 1,
  'l': 1000,
  'ml': 1,
  'unidad': 1, // Para productos contables
  'uds': 1,
  'ud': 1
};

export const convertToBaseUnit = (quantity: number, unit: string): number => {
  const normalizedUnit = unit.toLowerCase().trim();
  return quantity * (CONVERSION_FACTORS[normalizedUnit] || 1);
};

export const areUnitsCompatible = (unit1: string, unit2: string): boolean => {
  const normalized1 = unit1.toLowerCase().trim();
  const normalized2 = unit2.toLowerCase().trim();
  
  const cat1 = getUnitCategory(normalized1);
  const cat2 = getUnitCategory(normalized2);

  if (cat1 === 'other' || cat2 === 'other') return true; // Allow if unknown
  return cat1 === cat2;
};

const getUnitCategory = (u: string) => {
  const weightUnits = ['kg', 'g'];
  const volumeUnits = ['l', 'ml'];
  const unitUnits = ['unidad', 'uds', 'ud'];

  if (weightUnits.includes(u)) return 'weight';
  if (volumeUnits.includes(u)) return 'volume';
  if (unitUnits.includes(u)) return 'unit';
  return 'other';
};

export const calculateIngredientCost = (
  quantity: number,
  unit: string,
  pricePerUnit: number, // Precio por la unidad base del producto (ej: precio por la unidad configurada en el producto)
  unitOfPrice: string,   // La unidad en la que está definido el precio (ej: 'kg', 'l', 'ud')
  unitSize?: number,
  unitSizeType?: string
): number => {
  const normalizedUnit = unit.toLowerCase().trim();
  const normalizedPriceUnit = unitOfPrice.toLowerCase().trim();

  const recipeUnitCat = getUnitCategory(normalizedUnit);
  const priceUnitCat = getUnitCategory(normalizedPriceUnit);

  // 1. If units are directly compatible (kg/g, l/ml, or ud/ud)
  if (areUnitsCompatible(normalizedUnit, normalizedPriceUnit)) {
    const quantityInBase = convertToBaseUnit(quantity, normalizedUnit);
    const pricePerBaseUnit = pricePerUnit / (CONVERSION_FACTORS[normalizedPriceUnit] || 1);
    return quantityInBase * pricePerBaseUnit;
  }

  // 2. If not compatible, check if we can bridge via unitSize
  // Example: Product unit is 'ud' (1 bag), unitSize is 5, unitSizeType is 'kg'. Price is per 'ud'.
  // Recipe unit is 'g'.
  if (unitSize && unitSize > 0 && unitSizeType) {
    // Bridge from Unit to Weight/Volume
    if (priceUnitCat === 'unit' && (recipeUnitCat === 'weight' || recipeUnitCat === 'volume')) {
      const sizeInBase = convertToBaseUnit(unitSize, unitSizeType); // e.g. 5kg -> 5000g
      const pricePerBaseOfSize = pricePerUnit / sizeInBase; // e.g. 10€ / 5000g = 0.002€/g
      const quantityInBase = convertToBaseUnit(quantity, normalizedUnit); // e.g. 20g -> 20g
      return quantityInBase * pricePerBaseOfSize;
    }

    // Bridge from Weight/Volume to Unit
    // Example: Product unit is 'kg', price is per 'kg'. Recipe unit is 'ud', unitSize is 300, unitSizeType is 'g'.
    if (recipeUnitCat === 'unit' && (priceUnitCat === 'weight' || priceUnitCat === 'volume')) {
       const sizeInBase = convertToBaseUnit(unitSize, unitSizeType); // e.g. 300g -> 300g
       const quantityInBaseWeight = quantity * sizeInBase; // e.g. 2 uds -> 600g
       const pricePerBaseUnit = pricePerUnit / (CONVERSION_FACTORS[normalizedPriceUnit] || 1);
       return quantityInBaseWeight * pricePerBaseUnit;
    }
  }

  return 0; 
};
