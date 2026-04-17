import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../../components/Card';
import { Modal } from '../../components/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { Product, User, Profile, Order, StockItem, OrderItem } from '../../types';
import { DownloadIcon, PlusIcon, PencilIcon } from '../../components/icons';
import { printPage } from '../../utils/export';
import { Link } from 'react-router-dom';

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

const AddProductModal: React.FC<{ allProducts: Product[], currentStockIds: string[], onClose: () => void, onAdd: (productId: string, stock: number, min_stock: number, is_shared: boolean) => void }> = ({ allProducts, currentStockIds, onClose, onAdd }) => {
    const [productId, setProductId] = useState('');
    const [stock, setStock] = useState(0);
    const [min_stock, setMinStock] = useState(0);
    const [is_shared, setIsShared] = useState(false);
    
    const availableProducts = useMemo(() => allProducts.filter(p => !currentStockIds.includes(p.id)), [allProducts, currentStockIds]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(productId) onAdd(productId, stock, min_stock, is_shared);
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="Añadir Producto al Mini-Economato">
            <form onSubmit={handleSubmit} className="space-y-4">
                <select value={productId} onChange={e => setProductId(e.target.value)} required className="w-full p-2 border rounded dark:bg-gray-700">
                    <option value="">-- Seleccionar Producto --</option>
                    {availableProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-4">
                    <input type="number" value={stock} onChange={e => setStock(Number(e.target.value))} placeholder="Stock Inicial" required min="0" step="0.01" className="w-full p-2 border rounded dark:bg-gray-700" />
                    <input type="number" value={min_stock} onChange={e => setMinStock(Number(e.target.value))} placeholder="Stock Mínimo" required min="0" step="0.01" className="w-full p-2 border rounded dark:bg-gray-700" />
                </div>
                <div className="flex items-center space-x-2">
                    <input type="checkbox" id="is_shared" checked={is_shared} onChange={e => setIsShared(e.target.checked)} className="rounded text-primary-600" />
                    <label htmlFor="is_shared" className="text-sm">Producto de Gasto Compartido (repartir entre todos)</label>
                </div>
                <div className="flex justify-end"><button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded">Añadir</button></div>
            </form>
        </Modal>
    );
};

const EditStockModal: React.FC<{ item: StockItem, productName: string, onClose: () => void, onSave: (stock: number, min_stock: number, is_shared: boolean) => void }> = ({ item, productName, onClose, onSave }) => {
    const [stock, setStock] = useState(item.stock);
    const [min_stock, setMinStock] = useState(item.min_stock);
    const [is_shared, setIsShared] = useState(!!item.is_shared);
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave(stock, min_stock, is_shared); };

    return (
        <Modal isOpen={true} onClose={onClose} title={`Editar Stock de ${productName}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <input type="number" value={stock} onChange={e => setStock(Number(e.target.value))} placeholder="Stock Actual" required min="0" step="0.01" className="w-full p-2 border rounded dark:bg-gray-700" />
                    <input type="number" value={min_stock} onChange={e => setMinStock(Number(e.target.value))} placeholder="Stock Mínimo" required min="0" step="0.01" className="w-full p-2 border rounded dark:bg-gray-700" />
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

    const canManage = useMemo(() => 
        currentUser?.profiles.includes(Profile.ALMACEN) || 
        currentUser?.profiles.includes(Profile.ADMIN)
    , [currentUser]);

    const productsMap = useMemo(() => new Map(products.map((p: Product) => [p.id, p])), [products]);
    const stockMap = useMemo(() => new Map(mini_economato_stock.map((s: StockItem) => [s.id, s])), [mini_economato_stock]);

    const [filter, setFilter] = useState('');

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
        if (current === 0) return { text: 'Agotado', textClass: 'text-red-800', bgClass: 'bg-red-100', className: 'bg-red-200 dark:bg-red-900 border-red-400' };
        if (current <= min * 0.5) return { text: 'Bajo Mínimos', textClass: 'text-red-800', bgClass: 'bg-red-100', className: 'bg-red-300 dark:bg-red-800 border-red-500' };
        if (current <= min) return { text: 'Nivel Bajo', textClass: 'text-yellow-800', bgClass: 'bg-yellow-100', className: 'bg-yellow-200 dark:bg-yellow-900 border-yellow-400' };
        return { text: 'Saludable', textClass: 'text-green-800', bgClass: 'bg-green-100', className: 'bg-green-200 dark:bg-green-900 border-green-400' };
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
    
    const handleAddProduct = (productId: string, stock: number, min_stock: number, is_shared: boolean) => {
        setMiniEconomatoStock((prev: StockItem[]) => [...prev, {id: productId, stock, min_stock, is_shared}]);
        setIsAddModalOpen(false);
    }
    
    const handleEditStock = (stock: number, min_stock: number, is_shared: boolean) => {
        if (!itemToEdit) return;
        setMiniEconomatoStock((prev: StockItem[]) => prev.map((item: StockItem) => item.id === itemToEdit.id ? {...item, stock, min_stock, is_shared, last_update: new Date().toISOString()} : item));
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
                            <button onClick={() => setIsReceptionModalOpen(true)} className="no-print bg-amber-600 text-white py-2 px-4 rounded-md hover:bg-amber-700 flex items-center">
                                <PlusIcon className="w-5 h-5 mr-2" /> Recibir Pedido (Empresa)
                            </button>
                            <button onClick={() => setIsAddModalOpen(true)} className="no-print bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 flex items-center">
                                <PlusIcon className="w-5 h-5 mr-2" /> Stock Manual
                            </button>
                            <Link to="/teacher/order-portal?type=economato" className="no-print bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 flex items-center">
                                <PlusIcon className="w-5 h-5 mr-2" /> Hacer Pedido de Reposición
                            </Link>
                        </>
                    )}
                    <button onClick={printPage} className="no-print bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 flex items-center">
                        <DownloadIcon className="w-5 h-5 mr-2" />
                        Descargar PDF
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
                    <div className="flex space-x-4 mb-4 no-print">
                        <input type="text" placeholder="Buscar producto por nombre..." value={filter} onChange={e => setFilter(e.target.value)} className="w-full p-2 border rounded-md dark:bg-gray-700"/>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                <tr>
                                    <th className="px-4 py-2 text-left w-16">Imagen</th>
                                    <th className="px-4 py-2 text-left">Nombre</th>
                                    <th className="px-4 py-2 text-left">Stock Actual</th>
                                    <th className="px-4 py-2 text-left">Estado</th>
                                    <th className="px-4 py-2 text-left">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {economatoProducts.map(({ product, stock }) => {
                                    const stockLevel = getStockLevel(stock.stock, stock.min_stock);
                                    return (
                                        <tr key={product.id} className="border-b dark:border-gray-700">
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
                                                <div className="flex items-center space-x-2">
                                                    <span>{product.name}</span>
                                                    {stock.is_shared && (
                                                        <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full font-bold uppercase">Compartido</span>
                                                    )}
                                                </div>
                                                {product.unit === 'Uds' && product.unit_size && (
                                                    <div className="text-[10px] text-gray-500">
                                                        1 ud = {product.unit_size}{product.unit_size_type || 'g'}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-2">
                                                <div className="font-mono text-sm font-bold">
                                                    {stock.stock.toFixed(2)} <span className="text-xs text-gray-500 font-normal">/ Mín: {stock.min_stock}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${stockLevel.bgClass} ${stockLevel.textClass}`}>
                                                    {stockLevel.text}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 space-x-2 no-print">
                                                {canManage && (
                                                    <>
                                                        <button onClick={() => { setItemToEdit(stock); setIsEditModalOpen(true); }} className="text-primary-600 hover:underline">
                                                            Editar
                                                        </button>
                                                        <button onClick={() => handleOpenAssignModal(product)} className="text-blue-600 hover:underline disabled:text-gray-400 disabled:no-underline" disabled={stock.stock <= 0}>
                                                            Asignar
                                                        </button>
                                                    </>
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
