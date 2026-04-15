import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../../components/Card';
import { Modal } from '../../components/Modal';
import { PlusIcon, DownloadIcon, WarningIcon, TrashIcon } from '../../components/icons';
import { Supplier, Product, Incident, Event, Order } from '../../types';
import { exportToCsv, printPage } from '../../utils/export';
import { ProductFormModal } from './ProductManager';


export const SupplierManager = () => {
    const { suppliers, setSuppliers, products, setProducts, incidents, events, orders } = useData();
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isProductListModalOpen, setIsProductListModalOpen] = useState(false);
    const [isProductFormModalOpen, setIsProductFormModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteStep, setDeleteStep] = useState(1);

    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    const productsBySupplier = useMemo(() => {
        const map = new Map<string, Product[]>();
        products.forEach(p => {
            p.suppliers.forEach(s => {
                if (!map.has(s.supplier_id)) map.set(s.supplier_id, []);
                map.get(s.supplier_id)!.push(p);
            });
        });
        return map;
    }, [products]);

    const topProductsBySupplier = useMemo(() => {
        const map = new Map<string, {name: string, count: number}[]>();
        suppliers.forEach(sup => {
            const productCounts = new Map<string, number>();
            orders.filter(o => o.status === 'Completado' || o.status === 'Recibido OK').forEach(order => {
                order.items.forEach(item => {
                    const product = products.find(p => p.id === item.product_id);
                    if (product && product.suppliers.some(s => s.supplier_id === sup.id)) {
                        productCounts.set(product.name, (productCounts.get(product.name) || 0) + item.quantity);
                    }
                });
            });
            const sortedProducts = Array.from(productCounts.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([name, count]) => ({name, count}));
            map.set(sup.id, sortedProducts);
        });
        return map;
    }, [orders, products, suppliers]);


    const incidentsBySupplier = useMemo(() => {
        const map = new Map<string, Incident[]>();
        incidents.forEach(inc => {
            if (!map.has(inc.supplier_id)) map.set(inc.supplier_id, []);
            map.get(inc.supplier_id)!.push(inc);
        });
        return map;
    }, [incidents]);

    const handleOpenFormModal = (supplier: Supplier | null = null) => {
        setSelectedSupplier(supplier);
        setIsFormModalOpen(true);
    };

    const handleSaveSupplier = (supplierData: Supplier) => {
        if (selectedSupplier) {
            setSuppliers(suppliers.map(s => (s.id === supplierData.id ? supplierData : s)));
        } else {
            setSuppliers([...suppliers, { ...supplierData, id: `sup-${Date.now()}` }]);
        }
        setIsFormModalOpen(false);
    };

    const handleSaveProduct = (productData: Product) => {
        setProducts(products.map(p => p.id === productData.id ? productData : p));
        setIsProductFormModalOpen(false);
    }
    
    const handleDeleteSupplier = () => {
        if (!selectedSupplier) return;
        
        // Remove supplier from any products that reference it
        const updatedProducts = products.map(p => ({
            ...p,
            suppliers: p.suppliers.filter(s => s.supplier_id !== selectedSupplier.id)
        }));
        setProducts(updatedProducts);

        // Remove the supplier itself
        setSuppliers(suppliers.filter(s => s.id !== selectedSupplier.id));

        setIsDeleteModalOpen(false);
        setSelectedSupplier(null);
    };

    const handleExport = () => {
        exportToCsv('proveedores.csv', suppliers);
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Gestión de Proveedores</h1>
                <div className="flex items-center space-x-2 no-print">
                    <button onClick={handleExport} className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 flex items-center">
                       <DownloadIcon className="w-5 h-5 mr-1" /> Descargar CSV
                    </button>
                    <button onClick={() => handleOpenFormModal()} className="bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 flex items-center">
                        <PlusIcon className="w-5 h-5 mr-1" /> Añadir Nuevo Proveedor
                    </button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {suppliers.map(supplier => {
                    const supplierIncidents = incidentsBySupplier.get(supplier.id) || [];
                    const supplierProducts = productsBySupplier.get(supplier.id) || [];
                    const topProducts = topProductsBySupplier.get(supplier.id) || [];
                    const hasIncidents = supplierIncidents.length > 0;

                    return (
                        <div key={supplier.id} className={`bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 border-l-4 ${hasIncidents ? 'border-yellow-400' : 'border-primary-500'}`}>
                            <div className="flex justify-between items-start">
                                <div className="flex-grow">
                                    <h3 className="text-xl font-bold flex items-center">
                                        {supplier.name}
                                        <span className={`ml-2 px-2 py-0.5 text-xs font-semibold rounded-full ${supplier.status === 'Activo' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-800'}`}>
                                            {supplier.status}
                                        </span>
                                        {hasIncidents && <WarningIcon className="w-5 h-5 ml-2 text-yellow-500"/>}
                                    </h3>
                                </div>
                                <div className="flex space-x-1 flex-shrink-0">
                                    <button onClick={() => { setSelectedSupplier(supplier); setIsDetailModalOpen(true); }} className="text-xs bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded">Ver Ficha</button>
                                    <button onClick={() => handleOpenFormModal(supplier)} className="text-xs bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded">Editar</button>
                                    <button onClick={() => { setSelectedSupplier(supplier); setIsProductListModalOpen(true); }} className="text-xs bg-blue-500 text-white px-2 py-1 rounded">Ver Productos</button>
                                    <button onClick={() => { setSelectedSupplier(supplier); setIsDeleteModalOpen(true); setDeleteStep(1); }} className="text-xs bg-red-500 text-white p-1 rounded"><TrashIcon className="w-4 h-4"/></button>
                                </div>
                            </div>
                             <div className="text-xs mt-2">
                                <strong>Contacto:</strong> {supplier.contact_person} | <strong>Tlf:</strong> {supplier.phone}<br/>
                                <strong>Email:</strong> {supplier.email}
                            </div>
                             <div className="text-xs mt-2">
                                <strong>CIF:</strong> {supplier.cif} | <strong>Dirección:</strong> {supplier.address}
                            </div>
                            {supplier.notes && <div className="text-xs mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded"><strong>Notas:</strong> {supplier.notes}</div>}

                            <div className="mt-4 pt-2 border-t dark:border-gray-600 text-xs space-y-2">
                                <p><strong>Estadísticas:</strong> {supplierProducts.length} referencias en app, {supplierIncidents.length} incidencias.</p>
                                <div>
                                    <strong>5 más pedidos:</strong>
                                    {topProducts.length > 0 ? <ul className="list-disc list-inside">
                                        {topProducts.map(p => <li key={p.name}>{p.name}</li>)}
                                    </ul> : <p>N/D</p>}
                                </div>
                                <details className="text-xs">
                                    <summary className="cursor-pointer font-semibold">Historial de Incidencias ({supplierIncidents.length})</summary>
                                    <ul className="mt-1 list-disc list-inside">
                                        {supplierIncidents.slice(0, 5).map(inc => <li key={inc.id} className="text-red-500">{inc.description}</li>)}
                                    </ul>
                                </details>
                            </div>
                        </div>
                    )
                })}
            </div>

            {isFormModalOpen && <SupplierFormModal supplier={selectedSupplier} onClose={() => setIsFormModalOpen(false)} onSave={handleSaveSupplier} />}
            {isDetailModalOpen && selectedSupplier && <SupplierDetailModal supplier={selectedSupplier} incidents={incidentsBySupplier.get(selectedSupplier.id) || []} productsMap={new Map(products.map(p => [p.id, p]))} eventsMap={new Map(events.map(e => [e.id, e]))} onClose={() => setIsDetailModalOpen(false)}/>}
            {isProductListModalOpen && selectedSupplier && (
                <ProductListModal 
                    supplier={selectedSupplier}
                    products={productsBySupplier.get(selectedSupplier.id) || []}
                    onClose={() => setIsProductListModalOpen(false)}
                    onEditProduct={(product) => {
                        setSelectedProduct(product);
                        setIsProductListModalOpen(false);
                        setIsProductFormModalOpen(true);
                    }}
                />
            )}
             {isProductFormModalOpen && selectedProduct && (
                <ProductFormModal 
                    product={selectedProduct}
                    allProducts={products}
                    allSuppliers={suppliers}
                    onSave={(p) => { handleSaveProduct(p); setIsProductListModalOpen(true); }}
                    onClose={() => { setIsProductFormModalOpen(false); setIsProductListModalOpen(true); }}
                />
            )}
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirmar Eliminación">
                {deleteStep === 1 ? (
                    <div>
                        <div className="text-center">
                            <WarningIcon className="w-16 h-16 text-red-500 mx-auto"/>
                            <p className="text-lg font-semibold my-4">¿Seguro que quieres eliminar a {selectedSupplier?.name}?</p>
                            <p className="text-gray-500">Esta acción no se puede deshacer. El proveedor se eliminará de todos los productos asociados.</p>
                        </div>
                        <div className="mt-6 flex justify-end space-x-3">
                            <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300">Cancelar</button>
                            <button onClick={() => setDeleteStep(2)} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Sí, eliminar</button>
                        </div>
                    </div>
                ) : (
                     <div>
                        <p className="mb-4 text-center">Para confirmar, haz clic de nuevo en el botón de eliminar.</p>
                        <div className="mt-6 flex justify-end">
                             <button onClick={handleDeleteSupplier} className="w-full px-4 py-2 bg-red-600 text-white rounded-md">Confirmar Eliminación Permanente</button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

const SupplierFormModal: React.FC<{ supplier: Supplier | null; onClose: () => void; onSave: (supplier: Supplier) => void; }> = ({ supplier, onClose, onSave }) => {
    const [formState, setFormState] = useState<Supplier>(supplier || { id: '', name: '', cif: '', address: '', phone: '', email: '', contact_person: '', status: 'Activo', website: '', notes: '' });
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setFormState({ ...formState, [e.target.name]: e.target.value });
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave(formState); };

    return (
        <Modal isOpen={true} onClose={onClose} title={supplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" name="name" value={formState.name} onChange={handleChange} placeholder="Nombre" required className="w-full p-2 border rounded"/>
                    <input type="text" name="contact_person" value={formState.contact_person} onChange={handleChange} placeholder="Persona de Contacto" className="w-full p-2 border rounded"/>
                    <input type="email" name="email" value={formState.email} onChange={handleChange} placeholder="Email" required className="w-full p-2 border rounded"/>
                    <input type="tel" name="phone" value={formState.phone} onChange={handleChange} placeholder="Teléfono" className="w-full p-2 border rounded"/>
                    <input type="text" name="cif" value={formState.cif} onChange={handleChange} placeholder="CIF" required className="w-full p-2 border rounded"/>
                    <input type="url" name="website" value={formState.website || ''} onChange={handleChange} placeholder="Sitio Web" className="w-full p-2 border rounded"/>
                    <div>
                        <select name="status" value={formState.status} onChange={handleChange} className="w-full p-2 border rounded">
                            <option value="Activo">Activo</option>
                            <option value="Inactivo">Inactivo</option>
                        </select>
                    </div>
                </div>
                <textarea name="address" value={formState.address} onChange={handleChange} placeholder="Dirección" rows={2} className="w-full p-2 border rounded" />
                <textarea name="notes" value={formState.notes || ''} onChange={handleChange} placeholder="Notas" rows={2} className="w-full p-2 border rounded" />
                <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={onClose} className="bg-gray-200 px-4 py-2 rounded-md">Cancelar</button>
                    <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-md">Guardar</button>
                </div>
            </form>
        </Modal>
    );
};

const SupplierDetailModal: React.FC<{supplier: Supplier, incidents: Incident[], productsMap: Map<string, Product>, eventsMap: Map<string, Event>, onClose: () => void}> = ({supplier, incidents, productsMap, eventsMap, onClose}) => (
    <Modal isOpen={true} onClose={onClose} title={`Ficha Completa de ${supplier.name}`}>
        <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <p><strong>Contacto:</strong> {supplier.contact_person}</p>
                    <p><strong>Teléfono:</strong> {supplier.phone}</p>
                    <p><strong>Email:</strong> {supplier.email}</p>
                </div>
                 <div>
                    <p><strong>CIF:</strong> {supplier.cif}</p>
                    <p><strong>Dirección:</strong> {supplier.address}</p>
                </div>
            </div>
            <div className="pt-2">
                <h4 className="font-bold">Historial de Incidencias (Últimas 15)</h4>
                {incidents.length > 0 ? (
                    <table className="w-full mt-2 text-xs">
                        <thead><tr className="border-b"><th className="text-left p-1">Fecha</th><th className="text-left p-1">Producto</th><th className="text-left p-1">Evento</th><th className="text-left p-1">Motivo</th></tr></thead>
                        <tbody>{incidents.slice(0, 15).map(inc => <tr key={inc.id}><td className="p-1">{new Date(inc.date).toLocaleDateString()}</td><td className="p-1">{productsMap.get(inc.product_id || '')?.name}</td><td className="p-1">{eventsMap.get(inc.event_id || '')?.name}</td><td className="p-1 text-red-500">{inc.description}</td></tr>)}</tbody>
                    </table>
                ) : <p className="text-gray-500 mt-2">No hay incidencias registradas para este proveedor.</p>}
            </div>
        </div>
        <div className="flex justify-end space-x-2 mt-6">
            <button onClick={() => printPage()} className="bg-green-600 text-white px-4 py-2 rounded-md">Imprimir</button>
            <button onClick={onClose} className="bg-gray-500 text-white px-4 py-2 rounded-md">Cerrar</button>
        </div>
    </Modal>
);

const ProductListModal: React.FC<{supplier: Supplier, products: Product[], onClose: () => void, onEditProduct: (product: Product) => void}> = ({supplier, products, onClose, onEditProduct}) => (
    <Modal isOpen={true} onClose={onClose} title={`Productos de ${supplier.name}`}>
        <div className="max-h-96 overflow-y-auto">
            {products.map(p => (
                <div key={p.id} className="flex justify-between items-center p-2 border-b">
                    <span>{p.name}</span>
                    <button onClick={() => onEditProduct(p)} className="text-sm bg-blue-500 text-white px-3 py-1 rounded">Editar</button>
                </div>
            ))}
        </div>
    </Modal>
);