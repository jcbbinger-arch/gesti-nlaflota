import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useCompany } from '../../contexts/CompanyContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/Card';
import { 
    ChefHat, 
    Thermometer, 
    Utensils, 
    Info, 
    CheckCircle2, 
    AlertCircle, 
    ArrowLeft, 
    Printer, 
    Zap, 
    Flame, 
    Layers, 
    FlaskConical, 
    Eye,
    ChevronRight,
    MapPin,
    Clock,
    User
} from 'lucide-react';
import { ALLERGEN_ICONS, ALLERGEN_COLORS } from '../../lib/allergens';
import { printPage } from '../../utils/export';

export const RecipeView: React.FC = () => {
    const { recipeId } = useParams();
    const navigate = useNavigate();
    const { recipes, products, users } = useData();
    const { companyInfo } = useCompany();
    const { currentUser } = useAuth();

    const recipe = useMemo(() => recipes.find(r => r.id === recipeId), [recipes, recipeId]);
    const author = useMemo(() => users.find(u => u.id === recipe?.author_id), [users, recipe]);
    const productsMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);

    if (!recipe) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
                <AlertCircle className="w-12 h-12 text-red-500" />
                <h2 className="text-xl font-bold">Ficha no encontrada</h2>
                <button onClick={() => navigate(-1)} className="text-primary-600 hover:underline">Volver</button>
            </div>
        );
    }

    const detectedAllergens = useMemo(() => {
        const allergens = new Set<string>();
        recipe.ingredients.forEach(ing => {
            const product = productsMap.get(ing.product_id);
            product?.allergens.forEach(a => allergens.add(a));
        });
        recipe.sub_preparations?.forEach(sub => {
            sub.ingredients.forEach(ing => {
                const product = productsMap.get(ing.product_id);
                product?.allergens.forEach(a => allergens.add(a));
            });
        });
        return Array.from(allergens);
    }, [recipe, productsMap]);

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 pb-20 selection:bg-amber-500/30">
            {/* Header / Nav */}
            <div className="no-print bg-slate-950/50 border-b border-slate-800 sticky top-0 z-50 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <button 
                        onClick={() => navigate(-1)}
                        className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors group"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-medium">Volver a Recetas</span>
                    </button>
                    <div className="flex items-center space-x-3">
                        <button 
                            onClick={() => window.print()}
                            className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-all border border-slate-700"
                        >
                            <Printer className="w-4 h-4" />
                            <span className="text-sm font-bold uppercase tracking-wider">Imprimir Ficha</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 print:p-0 print:space-y-4">
                
                {/* Main Hero Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="space-y-4">
                            <div className="flex items-center space-x-3">
                                {recipe.category && (
                                    <span className="bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border border-amber-500/20">
                                        {recipe.category}
                                    </span>
                                )}
                                <span className="bg-slate-800 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full">
                                    REF: {recipe.id.split('-').pop()?.toUpperCase()}
                                </span>
                            </div>
                            <h1 className="text-5xl md:text-6xl font-black italic uppercase tracking-tighter text-white drop-shadow-2xl leading-none">
                                {recipe.name}
                            </h1>
                            <p className="text-slate-400 text-lg leading-relaxed max-w-2xl font-medium">
                                {recipe.description}
                            </p>
                        </div>

                        {/* EXPLICACIÓN SUGERENTE - CRITICAL FOR WAITER */}
                        <div className="bg-amber-500 p-1 rounded-[2rem] shadow-2xl shadow-amber-500/10">
                            <div className="bg-slate-950 rounded-[1.9rem] p-8 space-y-4">
                                <div className="flex items-center space-x-3 text-amber-500">
                                    <Zap className="w-6 h-6 fill-current" />
                                    <h2 className="text-xs font-black uppercase tracking-[0.3em]">Explicación Sugerente al Cliente</h2>
                                </div>
                                <p className="text-2xl md:text-3xl font-bold text-white leading-tight italic">
                                    "{recipe.service_explanation || 'No se ha definido una explicación sugerente para este plato.'}"
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Quick Info Sidebar */}
                    <div className="space-y-6">
                        {recipe.photo && (
                            <div className="aspect-square rounded-[2rem] overflow-hidden border-4 border-slate-800 shadow-2xl">
                                <img src={recipe.photo} alt={recipe.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                        )}
                        
                        <div className="bg-slate-800/50 rounded-[2rem] p-8 border border-slate-700/50 space-y-6">
                            <div className="flex items-center justify-between group">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Rendimiento</p>
                                    <p className="text-xl font-bold text-white">{recipe.yield_amount} {recipe.yield_unit}</p>
                                </div>
                                <ChefHat className="w-10 h-10 text-slate-700 opacity-50" />
                            </div>
                            <div className="h-px bg-slate-700/50" />
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Autor de la Ficha</p>
                                    <p className="text-lg font-bold text-white">{author?.name || 'Sistema'}</p>
                                </div>
                                <User className="w-10 h-10 text-slate-700 opacity-50" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* INFOGRAFÍA DE PARÁMETROS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-3xl p-6 flex items-center space-x-6">
                        <div className="p-4 bg-indigo-500/10 rounded-2xl">
                            <Thermometer className="w-8 h-8 text-indigo-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-indigo-500/70 uppercase tracking-widest mb-1">Temperatura Pase</p>
                            <p className="text-2xl font-black text-indigo-400 uppercase tracking-tight">{recipe.temperature || '65ºC-70ºC'}</p>
                        </div>
                    </div>
                    
                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-3xl p-6 flex items-center space-x-6">
                        <div className="p-4 bg-emerald-500/10 rounded-2xl">
                            <Utensils className="w-8 h-8 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-emerald-500/70 uppercase tracking-widest mb-1">Marcaje / Cubierto</p>
                            <p className="text-xl font-black text-emerald-400 uppercase tracking-tight leading-tight">
                                {recipe.cutlery_required || 'Trinchero + Cuchillo'}
                            </p>
                        </div>
                    </div>

                    <div className="bg-primary-500/5 border border-primary-500/20 rounded-3xl p-6 flex items-center space-x-6">
                        <div className="p-4 bg-primary-500/10 rounded-2xl">
                            <Layers className="w-8 h-8 text-primary-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-primary-500/70 uppercase tracking-widest mb-1">Tipo de Servicio</p>
                            <p className="text-2xl font-black text-primary-400 uppercase tracking-tight">{recipe.service_type || 'Americana'}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* PROTOCOLO DE EMPLATADO Y ACABADO */}
                    <div className="space-y-4">
                        <div className="flex items-center space-x-3 text-slate-400">
                            <Eye className="w-5 h-5 text-amber-500" />
                            <h2 className="text-xs font-black uppercase tracking-[0.2em]">Protocolo de Emplatado y Acabado</h2>
                        </div>
                        <div className="bg-slate-800/30 border border-slate-700/50 rounded-[2.5rem] p-10 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-5">
                                <Zap className="w-48 h-48" />
                            </div>
                            <div className="relative z-10 text-xl text-slate-300 leading-relaxed font-medium italic whitespace-pre-line">
                                {recipe.presentation || 'No se han definido instrucciones de emplatado final.'}
                            </div>
                        </div>
                    </div>

                    {/* CHECKLIST MISE EN PLACE */}
                    <div className="space-y-4">
                        <div className="flex items-center space-x-3 text-slate-400">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            <h2 className="text-xs font-black uppercase tracking-[0.2em]">Checklist de Mise en Place (Repaso)</h2>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            {(recipe.service_checklist || []).length > 0 ? (
                                recipe.service_checklist?.map((item, i) => (
                                    <div key={i} className="flex items-center space-x-4 p-5 bg-slate-800/50 border border-slate-700/50 rounded-2xl group hover:border-emerald-500/30 transition-all">
                                        <div className="w-6 h-6 rounded-lg border-2 border-slate-600 flex items-center justify-center group-hover:border-emerald-500 transition-colors">
                                            <div className="w-3 h-3 bg-emerald-500 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                        <span className="text-lg font-bold text-slate-200">{item}</span>
                                    </div>
                                ))
                            ) : (
                                <div className="p-8 text-center bg-slate-800/20 border border-dashed border-slate-700 rounded-3xl">
                                    <p className="text-slate-500 italic">No hay puntos de comprobación definidos.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ALÉRGENOS CONTROL EXTRA */}
                <div className="space-y-6">
                    <div className="flex items-center space-x-3 text-slate-400">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                        <h2 className="text-xs font-black uppercase tracking-[0.2em]">Control de Alérgenos Críticos</h2>
                    </div>
                    <div className="bg-slate-950 p-10 rounded-[3rem] border border-red-500/10 shadow-2xl shadow-red-500/5">
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 lg:grid-cols-14 gap-4">
                            {detectedAllergens.map(allergen => {
                                const Icon = ALLERGEN_ICONS[allergen] || AlertCircle;
                                const color = ALLERGEN_COLORS[allergen];
                                return (
                                    <div key={allergen} className="flex flex-col items-center space-y-3 p-4 bg-slate-900 border border-slate-800 rounded-3xl hover:border-red-500/30 transition-all group">
                                        <div 
                                            className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"
                                            style={{ backgroundColor: color }}
                                        >
                                            <Icon className="w-6 h-6 text-white" />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-tighter text-slate-400 text-center leading-none">
                                            {allergen}
                                        </span>
                                    </div>
                                );
                            })}
                            {detectedAllergens.length === 0 && (
                                <p className="col-span-full text-center text-slate-500 italic">No se han detectado alérgenos críticos en esta elaboración.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* EXAMEN QUÍMICO / ORGANOLÉPTICO */}
                <div className="space-y-4">
                    <div className="flex items-center space-x-3 text-slate-400">
                        <FlaskConical className="w-5 h-5 text-indigo-400" />
                        <h2 className="text-xs font-black uppercase tracking-[0.2em]">Examen Químico y Organoléptico</h2>
                    </div>
                    <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-[2.5rem] p-10">
                        <div className="flex items-start space-x-6">
                            <Zap className="w-10 h-10 text-indigo-500 mt-1 shrink-0" />
                            <div className="space-y-6">
                                <p className="text-2xl text-slate-300 font-medium leading-relaxed italic">
                                    {recipe.chemical_analysis || 'No se han documentado reacciones químicas o análisis organolépticos específicos para esta preparación.'}
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                                        <p className="text-[10px] font-black text-indigo-500/70 uppercase tracking-widest mb-1">Estructura</p>
                                        <p className="text-lg font-bold text-slate-200">Emulsión Estable</p>
                                    </div>
                                    <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                                        <p className="text-[10px] font-black text-indigo-500/70 uppercase tracking-widest mb-1">Reacciones</p>
                                        <p className="text-lg font-bold text-slate-200">Maillard Intensas</p>
                                    </div>
                                    <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                                        <p className="text-[10px] font-black text-indigo-500/70 uppercase tracking-widest mb-1">pH Estimado</p>
                                        <p className="text-lg font-bold text-slate-200">5.8 - 6.2</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footnote */}
                <div className="pt-12 text-center space-y-4">
                    <div className="flex items-center justify-center space-x-2">
                        <div className="w-12 h-px bg-slate-800" />
                        <ChefHat className="w-6 h-6 text-slate-700" />
                        <div className="w-12 h-px bg-slate-800" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-600">
                        Documentación Técnica de Servicio • {companyInfo.name}
                    </p>
                </div>
            </div>
        </div>
    );
};
