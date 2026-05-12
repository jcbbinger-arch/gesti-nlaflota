import React, { useState, useMemo } from 'react';
import { X, Copy, Check, ClipboardPaste, Wand2, Info, Sparkles, Terminal } from 'lucide-react';
import { useCompany } from '../contexts/CompanyContext';
import { useCreator } from '../contexts/CreatorContext';
import { useData } from '../contexts/DataContext';

interface AIHubModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (jsonString: string) => void;
    initialTab?: 'digitalize' | 'molecular' | 'cocktail';
}

export const AIHubModal: React.FC<AIHubModalProps> = ({ isOpen, onClose, onImport, initialTab = 'digitalize' }) => {
    const { companyInfo } = useCompany();
    const { creatorInfo } = useCreator();
    const { workspaceSettings } = useData();
    const [jsonInput, setJsonInput] = useState('');
    const [copied, setCopied] = useState<'master' | 'molecular' | 'cocktail' | null>(null);
    const [activeView, setActiveView] = useState<'digitalize' | 'molecular' | 'cocktail'>(initialTab);

    // Sync activeView with initialTab when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setActiveView(initialTab);
        }
    }, [isOpen, initialTab]);

    const categoriesStr = useMemo(() => {
        return workspaceSettings?.categories?.join('|') || "Entrantes|Ensaladas|Sopas y Cremas|Carnes|Aves|Pescados|Mariscos|Pastas y Arroces|Guarniciones|Salsas|Postres|Panadería/Pastelería|Bebidas|Otros|Sostenible|Fermentados/varios|Decoraciones de platos|Snack|Nuevas Tecnologías|Aperitivos|Bizcochos|Cremas Dulces";
    }, [workspaceSettings]);

    const getMasterPrompt = () => {
        return `Actúa como un Chef Ejecutivo y experto en digitalización de datos gastronómicos para ${companyInfo.name || 'mi establecimiento'}.
Tu tarea es convertir el texto o imagen de una RECETA COMPLETA en un objeto JSON compatible con el sistema ${creatorInfo.app_name}.

REGLAS DE FORMATO:
1. Devuelve ÚNICAMENTE el código JSON.
2. Esquema exacto (Respeta estrictamente los nombres de campos):
{
  "name": "Nombre de la receta",
  "recipe_type": "standard",
  "category": "${categoriesStr}",
  "yieldQuantity": 4, 
  "yieldUnit": "raciones",
  "ingredients": [{"name": "Producto", "quantity": 100, "unit": "g|kg|ml|l|ud"}],
  "instructions": "Pasos detallados de elaboración principal",
  "notes": "Puntos clave y mise en place",
  "presentation": "Técnica de emplatado y protocolo de servicio",
  "servingTemp": "Temperatura de servicio",
  "cutlery": "Marcaje necesario",
  "serviceTime": "Tiempo de servicio",
  "serviceType": "AMERICANA|INGLESA|FRANCESA|GUERIDÓN|BUFFET",
  "clientDescription": "Descripción comercial atractiva",
  "serviceExplanation": "Storytelling del plato para el camarero",
  "serviceChecklist": ["Elemento de control 1", "Punto crítico 2"],
  "chemicalAnalysis": "Análisis nutricional/químico resumido",
  "organolepticAnalysis": "Análisis sensorial (Vista, Olfato, Gusto, Tacto)",
  "sub_preparations": [
    {
      "name": "Nombre de la sub-elaboración (Ej: Salsa X, Masa Y)",
      "ingredients": [{"name": "Producto", "quantity": 50, "unit": "g"}],
      "preparation_steps": "Pasos específicos de esta sub-elaboración"
    }
  ]
}

IMPORTANTE: 
- Si la receta tiene elaboraciones secundarias (salsas, guarniciones complejas, masas), júntalas en el array 'sub_preparations'.
- Si un ingrediente de la lista principal es una sub-elaboración, usa exactamente el mismo nombre en ambos sitios para vincularlos.
- No inventes datos, si no aparecen en la receta, deja el campo vacío o con información coherente.

RECETA A DIGITALIZAR:
[PEGA AQUÍ TU RECETA]`;
    };

    const getCocktailPrompt = () => {
        return `Actúa como un Mixólogo Profesional e I+D de Coctelería para ${companyInfo.name || 'mi establecimiento'}.
Tu tarea es convertir el texto o imagen de una RECETA DE COCTELERÍA en un objeto JSON compatible con el sistema ${creatorInfo.app_name}.

REGLAS DE FORMATO:
1. Devuelve ÚNICAMENTE el código JSON.
2. Esquema exacto (Respeta estrictamente los nombres de campos):
{
  "name": "Nombre del cóctel",
  "recipe_type": "cocktail",
  "cocktail_style": "Clásico|Flair",
  "prep_method": "Batido|Agitado|Directo al Vaso|Otros",
  "cocktail_category": "Aperitivo|Digestivo|Trago Largo|Trago Corto|Espumante|Fantasía",
  "yieldQuantity": 1, 
  "yieldUnit": "copa",
  "ingredients": [{"name": "Ingrediente/Licor", "quantity": 50, "unit": "ml|cl|oz|ud"}],
  "instructions": "Pasos detallados de elaboración",
  "tools": "Coctelera, Jigger, etc.",
  "glassware": "Copa Martini, Vaso Collins, etc.",
  "garnish": "Twist de piel de naranja, etc.",
  "notes": "Puntos clave y servicio",
  "clientDescription": "Descripción comercial sugerente",
  "serviceExplanation": "Storytelling del cóctel para el camarero",
  "organolepticAnalysis": "Aromas, sabores y perfil del cóctel"
}

RECETA A DIGITALIZAR:
[PEGA AQUÍ TU RECETA DE COCTELERÍA]`;
    };

    const getMolecularPrompt = () => {
        return `Actúa como: Un experto internacional en gastronomía molecular y sumiller especializado en química del sabor. Tu conocimiento se basa estrictamente en la base de datos FlavorDB y en el principio de compuestos aromáticos volátiles compartidos.

Tu tarea: Analizar el/los siguiente(s) ingrediente(s): [INGREDIENTES]

Instrucciones de análisis:
1. Lógica Molecular: No te bases en "intuición" culinaria común, sino en perfiles de terpenos, fenoles, ésteres y pirazinas.
2. Si es un solo ingrediente: Genera 3 categorías de maridaje:
   - Clásicos (70-95% afinidad): Ingredientes con perfiles químicos casi idénticos.
   - Atrevidos (40-70% afinidad): Combinaciones inusuales que funcionan por compartir un único compuesto clave potente (ej. trimetilamina en pescado y caramelo).
   - Bebidas: Vinos, destilados o infusiones con afinidad terpénica.
3. Si son varios ingredientes: Analiza su sinergia. Indica el porcentaje de afinidad global y qué moléculas actúan como "puente" entre ellos. Si la afinidad es baja, sugiere un ingrediente adicional que actúe como nexo químico.
4. Recetas: Propón técnicas sugeridas para potenciar los compuestos (ej. Maillard, infusión al vacío).

Devuelve el análisis en este formato JSON EXACTO:
{
  "molecularData": {
    "compounds": ["Compuesto 1", "Compuesto 2"],
    "affinities": ["Ingrediente Afín 1 (% Afinidad)", "Ingrediente Afín 2 (% Afinidad)"],
    "pairingSuggestion": "Sugerencia de maridaje científico y bebidas",
    "vanguardTechnique": "Técnica sugerida",
    "scientificJustification": "Explicación técnica citando moléculas clave"
  }
}

INGREDIENTES PARA ANALIZAR:
[PEGA AQUÍ TUS INGREDIENTES]`;
    };

    const handleCopy = (type: 'master' | 'molecular' | 'cocktail') => {
        const prompt = type === 'master' ? getMasterPrompt() : type === 'cocktail' ? getCocktailPrompt() : getMolecularPrompt();
        navigator.clipboard.writeText(prompt);
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
    };

    const handleImport = () => {
        if (!jsonInput.trim()) return;
        onImport(jsonInput);
        setJsonInput('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 md:p-8 bg-gray-900/90 backdrop-blur-md">
            <div className="bg-[#f8fafd] dark:bg-gray-900 w-full max-w-6xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-white dark:border-gray-800">
                {/* Header Estilo "Puente" */}
                <div className="p-8 border-b dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900">
                    <div className="flex items-center space-x-4">
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                            <X className="w-6 h-6 text-gray-400" />
                        </button>
                        <div className="flex items-center space-x-3">
                            <div className="bg-emerald-500 p-2 rounded-xl shadow-lg shadow-emerald-500/20">
                                <Wand2 className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-gray-800 dark:text-white tracking-tighter uppercase">Puente de Digitalización IA</h2>
                                <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest leading-none">Digitalización inteligente libre de errores de citación.</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                        <button 
                            onClick={() => setActiveView('digitalize')}
                            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeView === 'digitalize' ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Cocina
                        </button>
                        <button 
                            onClick={() => setActiveView('cocktail')}
                            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeView === 'cocktail' ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Cóctel
                        </button>
                        <button 
                            onClick={() => setActiveView('molecular')}
                            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeView === 'molecular' ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Molecular
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-8 p-8">
                    {/* PASO 1: COPIA */}
                    <div className="flex-1 bg-[#121421] rounded-[2rem] p-10 flex flex-col justify-between border border-white/5 shadow-inner">
                        <div className="space-y-8">
                            <div className="inline-flex items-center space-x-2 bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span>Paso 1</span>
                            </div>
                            
                            <div>
                                <h3 className="text-4xl font-black text-white leading-tight mb-2">COPIA EL<br/><span className="text-emerald-400">PROMPT MAESTRO</span></h3>
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mt-6">
                                    <div className="flex items-center space-x-3 text-emerald-400 mb-3">
                                        <Sparkles className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">IA Especializada</span>
                                    </div>
                                    <p className="text-xs text-gray-400 leading-relaxed font-medium">
                                        {activeView === 'digitalize' 
                                            ? 'Optimizado para extraer gramajes, pasos y storytelling comercial de cualquier imagen o texto de cocina.'
                                            : activeView === 'cocktail'
                                            ? 'Especializado en mixología: técnicas de agitado, cristalería, herramientas y familias de cócteles.'
                                            : 'Basado en FlavorDB y perfiles de terpenos para maridajes científicos de vanguardia.'
                                        }
                                    </p>
                                </div>
                            </div>

                            <p className="text-sm text-gray-500 font-medium">
                                Hemos optimizado el prompt para que la IA estructure los datos exactamente como tu sistema los necesita.
                            </p>
                        </div>

                        <button 
                            onClick={() => handleCopy(activeView === 'digitalize' ? 'master' : activeView === 'cocktail' ? 'cocktail' : 'molecular')}
                            className="w-full bg-white text-[#121421] py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-50 transition-all flex items-center justify-center space-x-3 shadow-xl active:scale-[0.98]"
                        >
                            {copied === activeView ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
                            <span>{copied === activeView ? 'PROMPT COPIADO' : `COPIAR PROMPT ${activeView === 'digitalize' ? 'COCINA' : activeView === 'cocktail' ? 'CÓCTEL' : 'MOLECULAR'}`}</span>
                        </button>
                    </div>

                    {/* PASO 2: IMPORTA */}
                    <div className="flex-1 bg-white dark:bg-gray-800 rounded-[2rem] p-10 flex flex-col border border-gray-100 dark:border-gray-700 shadow-xl">
                        <div className="space-y-8 flex-1 flex flex-col">
                            <div className="inline-flex items-center space-x-2 bg-gray-900 text-white dark:bg-gray-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest self-start">
                                <span>Paso 2</span>
                            </div>

                            <div>
                                <h3 className="text-4xl font-black text-gray-900 dark:text-white leading-tight mb-2">IMPORTA EL<br/><span className="text-emerald-500">RESULTADO</span></h3>
                                <p className="text-sm text-gray-500 font-medium mt-4">
                                    Pega el código JSON de la IA. El sistema limpiará automáticamente etiquetas inválidas como [cite] o [cite_start].
                                </p>
                            </div>

                            <div className="flex-1 relative mt-6">
                                <textarea 
                                    value={jsonInput}
                                    onChange={(e) => setJsonInput(e.target.value)}
                                    placeholder="Pega el código JSON aquí..."
                                    className="w-full h-full min-h-[300px] p-6 bg-gray-50 dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-[2rem] focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all resize-none font-mono text-xs text-gray-600 dark:text-gray-300"
                                />
                                {jsonInput && (
                                    <button 
                                        onClick={() => setJsonInput('')}
                                        className="absolute top-4 right-4 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:text-red-500 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            <button 
                                onClick={handleImport}
                                disabled={!jsonInput.trim()}
                                className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center space-x-3 shadow-lg disabled:opacity-50 disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400 ${jsonInput.trim() ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/20' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                            >
                                <ClipboardPaste className="w-5 h-5" />
                                <span>{activeView === 'digitalize' ? 'SINCRONIZAR FICHA TÉCNICA' : 'ACTUALIZAR ANÁLISIS MOLECULAR'}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="px-8 py-4 bg-gray-50 dark:bg-gray-800/50 border-t dark:border-gray-800 flex items-center justify-center space-x-4">
                    <Info className="w-4 h-4 text-gray-400" />
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">Compatible con GPT-4, Claude 3.5 Sonnet, Gemini 1.5 Pro y DeepSeek</span>
                </div>
            </div>
        </div>
    );
};
