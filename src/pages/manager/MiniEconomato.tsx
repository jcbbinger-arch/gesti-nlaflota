import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../../components/Card';
import { Modal } from '../../components/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { Product, User, Profile, Order, StockItem, OrderItem } from '../../types';
import { Download, Plus, Pencil, Scan, Search, AlertCircle, ShoppingCart, X } from 'lucide-react';
import { printPage } from '../../utils/export';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

const ScannerModal: React.FC<{ onClose: () => void; onScan: (code: string) => void }> = ({ onClose, onScan }) => {
    const [isScanning, setIsScanning] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsScanning(false);
            // Simulate a successful scan after 2 seconds
            // In a real app, this would be the output of a QR/Barcode reader
            onScan('SIMULATED_CODE');
        }, 2500);
        return () => clearTimeout(timer);
    }, [onScan]);

    return (
        <Modal isOpen={true} onClose={onClose} title="Escáner de Código de Barras">
            <div className="relative bg-black rounded-lg aspect-square overflow-hidden flex flex-center items-center justify-center">
                {/* Simulated Camera View */}
                <div className="absolute inset-0 bg-gray-900 flex items-center justify-center text-gray-500">
                    <Scan className="w-24 h-24 opacity-20" />
                    <p className="absolute bottom-4 text-xs">Simulando cámara...</p>
                </div>

                {/* Scan Area Overlay */}
                <div className="absolute inset-12 border-2 border-primary-500 rounded-lg opacity-50"></div>

                {/* Scan Line Animation */}
                {isScanning && (
                    <motion.div 
                        initial={{ top: '15%' }}
                        animate={{ top: '85%' }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        className="absolute left-10 right-10 h-0.5 bg-primary-400 shadow-[0_0_15px_rgba(59,130,246,0.8)] z-10"
                    />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none"></div>
            </div>
            <div className="mt-4 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Enfoca el código de barras del producto dentro del recuadro.
                </p>
                <button onClick={onClose} className="mt-4 w-full py-2 bg-gray-100 dark:bg-gray-700 rounded-md text-sm font-medium">
                    Cancelar
                </button>
            </div>
        </Modal>
    );
};

const AssignExpenseModal: React.FC<{product: Product; onClose: () => void; onAssign: (teacherId: string, quantity: number) => void; teachers: User[]}> = ({ product, onClose, onAssign, teachers }) => {
    const [teacherId, setTeacherId] = useState('');
    const [quantity, setQuantity] = useState(1);
    const { mini_economato_stock } = useData();
    const maxQuantity = mini_economato_stock.find((s: StockItem) => s.id === product.id)?.stock || 0;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAssign(teacherId, quantity);
    };
    
    return (
        <Modal isOpen={true} onClose={onClose} title={`Asignar ${product.name}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label>Profesor</label>
                    <select value={teacherId} onChange={e => setTeacherId(e.target.value)} required className="w-full mt-1 p-2 border rounded dark:bg-gray-700">
                        <option value="">Selecciona un profesor...</option>
                        {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
                <div>
                    <label>Cantidad (Máx: {maxQuantity})</label>
                    <input type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} min="0.01" step="0.01" max={maxQuantity} required className="w-full mt-1 p-2 border rounded dark:bg-gray-700" />
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                     <button type="button" onClick={onClose} className="bg-gray-200 px-4 py-2 rounded-md">Cancelar</button>
                    <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-md">Asignar Producto</button>
                </div>
            </form>
        </Modal>
    );
};

const AddProductModal: React.FC<{ allProducts: Product[], currentStockIds: string[], onClose: () => void, onAdd: (productId: string, stock: number, min_stock: number, max_stock: number, is_shared: boolean) => void }> = ({ allProducts, currentStockIds, onClose, onAdd }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [productId, setProductId] = useState('');
    const [stock, setStock] = useState(0);
    const [min_stock, setMinStock] = useState(0);
    const [max_stock, setMax_stock] = useState(0);
    const [is_shared, setIsShared] = useState(false);
    
    const availableProducts = useMemo(() => {
        return allProducts
            .filter(p => !currentStockIds.includes(p.id))
            .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [allProducts, currentStockIds, searchTerm]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(productId) onAdd(productId, stock, min_stock, max_stock, is_shared);
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="Añadir Producto al Mini-Economato">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar producto..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-800 placeholder-gray-500 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                </div>

                <div className="max-h-40 overflow-y-auto border rounded-md p-1 space-y-1">
                    {availableProducts.map(p => (
                        <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                                setProductId(p.id);
                                setSearchTerm(p.name);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm ${productId === p.id ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                        >
                            <div className="font-medium">{p.name}</div>
                            <div className="text-[10px] text-gray-500">{p.category} - {p.reference}</div>
                        </button>
                    ))}
                    {availableProducts.length === 0 && (
                        <div className="text-center py-4 text-gray-400 text-sm italic">
                            No se encontraron productos disponibles.
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Stock Inicial</label>
                        <input type="number" value={stock} onChange={e => setStock(Number(e.target.value))} required min="0" step="0.01" className="w-full p-2 border rounded dark:bg-gray-700" />
                    </div>
                    <div>
                         <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Stock Mínimo</label>
                         <input type="number" value={min_stock} onChange={e => setMinStock(Number(e.target.value))} required min="0" step="0.01" className="w-full p-2 border rounded dark:bg-gray-700" />
                    </div>
                </div>
                <div>
                     <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Stock Máximo Recomendado</label>
                     <input type="number" value={max_stock} onChange={e => setMax_stock(Number(e.target.value))} required min="0" step="0.01" className="w-full p-2 border rounded dark:bg-gray-700" />
                </div>
                <div className="flex items-center space-x-2">
                    <input type="checkbox" id="is_shared" checked={is_shared} onChange={e => setIsShared(e.target.checked)} className="rounded text-primary-600" />
                    <label htmlFor="is_shared" className="text-sm">Producto de Gasto Compartido (repartir entre todos)</label>
                </div>
                <div className="flex justify-end pt-2">
                    <button 
                        type="submit" 
                        disabled={!productId}
                        className="bg-primary-600 text-white px-6 py-2 rounded-lg font-bold disabled:opacity-50 transition-all hover:bg-primary-700 shadow-md"
                    >
                        Añadir Producto
                    </button>
                </div>
            </form>
        </Modal>
    );
};

const EditStockModal: React.FC<{ item: StockItem, productName: string, onClose: () => void, onSave: (stock: number, min_stock: number, max_stock: number, is_shared: boolean) => void }> = ({ item, productName, onClose, onSave }) => {
    const [stock, setStock] = useState(item.stock);
    const [min_stock, setMin_stock] = useState(item.min_stock);
    const [max_stock, setMax_stock] = useState(item.max_stock || 0);
    const [is_shared, setIsShared] = useState(!!item.is_shared);
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave(stock, min_stock, max_stock, is_shared); };

    return (
        <Modal isOpen={true} onClose={onClose} title={`Editar Stock de ${productName}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Stock Actual</label>
                        <input type="number" value={stock} onChange={e => setStock(Number(e.target.value))} required min="0" step="0.01" className="w-full p-2 border rounded dark:bg-gray-700" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Stock Mínimo</label>
                        <input type="number" value={min_stock} onChange={e => setMin_stock(Number(e.target.value))} required min="0" step="0.01" className="w-full p-2 border rounded dark:bg-gray-700" />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Stock Máximo</label>
                    <input type="number" value={max_stock} onChange={e => setMax_stock(Number(e.target.value))} required min="0" step="0.01" className="w-full p-2 border rounded dark:bg-gray-700" />
                </div>
                <div className="flex items-center space-x-2">
                    <input type="checkbox" id="edit_is_shared" checked={is_shared} onChange={e => setIsShared(e.target.checked)} className="rounded text-primary-600" />
                    <label htmlFor="edit_is_shared" className="text-sm">Producto de Gasto Compartido (repartir entre todos)</label>
                </div>
                <div className="flex justify-end"><button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded">Guardar</button></div>
            </form>
        </Modal>
    );
};

export const MiniEconomato: React.FC = () => {
    const { mini_economato_stock, setMiniEconomatoStock, products, users, orders, setOrders, events, stock_receptions, setStockReceptions, suppliers } = useData();
    const { currentUser } = useAuth();
    const [view, setView] = useState<'inventory' | 'receptions'>('inventory');
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isReceptionModalOpen, setIsReceptionModalOpen] = useState(false);
    const [productToAssign, setProductToAssign] = useState<Product | null>(null);
    const [itemToEdit, setItemToEdit] = useState<StockItem | null>(null);

    const [receptionForm, setReceptionForm] = useState({
        supplier_id: '',
        date: new Date().toISOString().split('T')[0],
        products: [] as { product_id: string; quantity: number }[],
        notes: ''
    });

    const navigate = useNavigate();
    const canManage = useMemo(() => 
        currentUser?.profiles.includes(Profile.ALMACEN) || 
        currentUser?.profiles.includes(Profile.ADMIN)
    , [currentUser]);

    const productsMap = useMemo(() => new Map(products.map((p: Product) => [p.id, p])), [products]);
    const stockMap = useMemo(() => new Map(mini_economato_stock.map((s: StockItem) => [s.id, s])), [mini_economato_stock]);

    const [filter, setFilter] = useState('');
    const [isScannerOpen, setIsScannerOpen] = useState(false);

    const handleScan = (code: string) => {
        console.log("Product scanned:", code);
        setIsScannerOpen(false);
        // Simulate finding a product by barcode (code)
        // For demo: we'll just filter for a random common product if it exists
        const randomProduct = economatoProducts[Math.floor(Math.random() * economatoProducts.length)];
        if (randomProduct) {
            setFilter(randomProduct.product.name);
            alert(`Producto detectado: ${randomProduct.product.name}`);
        } else {
            alert("Producto no reconocido o no disponible en stock.");
        }
    };

    const economatoProducts = useMemo(() => {
        const mapped = Array.from(stockMap.values()).map((stockItem: StockItem) => ({
            product: productsMap.get(stockItem.id)!,
            stock: stockItem
        })).filter(item => item.product);

        if (!filter) return mapped;
        const lowerFilter = filter.toLowerCase();
        return mapped.filter(item => item.product.name.toLowerCase().includes(lowerFilter));
    }, [stockMap, productsMap, filter]);

    const getStockLevel = (current: number, min: number) => {
        if (current === 0) return { text: 'Agotado', textClass: 'text-red-800', bgClass: 'bg-red-100', className: 'bg-red-50 dark:bg-red-900/20 border-red-200' };
        if (current <= min * 0.5) return { text: 'Urgente', textClass: 'text-red-800', bgClass: 'bg-red-100', className: 'bg-red-50 dark:bg-red-900/20 border-red-200' };
        if (current <= min) return { text: 'Reponer', textClass: 'text-yellow-800', bgClass: 'bg-yellow-100', className: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200' };
        return { text: 'Suficiente', textClass: 'text-green-800', bgClass: 'bg-green-100', className: 'bg-green-50 dark:bg-green-900/20 border-green-200' };
    };

    const handleQuickOrder = (product: Product, currentStock: number, maxStock: number) => {
        const quantityToOrder = maxStock > currentStock ? maxStock - currentStock : 10;
        // Search for active order event or just use current date
        const now = new Date();
        const activeEvent = events.find(e => e.type === 'Regular' && new Date(e.start_date) <= now && new Date(e.end_date) >= now);
        
        if (activeEvent) {
             // In a real app we might redirect to order portal with state
             navigate(`/teacher/order-portal?type=economato&productId=${product.id}&quantity=${quantityToOrder}`);
        } else {
            alert("No hay un periodo de pedidos activo para realizar el pedido automático.");
        }
    };

    const handleOpenAssignModal = (product: Product) => {
        setProductToAssign(product);
        setIsAssignModalOpen(true);
    };

    const handleAssignExpense = (teacherId: string, quantity: number) => {
        if (!productToAssign || !teacherId || !quantity || quantity <= 0) {
            alert("Por favor, completa todos los campos.");
            return;
        }
        
        const now = new Date();
        const activeEvent = events.find(e => e.type === 'Regular' && new Date(e.start_date) <= now && new Date(e.end_date) >= now);
        if (!activeEvent) {
            alert("No hay un evento de pedido 'Regular' activo en este momento para imputar el gasto.");
            return;
        }

        const currentStock = stockMap.get(productToAssign.id);
        if (!currentStock || currentStock.stock < quantity) {
            alert("No hay suficiente stock.");
            return;
        }

        const priceInfo = productToAssign.suppliers.sort((a,b) => a.price - b.price)[0];
        if (!priceInfo) {
            alert("El producto no tiene un proveedor/precio definido para calcular el coste.");
            return;
        }
        
        const newItem: OrderItem = {
            product_id: productToAssign.id,
            quantity,
            price: priceInfo.price,
            tax: productToAssign.tax
        };

        const newOrder: Order = {
            id: `ord-eco-${Date.now()}`,
            user_id: teacherId,
            date: new Date().toISOString(),
            status: 'Completado',
            event_id: activeEvent.id,
            items: [newItem],
            cost: (newItem.price * newItem.quantity) * (1 + newItem.tax / 100),
            notes: `Asignado desde Mini-Economato.`
        };
        setOrders(prev => [...prev, newOrder]);

        setMiniEconomatoStock(prevStock => prevStock.map(item => 
            item.id === productToAssign.id ? { ...item, stock: item.stock - quantity } : item
        ));

        alert(`Producto ${productToAssign.name} asignado al profesor.`);
        setIsAssignModalOpen(false);
        setProductToAssign(null);
    };
    
    const handleAddProduct = (productId: string, stock: number, min_stock: number, max_stock: number, is_shared: boolean) => {
        setMiniEconomatoStock((prev: StockItem[]) => [...prev, {id: productId, stock, min_stock, max_stock, is_shared}]);
        setIsAddModalOpen(false);
    }
    
    const handleEditStock = (stock: number, min_stock: number, max_stock: number, is_shared: boolean) => {
        if (!itemToEdit) return;
        setMiniEconomatoStock((prev: StockItem[]) => prev.map((item: StockItem) => item.id === itemToEdit.id ? {...item, stock, min_stock, max_stock, is_shared, last_update: new Date().toISOString()} : item));
        setIsEditModalOpen(false);
    }

    const handleSaveReception = () => {
        if (!receptionForm.supplier_id || receptionForm.products.length === 0) {
            alert("Por favor, selecciona un proveedor y añade al menos un producto.");
            return;
        }

        const newReception = {
            id: `rec-${Date.now()}`,
            ...receptionForm
        };

        setStockReceptions(prev => [...prev, newReception]);

        setMiniEconomatoStock((prevStock: StockItem[]) => {
            const newStock = [...prevStock];
            receptionForm.products.forEach(p => {
                const existing = newStock.find(s => s.id === p.product_id);
                if (existing) {
                    existing.stock += p.quantity;
                    existing.last_update = new Date().toISOString();
                } else {
                    newStock.push({
                        id: p.product_id,
                        stock: p.quantity,
                        min_stock: 0,
                        is_shared: false,
                        last_update: new Date().toISOString()
                    });
                }
            });
            return newStock;
        });

        setIsReceptionModalOpen(false);
        setReceptionForm({
            supplier_id: '',
            date: new Date().toISOString().split('T')[0],
            products: [],
            notes: ''
        });
        alert("Recepción de stock guardada correctamente.");
    };

    const addProductToReception = () => {
        setReceptionForm(prev => ({
            ...prev,
            products: [...prev.products, { product_id: '', quantity: 0 }]
        }));
    };

    const updateReceptionProduct = (index: number, field: string, value: any) => {
        const newProducts = [...receptionForm.products];
        newProducts[index] = { ...newProducts[index], [field]: value };
        setReceptionForm({ ...receptionForm, products: newProducts });
    };

    const removeReceptionProduct = (index: number) => {
        setReceptionForm({
            ...receptionForm,
            products: receptionForm.products.filter((_, i) => i !== index)
        });
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">
                    {canManage ? 'Gestión de Mini-Economato' : 'Consulta de Mini-Economato'}
                </h1>
                <div className="flex space-x-2 flex-wrap gap-y-2">
                    {canManage && (
                        <>
                            <button onClick={() => setIsReceptionModalOpen(true)} className="no-print bg-amber-600 text-white py-2 px-4 rounded-md hover:bg-amber-700 flex items-center shadow-sm">
                                <Plus className="w-5 h-5 mr-2" /> Recibir Albarán
                            </button>
                            <button onClick={() => setIsAddModalOpen(true)} className="no-print bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 flex items-center shadow-sm">
                                <Plus className="w-5 h-5 mr-2" /> Stock Manual
                            </button>
                        </>
                    )}
                    <button onClick={printPage} className="no-print bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 flex items-center shadow-sm">
                        <Download className="w-5 h-5 mr-2" />
                        Informe PDF
                    </button>
                </div>
            </div>

            <div className="flex border-b border-gray-200 mb-6 dark:border-gray-700">
                <button
                    onClick={() => setView('inventory')}
                    className={`py-2 px-4 font-medium text-sm transition-colors duration-200 border-b-2 ${
                        view === 'inventory'
                        ? 'border-primary-600 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Inventario Actual
                </button>
                <button
                    onClick={() => setView('receptions')}
                    className={`py-2 px-4 font-medium text-sm transition-colors duration-200 border-b-2 ${
                        view === 'receptions'
                        ? 'border-primary-600 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Historial de Recepciones
                </button>
            </div>
            
            {view === 'inventory' ? (
                <Card title="Stock Interno">
                    <div className="flex space-x-2 mb-4 no-print">
                        <div className="relative flex-1">
                            <input 
                                type="text" 
                                placeholder="Buscar producto por nombre..." 
                                value={filter} 
                                onChange={e => setFilter(e.target.value)} 
                                className="w-full p-2 border rounded-md dark:bg-gray-700"
                            />
                            {filter && (
                                <button 
                                    onClick={() => setFilter('')} 
                                    className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                                >
                                    ×
                                </button>
                            )}
                        </div>
                        <button 
                            onClick={() => setIsScannerOpen(true)}
                            className="bg-gray-100 dark:bg-gray-700 p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 flex items-center space-x-1"
                            title="Escanear Código de Barras"
                        >
                            <Scan className="w-5 h-5" />
                            <span className="hidden sm:inline">Escanear</span>
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                <tr>
                                    <th className="px-4 py-2 text-left w-16">Imagen</th>
                                    <th className="px-4 py-2 text-left">Nombre / Refs</th>
                                    <th className="px-4 py-2 text-left text-center">Nivel de Stock</th>
                                    <th className="px-4 py-2 text-center">Estado</th>
                                    <th className="px-4 py-2 text-center">Reposición</th>
                                    <th className="px-4 py-2 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {economatoProducts.map(({ product, stock }) => {
                                    const stockLevel = getStockLevel(stock.stock, stock.min_stock);
                                    const needsReplenishment = stock.stock <= stock.min_stock;
                                    
                                    return (
                                        <tr key={product.id} className={`border-b dark:border-gray-700 transition-colors ${needsReplenishment ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                                            <td className="px-4 py-2">
                                                <div className="w-10 h-10 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden border dark:border-gray-600">
                                                    {product.image ? (
                                                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                    ) : (
                                                        <div className="w-5 h-5 bg-gray-300 dark:bg-gray-600 rounded"></div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 font-medium">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center space-x-2">
                                                        <span>{product.name}</span>
                                                        {stock.is_shared && (
                                                            <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter">Gasto Común</span>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] text-gray-400 font-mono tracking-tighter">{product.reference}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 text-center">
                                                <div className="flex flex-col items-center">
                                                    <div className={`font-mono text-sm font-black ${needsReplenishment ? 'text-red-600' : 'text-gray-800 dark:text-white'}`}>
                                                        {stock.stock.toFixed(2)}
                                                    </div>
                                                    <div className="flex items-center space-x-1 text-[10px] text-gray-400 font-bold uppercase">
                                                        <span>Mín: {stock.min_stock}</span>
                                                        {stock.max_stock ? <span>/ Máx: {stock.max_stock}</span> : null}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 text-center">
                                                <span className={`px-2 py-1 text-[10px] font-black uppercase tracking-widest rounded-full ${stockLevel.bgClass} ${stockLevel.textClass} border shadow-sm`}>
                                                    {stockLevel.text}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 text-center">
                                                {needsReplenishment ? (
                                                    <button 
                                                        onClick={() => handleQuickOrder(product, stock.stock, stock.max_stock || (stock.min_stock * 2))}
                                                        className="inline-flex items-center text-xs font-bold text-primary-600 hover:text-primary-700 bg-white dark:bg-gray-800 px-2 py-1 rounded border border-primary-200 shadow-sm transition-all hover:scale-105 active:scale-95"
                                                        title="Añadir al pedido actual"
                                                    >
                                                        <ShoppingCart className="w-3 h-3 mr-1" />
                                                        +{(stock.max_stock ? (stock.max_stock - stock.stock) : (stock.min_stock * 2)).toFixed(0)} uds
                                                    </button>
                                                ) : (
                                                    <span className="text-gray-300 text-xs">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-2 text-right space-x-2 no-print">
                                                {canManage && (
                                                    <div className="flex justify-end gap-1">
                                                        <button 
                                                            onClick={() => { setItemToEdit(stock); setIsEditModalOpen(true); }} 
                                                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                                                            title="Editar Stock"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleOpenAssignModal(product)} 
                                                            className="py-1 px-3 text-xs font-bold bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-30 disabled:grayscale transition-all shadow-sm flex items-center" 
                                                            disabled={stock.stock <= 0}
                                                        >
                                                            <ShoppingCart className="w-3 h-3 mr-1" /> ASIGNAR
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {economatoProducts.length === 0 && <p className="text-gray-500 text-center py-4">No hay productos en el mini-economato. Añade uno para empezar.</p>}
                    </div>
                </Card>
            ) : (
                <Card title="Historial de Entradas de Mercancía">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="p-3">Fecha</th>
                                    <th className="p-3">Proveedor</th>
                                    <th className="p-3">Productos</th>
                                    <th className="p-3">Notas</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stock_receptions.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((reception: any) => (
                                    <tr key={reception.id} className="border-t dark:border-gray-700">
                                        <td className="p-3">{new Date(reception.date).toLocaleDateString()}</td>
                                        <td className="p-3 font-semibold">{suppliers.find(s => s.id === reception.supplier_id)?.name || 'N/A'}</td>
                                        <td className="p-3">
                                            <ul className="text-xs">
                                                {reception.products.map((p: any, i: number) => (
                                                    <li key={i}>{p.quantity} x {productsMap.get(p.product_id)?.name || 'Desconocido'}</li>
                                                ))}
                                            </ul>
                                        </td>
                                        <td className="p-3 text-sm italic">{reception.notes}</td>
                                    </tr>
                                ))}
                                {stock_receptions.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-10 text-center text-gray-500">No hay recepciones registradas.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {isReceptionModalOpen && (
                <Modal isOpen={true} onClose={() => setIsReceptionModalOpen(false)} title="Recibir Mercancía (Entrada en Almacén)">
                    <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium">Proveedor</label>
                                <select 
                                    value={receptionForm.supplier_id} 
                                    onChange={e => setReceptionForm({...receptionForm, supplier_id: e.target.value})}
                                    className="w-full mt-1 p-2 border rounded dark:bg-gray-700"
                                >
                                    <option value="">Seleccionar Proveedor...</option>
                                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Fecha Entrada</label>
                                <input 
                                    type="date" 
                                    value={receptionForm.date} 
                                    onChange={e => setReceptionForm({...receptionForm, date: e.target.value})}
                                    className="w-full mt-1 p-2 border rounded dark:bg-gray-700"
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-2 rounded mb-2">
                                <h4 className="font-bold text-sm">Productos Recibidos</h4>
                                <button onClick={addProductToReception} className="text-xs text-primary-600 font-bold hover:underline">+ Añadir Producto</button>
                            </div>
                            <div className="space-y-2">
                                {receptionForm.products.map((p, index) => (
                                    <div key={index} className="flex space-x-2 items-end border-b pb-2 dark:border-gray-700">
                                        <div className="flex-1">
                                            <select 
                                                value={p.product_id}
                                                onChange={e => updateReceptionProduct(index, 'product_id', e.target.value)}
                                                className="w-full p-2 text-sm border rounded dark:bg-gray-700"
                                            >
                                                <option value="">Seleccionar Producto...</option>
                                                {products.map(prod => <option key={prod.id} value={prod.id}>{prod.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="w-24">
                                            <input 
                                                type="number" 
                                                value={p.quantity}
                                                placeholder="Cant"
                                                onChange={e => updateReceptionProduct(index, 'quantity', Number(e.target.value))}
                                                className="w-full p-2 text-sm border rounded dark:bg-gray-700"
                                            />
                                        </div>
                                        <button onClick={() => removeReceptionProduct(index)} className="text-red-500 p-2">×</button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Notas / Observaciones</label>
                            <textarea 
                                value={receptionForm.notes}
                                onChange={e => setReceptionForm({...receptionForm, notes: e.target.value})}
                                placeholder="Ej: Pedido incompleto..."
                                className="w-full mt-1 p-2 border rounded dark:bg-gray-700 h-20"
                            />
                        </div>

                        <div className="flex justify-end space-x-2 pt-4">
                            <button onClick={() => setIsReceptionModalOpen(false)} className="bg-gray-200 px-4 py-2 rounded-md">Cancelar</button>
                            <button onClick={handleSaveReception} className="bg-primary-600 text-white px-4 py-2 rounded-md">Confirmar Entrada</button>
                        </div>
                    </div>
                </Modal>
            )}

            {isScannerOpen && <ScannerModal onClose={() => setIsScannerOpen(false)} onScan={handleScan} />}

            {isAssignModalOpen && productToAssign && (
                <AssignExpenseModal 
                    product={productToAssign}
                    onClose={() => setIsAssignModalOpen(false)}
                    onAssign={handleAssignExpense}
                    teachers={users.filter(u => u.profiles.includes(Profile.TEACHER) && u.activity_status === 'Activo')}
                />
            )}

            {isAddModalOpen && (
                <AddProductModal
                    allProducts={products}
                    currentStockIds={mini_economato_stock.map((s: StockItem) => s.id)}
                    onClose={() => setIsAddModalOpen(false)}
                    onAdd={handleAddProduct}
                />
            )}

            {isEditModalOpen && itemToEdit && (
                <EditStockModal
                    item={itemToEdit}
                    productName={productsMap.get(itemToEdit.id)?.name || ''}
                    onClose={() => setIsEditModalOpen(false)}
                    onSave={handleEditStock}
                />
            )}
        </div>
    );
};
