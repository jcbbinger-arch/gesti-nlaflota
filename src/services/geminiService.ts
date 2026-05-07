import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface AIDigitalizedRecipe {
    name: string;
    category: string;
    yieldQuantity: number;
    yieldUnit: string;
    ingredients: {
        name: string;
        quantity: number;
        unit: string;
    }[];
    instructions: string;
    notes: string;
    presentation: string;
    servingTemp: string;
    clientDescription: string;
    serviceTime: string;
    serviceTechnique: string;
    cutleryRequired: string;
    serviceExplanation: string;
}

export const digitalizeRecipe = async (input: string): Promise<AIDigitalizedRecipe> => {
    const prompt = `Actúa como un Chef Ejecutivo y experto en digitalización de datos gastronómicos.
Tu tarea es convertir el texto o imagen de una receta proporcionada en un objeto JSON estructurado.

REGLAS DE FORMATO:
1. Devuelve ÚNICAMENTE el código JSON.
2. Esquema exacto:
{
  "name": "Nombre de la receta",
  "category": "Entrantes|Principales|Postres|Bebidas|Salsas|Guarniciones|Otros",
  "yieldQuantity": 4, 
  "yieldUnit": "raciones",
  "ingredients": [{"name": "Nombre del producto", "quantity": 100, "unit": "g|kg|ml|l|ud"}],
  "instructions": "Pasos detallados concatenados en un solo texto...",
  "notes": "Alérgenos, puntos críticos o consejos",
  "presentation": "Instrucciones de emplatado y acabado final",
  "servingTemp": "Temperatura exacta (ej: 60-65°C)",
  "clientDescription": "Descripción sugerente para carta (máximo 2 frases)",
  "serviceTime": "Tiempo estimado de preparación",
  "serviceTechnique": "Americana|Inglesa|Francesa|Buffet|Gueridón|Venta Directa",
  "cutleryRequired": "Cubiertos necesarios (ej: Tenedor pescado + Pala)",
  "serviceExplanation": "Storytelling del plato para el camarero"
}

REGLAS TÉCNICAS:
- "yieldQuantity" siempre numérico.
- Cantidades de ingredientes siempre numéricas.
- Si hay varias elaboraciones, combina todos los ingredientes en una lista y todas las instrucciones en un texto coherente.
- "clientDescription" DEBE ser muy comercial y atractiva.
- "serviceExplanation" debe ser útil para que el camarero lo cuente al cliente.

TEXTO A DIGITALIZAR:
${input}`;

    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    category: { type: Type.STRING },
                    yieldQuantity: { type: Type.NUMBER },
                    yieldUnit: { type: Type.STRING },
                    ingredients: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                quantity: { type: Type.NUMBER },
                                unit: { type: Type.STRING }
                            },
                            required: ["name", "quantity", "unit"]
                        }
                    },
                    instructions: { type: Type.STRING },
                    notes: { type: Type.STRING },
                    presentation: { type: Type.STRING },
                    servingTemp: { type: Type.STRING },
                    clientDescription: { type: Type.STRING },
                    serviceTime: { type: Type.STRING },
                    serviceTechnique: { type: Type.STRING },
                    cutleryRequired: { type: Type.STRING },
                    serviceExplanation: { type: Type.STRING }
                },
                required: ["name", "category", "yieldQuantity", "yieldUnit", "ingredients", "instructions"]
            }
        }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text);
};

export const generateRecipeIdea = async (params: {
    vibe: string;
    ingredients: string;
    level: string;
    objective: string;
    restrictions: string;
}): Promise<AIDigitalizedRecipe> => {
    const prompt = `Actúa como un Arquitecto Culinario de I+D. Crea una receta innovadora basada en los siguientes parámetros:
- Estilo/Vibe: ${params.vibe}
- Ingredientes clave: ${params.ingredients}
- Complejidad: ${params.level}
- Objetivo: ${params.objective}
- Restricciones: ${params.restrictions}

Devuelve la receta en formato JSON siguiendo este esquema:
{
  "name": "Nombre creativo del plato",
  "category": "Categoría lógica",
  "yieldQuantity": 4,
  "yieldUnit": "raciones",
  "ingredients": [{"name": "Ingrediente", "quantity": 100, "unit": "g|kg|ml|l|ud"}],
  "instructions": "Pasos técnicos detallados...",
  "notes": "Consejos del chef y maridaje sugerido",
  "presentation": "Propuesta de emplatado artístico y acabado final",
  "servingTemp": "Temperatura de pase sugerida",
  "clientDescription": "Descripción poética y comercial para el menú",
  "serviceTime": "Tiempo aproximado",
  "serviceTechnique": "Técnica de servicio sugerida",
  "cutleryRequired": "Material de servicio y cubertería",
  "serviceExplanation": "La historia o concepto detrás del plato para el servicio"
}`;

    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    category: { type: Type.STRING },
                    yieldQuantity: { type: Type.NUMBER },
                    yieldUnit: { type: Type.STRING },
                    ingredients: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                quantity: { type: Type.NUMBER },
                                unit: { type: Type.STRING }
                            },
                            required: ["name", "quantity", "unit"]
                        }
                    },
                    instructions: { type: Type.STRING },
                    notes: { type: Type.STRING },
                    presentation: { type: Type.STRING },
                    servingTemp: { type: Type.STRING },
                    clientDescription: { type: Type.STRING },
                    serviceTime: { type: Type.STRING },
                    serviceTechnique: { type: Type.STRING },
                    cutleryRequired: { type: Type.STRING },
                    serviceExplanation: { type: Type.STRING }
                }
            }
        }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text);
};
