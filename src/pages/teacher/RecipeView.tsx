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
    Edit3,
    ChevronRight,
    MapPin,
    Clock,
    User,
    Sparkles,
    Dna,
    Wine,
    Martini,
    GlassWater
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

    const [showPrintModal, setShowPrintModal] = React.useState(false);
    const [currentPax, setCurrentPax] = React.useState(1);
    const [printOptions, setPrintOptions] = React.useState({
        technical: true,
        checklist: true,
        service: true,
        chemical: true
    });

    React.useEffect(() => {
        if (recipe?.yield_amount) {
            setCurrentPax(recipe.yield_amount);
        }
    }, [recipe?.yield_amount]);

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

    const handlePrint = () => {
        window.print();
        setShowPrintModal(false);
    };

    const paxMultiplier = useMemo(() => {
        return currentPax / (recipe.yield_amount || 1);
    }, [currentPax, recipe.yield_amount]);

    const formatQuantity = (q: number) => {
        const val = q * paxMultiplier;
        if (val === 0) return '0';
        return val % 1 === 0 ? val.toString() : val.toFixed(2);
    };

    return (
        <div className={`min-h-screen ${showPrintModal ? '' : 'bg-slate-900'} text-slate-100 pb-20 selection:bg-amber-500/30 print:bg-white print:text-black print:pb-0`}>
            {/* Header / Nav */}
            <div className="no-print bg-slate-950/50 border-b border-slate-800 sticky top-0 z-50 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <button 
                        onClick={() => navigate('/teacher/recipes')}
                        className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors group"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-medium uppercase tracking-widest font-black">Mis Fichas</span>
                    </button>
                    <div className="flex items-center space-x-3">
                        <button 
                            onClick={() => navigate(`/teacher/recipes/edit/${recipeId}`)}
                            className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl flex items-center space-x-2 shadow-lg transition-all font-black uppercase tracking-widest text-[10px]"
                        >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Editar Ficha</span>
                        </button>
                        <button 
                            onClick={() => setShowPrintModal(true)}
                            className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl flex items-center space-x-2 shadow-lg shadow-primary-500/20 transition-all font-black uppercase tracking-widest text-[10px]"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Imprimir</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* PRINT OPTIONS MODAL */}
            {showPrintModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm no-print">
                    <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-white/10">
                        <div className="flex justify-between items-center mb-6">
                            <div className="space-y-1">
                                <h3 className="text-xl font-black uppercase tracking-tighter text-gray-900 dark:text-white">Preparar Impresión</h3>
                                <p className="text-xs text-gray-500">Selecciona qué secciones deseas incluir en el PDF.</p>
                            </div>
                            <button onClick={() => setShowPrintModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                                <AlertCircle className="w-5 h-5 rotate-45" />
                            </button>
                        </div>
                        
                        <div className="space-y-3 mb-8">
                            {[
                                { id: 'technical', label: '1. Ficha Técnica (Ingredientes + Elaboraciones)', icon: ChefHat },
                                { id: 'checklist', label: '2. Checklist de Elaboraciones', icon: CheckCircle2 },
                                { id: 'service', label: '3. Datos de Servicio (Ficha de Sala)', icon: Utensils },
                                { id: 'chemical', label: '4. Examen Químico y Organoléptico', icon: FlaskConical }
                            ].map(opt => (
                                <button 
                                    key={opt.id}
                                    onClick={() => setPrintOptions(prev => ({ ...prev, [opt.id]: !prev[opt.id as keyof typeof prev] }))}
                                    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${printOptions[opt.id as keyof typeof printOptions] ? 'bg-primary-50 border-primary-200 ring-2 ring-primary-500/20' : 'bg-gray-50 border-gray-100 opacity-60'}`}
                                >
                                    <div className="flex items-center space-x-3">
                                        <div className={`p-2 rounded-lg ${printOptions[opt.id as keyof typeof printOptions] ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                            <opt.icon className="w-4 h-4" />
                                        </div>
                                        <span className={`text-sm font-bold ${printOptions[opt.id as keyof typeof printOptions] ? 'text-primary-900' : 'text-gray-500'}`}>{opt.label}</span>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${printOptions[opt.id as keyof typeof printOptions] ? 'bg-primary-500 border-primary-500' : 'border-gray-200'}`}>
                                        {printOptions[opt.id as keyof typeof printOptions] && <CheckCircle2 className="w-4 h-4 text-white" />}
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div className="flex space-x-3">
                            <button 
                                onClick={() => setShowPrintModal(false)}
                                className="flex-1 px-6 py-4 rounded-2xl bg-gray-100 text-xs font-black uppercase tracking-widest text-gray-500 hover:bg-gray-200 transition-all"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handlePrint}
                                className="flex-1 px-6 py-4 rounded-2xl bg-primary-600 text-xs font-black uppercase tracking-widest text-white hover:bg-primary-700 shadow-lg shadow-primary-500/20 transition-all"
                            >
                                Generar PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-5xl mx-auto px-4 py-8 space-y-12 print:p-0 print:space-y-0 print:max-w-none">
                
                {/* 1. FICHA TÉCNICA (TECHNICAL SHEET) */}
                {printOptions.technical && (
                    <section className="space-y-8 print:p-8">
                        <div className="flex justify-between items-start">
                            <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                    <ChefHat className="w-6 h-6 text-primary-500 print:text-black" />
                                    <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white print:text-black">
                                        {recipe.name}
                                        {recipe.recipe_type === 'cocktail' && (
                                            <span className="ml-4 no-print inline-flex items-center px-3 py-1 rounded-full bg-amber-500 text-[10px] font-black uppercase tracking-widest text-[#121421] align-middle">
                                                <Wine className="w-3 h-3 mr-1" /> Cóctel
                                            </span>
                                        )}
                                    </h1>
                                </div>
                                <p className="text-slate-400 print:text-gray-600 text-sm">{recipe.description}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black uppercase tracking-widest text-primary-500 print:text-black">{companyInfo.name}</p>
                                <p className="text-xs font-bold text-slate-500 print:text-gray-400">FICHA TÉCNICA DE PRODUCCIÓN</p>
                            </div>
                        </div>

                        {recipe.recipe_type === 'cocktail' && (
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-6 grid grid-cols-2 lg:grid-cols-4 gap-4 no-print">
                                <div className="text-center">
                                    <p className="text-[8px] font-black uppercase text-amber-500/70 mb-1">Estilo</p>
                                    <span className="text-xs font-black text-white uppercase tracking-widest">{recipe.cocktail_style || '-'}</span>
                                </div>
                                <div className="text-center">
                                    <p className="text-[8px] font-black uppercase text-amber-500/70 mb-1">Método</p>
                                    <span className="text-xs font-black text-white uppercase tracking-widest">{recipe.prep_method || '-'}</span>
                                </div>
                                <div className="text-center">
                                    <p className="text-[8px] font-black uppercase text-amber-500/70 mb-1">Categoría Cóctel</p>
                                    <span className="text-xs font-black text-white uppercase tracking-widest">{recipe.cocktail_category || '-'}</span>
                                </div>
                                <div className="text-center">
                                    <p className="text-[8px] font-black uppercase text-amber-500/70 mb-1">Producción</p>
                                    <span className="text-xs font-black text-white uppercase tracking-widest">{recipe.yield_amount} {recipe.yield_unit}</span>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                            <div className="space-y-6">
                                <div className="bg-slate-800/50 print:bg-gray-50 rounded-3xl p-6 border border-slate-700/50 print:border-gray-200">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Ingredientes Principales</h3>
                                    <div className="space-y-2">
                                        {recipe.ingredients.map((ing, i) => {
                                            const p = productsMap.get(ing.product_id);
                                            const isSubPrep = recipe.sub_preparations?.some(sub => sub.name.toLowerCase() === ing.product_id.toLowerCase());
                                            const isUnidentified = !p && !isSubPrep;
                                            
                                            return (
                                                <div key={i} className="flex items-center justify-between py-1 border-b border-slate-700/30 print:border-gray-200">
                                                    <span className={`text-xs font-bold ${isUnidentified ? 'text-red-500 print:text-black print:font-black' : isSubPrep ? 'text-amber-500 print:text-black print:italic' : 'text-slate-200 print:text-black'}`}>
                                                        {p?.name || ing.product_id}
                                                    </span>
                                                    <span className="text-xs font-mono text-slate-400 print:text-gray-600">{formatQuantity(ing.quantity)} {ing.unit}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Procedimiento Principal</h3>
                                    <div className="bg-slate-800/30 print:bg-white print:border print:border-gray-200 rounded-3xl p-6 text-sm leading-relaxed whitespace-pre-line text-slate-300 print:text-black">
                                        {recipe.preparation_steps}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-6">
                                {recipe.photo && (
                                    <div className="aspect-[4/3] rounded-3xl overflow-hidden border-2 border-slate-700 print:border-gray-200 bg-slate-800">
                                        <img src={recipe.photo} alt={recipe.name} className="w-full h-full object-cover print:opacity-80" referrerPolicy="no-referrer" />
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-800/50 print:bg-gray-50 rounded-2xl border border-slate-700 print:border-gray-200">
                                        <p className="text-[8px] font-black uppercase text-slate-500 mb-1">Rendimiento Actual (PAX)</p>
                                        <div className="flex items-center space-x-3">
                                            <input 
                                                type="number" 
                                                value={currentPax}
                                                onChange={(e) => setCurrentPax(parseFloat(e.target.value) || 1)}
                                                className="w-16 bg-slate-700/50 print:hidden text-white font-black rounded-lg p-1 text-center border-none ring-1 ring-white/10"
                                            />
                                            <p className="text-sm font-bold text-white print:text-black">{currentPax} {recipe.yield_unit}</p>
                                        </div>
                                        <p className="text-[7px] text-slate-500 mt-1 no-print">Original: {recipe.yield_amount} {recipe.yield_unit}</p>
                                    </div>
                                    <div className="p-4 bg-slate-800/50 print:bg-gray-50 rounded-2xl border border-slate-700 print:border-gray-200">
                                        <p className="text-[8px] font-black uppercase text-slate-500 mb-1">Categoría</p>
                                        <p className="text-sm font-bold text-white print:text-black">{recipe.category || 'Standard'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SUB-ELABORACIONES */}
                        {recipe.recipe_type === 'cocktail' && (
                            <div className="bg-slate-800/20 border border-slate-700/50 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="space-y-3">
                                    <div className="flex items-center space-x-2 text-amber-500">
                                        <Martini className="w-4 h-4" />
                                        <h4 className="text-[10px] font-black uppercase tracking-widest">Herramientas</h4>
                                    </div>
                                    <p className="text-sm font-bold text-slate-300 whitespace-pre-line">{recipe.tools || 'No documentado'}</p>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center space-x-2 text-amber-500">
                                        <GlassWater className="w-4 h-4" />
                                        <h4 className="text-[10px] font-black uppercase tracking-widest">Cristalería</h4>
                                    </div>
                                    <p className="text-sm font-bold text-slate-300 whitespace-pre-line">{recipe.glassware || 'No documentado'}</p>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center space-x-2 text-emerald-500">
                                        <Sparkles className="w-4 h-4" />
                                        <h4 className="text-[10px] font-black uppercase tracking-widest">Garnish / Decoración</h4>
                                    </div>
                                    <p className="text-sm font-bold text-slate-300 whitespace-pre-line">{recipe.garnish || 'No documentado'}</p>
                                </div>
                            </div>
                        )}

                        {/* SUB-ELABORACIONES */}
                        {(recipe.sub_preparations || []).length > 0 && (
                            <div className="space-y-8 pt-8">
                                <h2 className="text-xl font-black uppercase tracking-[0.2em] text-primary-500 print:text-black text-center">Sub-Elaboraciones</h2>
                                {recipe.sub_preparations?.map((sub, i) => (
                                    <div key={sub.id} className="bg-slate-800/20 print:bg-white print:border print:border-gray-100 rounded-[2.5rem] p-8 border border-slate-700 space-y-6 break-inside-avoid">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center text-primary-500 font-black text-xs">
                                                    {i + 2}
                                                </div>
                                                <h3 className="text-lg font-black uppercase tracking-widest text-white print:text-black">{sub.name}</h3>
                                            </div>
                                            {sub.photo && (
                                                <div className="w-20 h-20 rounded-xl overflow-hidden border border-white/10 no-print">
                                                    <img src={sub.photo} alt={sub.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-3">
                                                <p className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Ingredientes</p>
                                                <div className="grid grid-cols-1 gap-1">
                                                    {sub.ingredients.map((ing, idx) => {
                                                        const p = productsMap.get(ing.product_id);
                                                        const isSubPrep = recipe.sub_preparations?.some(s => s.name.toLowerCase() === ing.product_id.toLowerCase());
                                                        const isUnidentified = !p && !isSubPrep;

                                                        return (
                                                            <div key={idx} className="flex justify-between text-xs py-1 border-b border-slate-700/50 print:border-gray-100">
                                                                <span className={`font-bold ${isUnidentified ? 'text-red-500 print:text-black print:font-black' : isSubPrep ? 'text-amber-500 print:text-black print:italic' : 'text-slate-300 print:text-black'}`}>
                                                                    {p?.name || ing.product_id}
                                                                </span>
                                                                <span className="font-mono text-slate-500">{formatQuantity(ing.quantity)} {ing.unit}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            <div className="space-y-3 print:space-y-1">
                                                <p className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Procedimiento</p>
                                                <div className="text-xs text-slate-400 print:text-black italic leading-relaxed whitespace-pre-line">
                                                    {sub.preparation_steps}
                                                </div>
                                                {sub.photo && (
                                                    <div className="hidden print:block h-32 w-48 mt-2 rounded-xl overflow-hidden border border-gray-200">
                                                        <img src={sub.photo} alt={sub.name} className="w-full h-full object-cover opacity-80" referrerPolicy="no-referrer" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}

                {/* 2. CHECKLIST DE ELABORACIONES (FINAL LIST) */}
                {printOptions.checklist && (
                    <section className="print:page-break-before-always print:p-12 space-y-8 py-12 border-y border-slate-800/10 print:border-none">
                        <div className="text-center space-y-2">
                            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                            <h2 className="text-3xl font-black uppercase italic text-white print:text-black tracking-tighter">Checklist de Mise en Place</h2>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.3em]">Comprobaciones críticas antes del servicio</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                            {/* Elaboraciones Checklist */}
                            <div className="bg-slate-800/50 print:bg-white print:border-[3px] print:border-black rounded-3xl p-8 space-y-6">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 print:text-black pb-4 border-b border-white/5 print:border-black/10">Control de Elaboraciones y Puntos Críticos</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-6 h-6 rounded-lg border-2 border-slate-600 print:border-black flex items-center justify-center shrink-0" />
                                        <span className="text-sm font-bold text-white print:text-black uppercase">Principal: {recipe.name}</span>
                                    </div>
                                    {recipe.sub_preparations?.map(sub => (
                                        <div key={sub.id} className="flex items-center space-x-4">
                                            <div className="w-6 h-6 rounded-lg border-2 border-slate-600 print:border-black flex items-center justify-center shrink-0" />
                                            <span className="text-sm font-bold text-white print:text-black uppercase">Sub: {sub.name}</span>
                                        </div>
                                    ))}
                                    {/* MÁS PUNTOS DEL CHECKLIST */}
                                    {recipe.service_checklist?.map((item, idx) => (
                                        <div key={idx} className="flex items-center space-x-4">
                                            <div className="w-6 h-6 rounded-lg border-2 border-slate-600 print:border-black flex items-center justify-center shrink-0" />
                                            <span className="text-sm font-bold text-white print:text-black uppercase">{item}</span>
                                        </div>
                                    ))}
                                    
                                    {/* Presentación final en el checklist */}
                                    <div className="flex items-center space-x-4 pt-4 border-t border-slate-700 print:border-black/20">
                                        <div className="w-6 h-6 rounded-lg border-2 border-slate-600 print:border-black flex items-center justify-center shrink-0" />
                                        <div className="space-y-1">
                                            <span className="text-xs font-black text-amber-500 print:text-amber-600 uppercase tracking-widest">Protocolo de Presentación</span>
                                            <p className="text-sm font-bold text-white print:text-black leading-tight uppercase">{recipe.presentation || 'Limpieza y temperatura óptima'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Mise en Place Settings Checklist */}
                            <div className="bg-slate-800/30 print:bg-gray-50 rounded-3xl p-8 space-y-6">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 print:text-black pb-4 border-b border-white/5">Parámetros de Sala</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between text-xs font-bold text-slate-400 print:text-gray-600 uppercase border-b border-white/5 py-2">
                                        <span>Temperatura de Vajilla</span>
                                        <span className="text-[10px]">{recipe.temperature || 'PENDIENTE'}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs font-bold text-slate-400 print:text-gray-600 uppercase border-b border-white/5 py-2">
                                        <span>Marcaje de Cubierto</span>
                                        <span className="text-[10px] truncate max-w-[150px]">{recipe.cutlery_required || 'BÁSICO'}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs font-bold text-slate-400 print:text-gray-600 uppercase border-b border-white/5 py-2">
                                        <span>Protocolo Servicio</span>
                                        <span className="text-[10px] uppercase">{recipe.service_type || 'STANDARD'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* PLATING INSTRUCTIONS (FOR RE-INFORCEMENT) */}
                        <div className="max-w-4xl mx-auto bg-amber-500/5 print:bg-white print:border print:border-dashed print:border-amber-500 rounded-[2rem] p-10 mt-8">
                            <div className="flex items-center space-x-3 mb-4 text-amber-500 print:text-amber-600">
                                <Eye className="w-5 h-5 font-black" />
                                <h3 className="text-[10px] font-black uppercase tracking-widest italic">Protocolo Visual de Emplatado</h3>
                            </div>
                            <p className="text-lg italic font-medium leading-relaxed text-slate-300 print:text-black">
                                {recipe.presentation || 'Asegurar limpieza de bordes y temperatura de servicio óptima.'}
                            </p>
                        </div>
                    </section>
                )}

                {/* ANÁLISIS SENSORIAL Y QUÍMICO */}
                {(recipe.organoleptic_analysis || recipe.chemical_analysis) && (
                    <section className="print:page-break-before-always p-12 space-y-12 max-w-6xl mx-auto">
                        <div className="text-center space-y-2">
                            <Sparkles className="w-12 h-12 text-blue-500 mx-auto" />
                            <h2 className="text-3xl font-black uppercase italic text-white print:text-black tracking-tighter">Análisis de Producto</h2>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.3em]">Perfil organoléptico y composición avanzada</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {recipe.organoleptic_analysis && (
                                <div className="bg-slate-800/50 print:bg-white print:border-[3px] print:border-black rounded-3xl p-8 space-y-4">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 print:text-black pb-4 border-b border-white/5 print:border-black/10 flex items-center">
                                        <Eye className="w-4 h-4 mr-2" />
                                        Análisis Organoléptico (Sensorial)
                                    </h3>
                                    <p className="text-sm leading-relaxed text-slate-300 print:text-black whitespace-pre-wrap">
                                        {recipe.organoleptic_analysis}
                                    </p>
                                </div>
                            )}
                            {recipe.chemical_analysis && (
                                <div className="bg-slate-800/50 print:bg-white print:border-[3px] print:border-black rounded-3xl p-8 space-y-4">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 print:text-black pb-4 border-b border-white/5 print:border-black/10 flex items-center">
                                        <Dna className="w-4 h-4 mr-2" />
                                        Análisis Químico / Nutricional
                                    </h3>
                                    <div className="text-[11px] leading-relaxed text-slate-300 print:text-black whitespace-pre-wrap font-mono bg-black/20 print:bg-gray-50 p-6 rounded-2xl border border-white/5 print:border-gray-200">
                                        {recipe.chemical_analysis}
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {/* 3. FICHA DE SERVICIO (SERVICE SHEET) - PAGE BREAK ALWAYS */}
                {printOptions.service && (
                    <section className="print:page-break-before-always space-y-8 py-12">
                        <div className="bg-slate-950 print:bg-white print:border-[5px] print:border-black rounded-[3.5rem] overflow-hidden shadow-2xl relative">
                            <div className="bg-slate-900 print:bg-black p-10 flex justify-between items-center text-white">
                                <div className="space-y-2">
                                    <div className="flex items-center space-x-3">
                                        <Utensils className="w-8 h-8 text-amber-500" />
                                        <h2 className="text-4xl font-black italic uppercase tracking-tighter">FICHA DE SERVICIO (SALA)</h2>
                                    </div>
                                    <p className="text-slate-400 text-sm font-bold uppercase tracking-[0.4em]">Protocolos de Pase, Servicio y Atención al Cliente</p>
                                </div>
                                <div className="text-right">
                                    <h3 className="text-2xl font-black italic">{recipe.name}</h3>
                                    <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">{companyInfo.name}</p>
                                </div>
                            </div>

                            <div className="p-10 space-y-12">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                    {/* EXPLICACIÓN SUGERENTE */}
                                    <div className="space-y-6">
                                        <div className="flex items-center space-x-2 text-amber-500">
                                            <Info className="w-5 h-5 fill-current" />
                                            <h4 className="text-[10px] font-black uppercase tracking-widest italic">Explicación Sugerente del Plato para el Cliente</h4>
                                        </div>
                                        <div className="bg-slate-900 print:bg-gray-50 p-10 rounded-[2.5rem] border border-white/5 print:border-gray-200">
                                            <p className="text-3xl font-serif font-bold italic text-white print:text-black leading-tight">
                                                "{recipe.service_explanation || 'No se ha definido una explicación sugerente para este plato.'}"
                                            </p>
                                        </div>
                                    </div>

                                    {/* PARÁMETROS TÉCNICOS */}
                                    <div className="space-y-8">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Parámetros de Pase</h4>
                                        <div className="grid grid-cols-1 gap-4">
                                            <div className="bg-indigo-500/10 print:bg-gray-50 p-6 rounded-2xl flex items-center space-x-4 border border-indigo-500/20">
                                                <Thermometer className="w-8 h-8 text-indigo-400 print:text-black" />
                                                <div>
                                                    <p className="text-[10px] font-black uppercase text-indigo-500/70 mb-1">Temperatura Pase</p>
                                                    <p className="text-2xl font-black text-white print:text-black">{recipe.temperature || '65ºC-70ºC'}</p>
                                                </div>
                                            </div>
                                            <div className="bg-emerald-500/10 print:bg-gray-50 p-6 rounded-2xl flex items-center space-x-4 border border-emerald-500/20">
                                                <Utensils className="w-8 h-8 text-emerald-400 print:text-black" />
                                                <div>
                                                    <p className="text-[10px] font-black uppercase text-emerald-500/70 mb-1">Cubertería Requerida</p>
                                                    <p className="text-xl font-black text-white print:text-black uppercase leading-tight">{recipe.cutlery_required || 'TRINCHERO + CUCHILLO'}</p>
                                                </div>
                                            </div>
                                            <div className="bg-primary-500/10 print:bg-gray-50 p-6 rounded-2xl flex items-center space-x-4 border border-primary-500/20">
                                                <Zap className="w-8 h-8 text-primary-400 print:text-black" />
                                                <div>
                                                    <p className="text-[10px] font-black uppercase text-primary-500/70 mb-1">Metodología / Protocolo</p>
                                                    <p className="text-2xl font-black text-white print:text-black uppercase">{recipe.service_type || 'AMERICANA'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* 4. EXAMEN QUÍMICO Y ORGANOLÉPTICO - PAGE BREAK ALWAYS */}
                {printOptions.chemical && (
                    <section className="print:page-break-before-always py-12 space-y-8">
                        <div className="mb-8">
                            <div className="flex items-center space-x-3 mb-2">
                                <FlaskConical className="w-8 h-8 text-indigo-400" />
                                <h2 className="text-4xl font-black italic uppercase italic tracking-tighter text-white print:text-black">Examen Químico y Organoléptico</h2>
                            </div>
                            <p className="text-slate-500 text-xs font-black uppercase tracking-[0.5em]">{recipe.name} • Perfil Cromático y Reactivo</p>
                        </div>

                        <div className="bg-slate-800/30 print:bg-white print:border-[2px] print:border-black rounded-[3rem] p-12 space-y-12">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                                <div className="lg:col-span-2 space-y-8">
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Análisis Estructural y Reacciones</h4>
                                        <p className="text-2xl italic font-medium leading-relaxed text-slate-300 print:text-black">
                                            {recipe.chemical_analysis || 'No documentado.'}
                                        </p>
                                    </div>
                                    
                                    <div className="grid grid-cols-3 gap-6">
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black uppercase text-slate-500 text-center">Aroma</p>
                                            <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                                                <div className="h-full bg-indigo-500 w-[80%]" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black uppercase text-slate-500 text-center">Umami</p>
                                            <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                                                <div className="h-full bg-emerald-500 w-[65%]" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black uppercase text-slate-500 text-center">Acidez</p>
                                            <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                                                <div className="h-full bg-primary-500 w-[40%]" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="bg-slate-900 print:bg-gray-50 p-8 rounded-3xl border border-white/5">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Parámetros Moleculares</h4>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center text-xs font-bold text-slate-300 print:text-black">
                                                <span className="uppercase opacity-50">Viscosidad</span>
                                                <span>MEDIA</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs font-bold text-slate-300 print:text-black">
                                                <span className="uppercase opacity-50">Punto Fuego</span>
                                                <span>65ºC</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs font-bold text-slate-300 print:text-black">
                                                <span className="uppercase opacity-50">Emulsificación</span>
                                                <span>ESTABLE</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-amber-500 p-8 rounded-3xl text-slate-900 flex flex-col items-center justify-center space-y-2">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Ref. Alérgenos</p>
                                        <span className="text-xl font-black uppercase">{detectedAllergens.length} Criticos</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* GLOBAL FOOTER FOR ALL PAGES ON PRINT */}
                <footer className="pt-20 text-center space-y-4 print:pt-4 print:border-t-2 print:border-black/5">
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-600">
                        {companyInfo.name} • DOCUMENTACIÓN TÉCNICA GASTRONÓMICA • {new Date().getFullYear()}
                    </p>
                    <p className="text-[8px] text-slate-700 uppercase tracking-tighter opacity-50 font-bold">
                        Sistema Manager Pro • Versión 1.1.3 • {currentUser?.email}
                    </p>
                </footer>
            </div>
        </div>
    );
};
