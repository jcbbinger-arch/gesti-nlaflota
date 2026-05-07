import React, { useState } from 'react';
import { X, Copy, Check, ScanText, Sparkles, Terminal, Wand2, Loader2, Save } from 'lucide-react';
import { digitalizeRecipe, generateRecipeIdea, AIDigitalizedRecipe } from '../services/geminiService';

interface AIHubModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (recipe: AIDigitalizedRecipe) => void;
}

export const AIHubModal: React.FC<AIHubModalProps> = ({ isOpen, onClose, onImport }) => {
    const [activeTab, setActiveTab] = useState<'digitalize' | 'architect' | 'prompts'>('digitalize');
    const [isLoading, setIsLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    
    // Digitalize State
    const [inputText, setInputText] = useState('');
    
    // Architect State
    const [vibe, setVibe] = useState('');
    const [keyIngredients, setKeyIngredients] = useState('');
    const [level, setLevel] = useState('Intermedio');
    const [objective, setObjective] = useState('');
    const [restrictions, setRestrictions] = useState('');

    const CUSTOM_PROMPT = `Actúa como un Chef Ejecutivo y experto en digitalización de datos gastronómicos.
Tu tarea es convertir el texto o imagen de una receta que te voy a proporcionar en un objeto JSON compatible con mi sistema de gestión de cocina.

REGLAS DE FORMATO:
1. Devuelve ÚNICAMENTE el código JSON, sin explicaciones ni texto adicional.
2. Esquema exacto:
{
  "name": "Nombre de la receta",
  "category": "Entrantes|Principales|Postres|Bebidas|Salsas|Guarniciones|Otros",
  "yieldQuantity": 4, 
  "yieldUnit": "raciones",
  "elaborations": [
    {
      "name": "Nombre de la elaboración",
      "ingredients": [{"name": "Producto", "quantity": "100", "unit": "g|kg|ml|l|ud"}],
      "instructions": "Pasos detallados..."
    }
  ],
  "notes": "Alérgenos, puntos críticos o consejos",
  "serviceDetails": {
    "presentation": "Cómo emplatar",
    "servingTemp": "Caliente|Frio|Ambiente",
    "cutlery": "",
    "passTime": "15 min",
    "serviceType": "A la Americana",
    "clientDescription": "Descripción sugerente..."
  }
}`;

    const handleCopyPrompt = () => {
        navigator.clipboard.writeText(CUSTOM_PROMPT);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDigitalize = async () => {
        if (!inputText.trim()) return;
        setIsLoading(true);
        try {
            const result = await digitalizeRecipe(inputText);
            onImport(result);
            onClose();
        } catch (error) {
            console.error("AI Error:", error);
            alert("Error al procesar con IA. Inténtalo de nuevo.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateIdea = async () => {
        setIsLoading(true);
        try {
            const result = await generateRecipeIdea({
                vibe,
                ingredients: keyIngredients,
                level,
                objective,
                restrictions
            });
            onImport(result);
            onClose();
        } catch (error) {
            console.error("AI Error:", error);
            alert("Error al generar idea con IA.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700">
                {/* Header */}
                <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center bg-gradient-to-r from-primary-600 to-indigo-600">
                    <div className="flex items-center space-x-3 text-white">
                        <Wand2 className="w-8 h-8" />
                        <div>
                            <h2 className="text-xl font-black italic uppercase tracking-tighter">AI Hub Gastronómico</h2>
                            <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest leading-none">Inteligencia Artificial I+D</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
                    <button 
                        onClick={() => setActiveTab('digitalize')}
                        className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center space-x-2 transition-all ${activeTab === 'digitalize' ? 'bg-white dark:bg-gray-800 text-primary-600 border-b-2 border-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <ScanText className="w-4 h-4" />
                        <span>Digitalizar</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('architect')}
                        className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center space-x-2 transition-all ${activeTab === 'architect' ? 'bg-white dark:bg-gray-800 text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <Sparkles className="w-4 h-4" />
                        <span>Arquitecto</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('prompts')}
                        className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center space-x-2 transition-all ${activeTab === 'prompts' ? 'bg-white dark:bg-gray-800 text-amber-600 border-b-2 border-amber-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <Terminal className="w-4 h-4" />
                        <span>Prompt Hub</span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8">
                    {activeTab === 'digitalize' && (
                        <div className="space-y-6">
                            <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-xl border border-primary-100 dark:border-primary-800">
                                <p className="text-sm font-medium text-primary-800 dark:text-primary-300">
                                    Pega aquí el texto de tu receta, ingredientes desordenados o descripción. Gemini interpretará todo, extraerá cantidades y organizará la ficha técnica por ti.
                                </p>
                            </div>
                            <textarea 
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder="Ej: Para el bizcocho necesitamos 4 huevos, 200g de azúcar... Hornear a 180C durante 45 min..."
                                className="w-full h-64 p-4 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-2xl focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 transition-all resize-none font-mono text-sm"
                            />
                            <button 
                                onClick={handleDigitalize}
                                disabled={isLoading || !inputText.trim()}
                                className="w-full py-4 bg-primary-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-lg shadow-primary-500/30"
                            >
                                {isLoading ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : <ScanText className="w-6 h-6 mr-2" />}
                                Digitalizar Receta
                            </button>
                        </div>
                    )}

                    {activeTab === 'architect' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Estilo / Vibe</label>
                                    <input 
                                        type="text"
                                        value={vibe}
                                        onChange={(e) => setVibe(e.target.value)}
                                        placeholder="Ej: Minimalismo Nórdico, Street Food..."
                                        className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Ingredientes Clave</label>
                                    <input 
                                        type="text"
                                        value={keyIngredients}
                                        onChange={(e) => setKeyIngredients(e.target.value)}
                                        placeholder="Ej: Pulpo, Vainilla, Lima..."
                                        className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Complejidad Técnica</label>
                                    <select 
                                        value={level}
                                        onChange={(e) => setLevel(e.target.value)}
                                        className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl font-bold"
                                    >
                                        <option>Básico</option>
                                        <option>Intermedio</option>
                                        <option>Avanzado</option>
                                        <option>Experimental (Molecular)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Objetivo / Uso</label>
                                    <input 
                                        type="text"
                                        value={objective}
                                        onChange={(e) => setObjective(e.target.value)}
                                        placeholder="Ej: Snack de bienvenida, Postre de gala..."
                                        className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Restricciones / Alergias</label>
                                    <input 
                                        type="text"
                                        value={restrictions}
                                        onChange={(e) => setRestrictions(e.target.value)}
                                        placeholder="Ej: Sin lácteos, Bajo coste..."
                                        className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl font-bold"
                                    />
                                </div>
                                <div className="pt-5">
                                    <button 
                                        onClick={handleGenerateIdea}
                                        disabled={isLoading}
                                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center shadow-lg shadow-indigo-500/30"
                                    >
                                        {isLoading ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : <Sparkles className="w-6 h-6 mr-2" />}
                                        Generar Propuesta I+D
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'prompts' && (
                        <div className="space-y-6">
                            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800">
                                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                                    Si prefieres usar ChatGPT, Claude o tu propia IA externa, utiliza este prompt optimizado para que el resultado sea 100% compatible con este sistema.
                                </p>
                            </div>
                            <div className="relative group">
                                <pre className="p-6 bg-gray-900 text-gray-300 rounded-2xl text-xs font-mono overflow-x-auto whitespace-pre-wrap border border-gray-700">
                                    {CUSTOM_PROMPT}
                                </pre>
                                <button 
                                    onClick={handleCopyPrompt}
                                    className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all flex items-center space-x-2"
                                >
                                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                    <span className="text-[10px] font-bold uppercase tracking-widest">{copied ? 'Copiado' : 'Copiar Prompt'}</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
