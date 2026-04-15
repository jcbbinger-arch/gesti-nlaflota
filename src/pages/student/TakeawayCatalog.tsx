import React, { useState, useMemo } from 'react';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Reservation, SaleItem } from '../../types';
import { ALLERGEN_ICONS } from '../../lib/allergens';
import { AlertTriangle, Calendar, Clock, User as UserIcon, ShoppingCart, X, Plus, Minus, ClipboardList } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { AllergenSelector } from '../teacher/RecipeForm';
import { Link, useNavigate } from 'react-router-dom';

const DAYS_OF_WEEK = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const DAY_COLORS: Record<string, string> = {
    'Lunes': 'bg-blue-50 border-blue-200 text-blue-800',
    'Martes': 'bg-green-50 border-green-200 text-green-800',
    'Miércoles': 'bg-yellow-50 border-yellow-200 text-yellow-800',
    'Jueves': 'bg-orange-50 border-orange-200 text-orange-800',
    'Viernes': 'bg-red-50 border-red-200 text-red-800',
    'Sábado': 'bg-purple-50 border-purple-200 text-purple-800',
    'Domingo': 'bg-gray-50 border-gray-200 text-gray-800',
};

const DAY_HEADER_COLORS: Record<string, string> = {
    'Lunes': 'bg-blue-600',
    'Martes': 'bg-green-600',
    'Miércoles': 'bg-yellow-600',
    'Jueves': 'bg-orange-600',
    'Viernes': 'bg-red-600',
    'Sábado': 'bg-purple-600',
    'Domingo': 'bg-gray-600',
};

interface CartItem {
    saleItem: SaleItem;
    quantity: number;
}

export const TakeawayCatalog: React.FC = () => {
    const { sale_items, setSaleItems, reservations, setReservations } = useData();
    const { currentUser } = useAuth();
    
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const activeItems = sale_items.filter(item => {
        if (item.status !== 'Activo' || item.rations <= 0) return false;
        
        // Check if expired
        const now = new Date();
        const itemEndDateTime = new Date(`${item.sale_date}T${item.end_time}`);
        return itemEndDateTime > now;
    });

    const groupedItems = useMemo(() => {
        const groups: Record<string, SaleItem[]> = {};
        activeItems.forEach(item => {
            const date = new Date(item.sale_date);
            const dayName = DAYS_OF_WEEK[date.getDay()];
            if (!groups[dayName]) groups[dayName] = [];
            groups[dayName].push(item);
        });
        
        const sortedDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        return sortedDays.filter(day => groups[day]).map(day => ({
            day,
            items: groups[day].sort((a, b) => a.pickup_time.localeCompare(b.pickup_time))
        }));
    }, [activeItems]);

    const [isSuccessOpen, setIsSuccessOpen] = useState(false);

    const navigate = useNavigate();

    const addToCart = (item: SaleItem) => {
        if (!currentUser) {
            navigate('/login');
            return;
        }
        setCart(prev => {
            const existing = prev.find(i => i.saleItem.id === item.id);
            if (existing) {
                return prev.map(i => i.saleItem.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { saleItem: item, quantity: 1 }];
        });
    };

    const removeFromCart = (itemId: string) => {
        setCart(prev => prev.filter(i => i.saleItem.id !== itemId));
    };

    const updateQuantity = (itemId: string, delta: number) => {
        setCart(prev => prev.map(i => {
            if (i.saleItem.id === itemId) {
                const newQ = Math.max(1, i.quantity + delta);
                // Don't exceed available rations
                const maxQ = i.saleItem.rations;
                return { ...i, quantity: Math.min(newQ, maxQ) };
            }
            return i;
        }));
    };

    const handleConfirmReservation = async (details: { name: string, email: string, phone: string, notes: string, allergens: string[] }) => {
        setIsSubmitting(true);
        
        const newReservations: Reservation[] = cart.map(cartItem => ({
            id: `res-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            sale_item_id: cartItem.saleItem.id,
            user_id: currentUser?.id,
            user_name: details.name,
            email: details.email,
            phone: details.phone,
            allergens: details.allergens,
            quantity: cartItem.quantity,
            notes: details.notes,
            status: 'pendiente',
            created_at: new Date().toISOString()
        }));

        try {
            // Update reservations via context
            await setReservations([...reservations, ...newReservations]);
            
            // Update sale_items rations directly via batch to avoid permission issues with unchanged items
            const batch = writeBatch(db);
            cart.forEach(cartItem => {
                const itemRef = doc(db, 'sale_items', cartItem.saleItem.id);
                batch.update(itemRef, {
                    rations: cartItem.saleItem.rations - cartItem.quantity
                });
            });
            await batch.commit();

            setCart([]);
            setIsCartOpen(false);
            setIsSuccessOpen(true);
        } catch (error) {
            console.error("Error saving reservations", error);
            alert("Hubo un error al procesar la reserva.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 relative">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white text-center flex-1">
                    Catálogo de Comidas para Llevar
                </h1>
                
                <div className="flex items-center gap-4">
                    {!currentUser && (
                        <Link 
                            to="/login?mode=takeaway"
                            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
                        >
                            <UserIcon className="w-5 h-5 mr-2" />
                            <span className="font-medium">Identificarse / Registro</span>
                        </Link>
                    )}
                    {currentUser && (
                        <Link 
                            to="/student/my-reservations"
                            className="flex items-center px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm border border-gray-200 dark:border-gray-700"
                        >
                            <ClipboardList className="w-5 h-5 mr-2 hidden sm:block" />
                            <span className="font-medium">Mis Reservas</span>
                        </Link>
                    )}
                    <button 
                        onClick={() => setIsCartOpen(true)}
                        className="relative p-3 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-colors shadow-lg"
                    >
                        <ShoppingCart className="w-6 h-6" />
                        {cartItemsCount > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-white dark:border-gray-900">
                                {cartItemsCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>
            
            {groupedItems.map(({ day, items }) => (
                <div key={day} className="mb-12">
                    <div className={`inline-block px-6 py-2 rounded-t-xl text-white font-bold text-xl ${DAY_HEADER_COLORS[day]}`}>
                        {day}
                    </div>
                    <div className={`p-6 rounded-b-xl rounded-r-xl border-t-4 ${DAY_HEADER_COLORS[day].replace('bg-', 'border-')} ${DAY_COLORS[day].split(' ')[0]} border-2 shadow-sm`}>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {items.map(item => {
                                const cartItem = cart.find(c => c.saleItem.id === item.id);
                                const isSoldOut = item.rations <= 0;
                                
                                return (
                                    <div key={item.id} className={`bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-shadow duration-300 ${isSoldOut ? 'opacity-75' : ''}`}>
                                        <div className="p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{item.name}</h3>
                                                <span className="bg-primary-100 text-primary-800 text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap ml-2">
                                                    {item.price.toFixed(2)} €
                                                </span>
                                            </div>
                                            
                                            <p className="text-gray-600 dark:text-gray-400 text-xs mb-3 line-clamp-2">
                                                {item.description}
                                            </p>

                                            <div className="space-y-1 mb-4">
                                                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                                    <UserIcon className="w-3 h-3 mr-1 text-primary-500" />
                                                    <span className="font-medium">Vendido por:</span>
                                                    <span className="ml-1 text-gray-900 dark:text-gray-200">{item.teacher_name || item.group_name || 'Profesor'}</span>
                                                </div>
                                                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                                    <Calendar className="w-3 h-3 mr-1 text-primary-500" />
                                                    <span>{item.sale_date}</span>
                                                </div>
                                                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                                    <Clock className="w-3 h-3 mr-1 text-primary-500" />
                                                    <span>{item.pickup_time} - {item.end_time}</span>
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    <span className="font-medium">Raciones disponibles:</span>
                                                    <span className="ml-1 font-bold text-primary-600">{item.rations}</span>
                                                </div>
                                            </div>

                                            <div className="mb-4">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Alérgenos</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {item.allergens.length > 0 ? item.allergens.map(allergen => {
                                                        const Icon = ALLERGEN_ICONS[allergen] || AlertTriangle;
                                                        return (
                                                            <div key={allergen} className="group relative flex flex-col items-center" title={allergen}>
                                                                <div className="p-1 bg-gray-50 dark:bg-gray-700 rounded-md group-hover:bg-primary-50 dark:group-hover:bg-primary-900 transition-colors">
                                                                    <Icon className="w-3 h-3 text-gray-600 dark:text-gray-300 group-hover:text-primary-600" />
                                                                </div>
                                                            </div>
                                                        );
                                                    }) : (
                                                        <span className="text-[10px] text-gray-400 italic">Sin alérgenos</span>
                                                    )}
                                                </div>
                                            </div>

                                            {cartItem ? (
                                                <div className="flex items-center justify-between bg-primary-50 dark:bg-primary-900/20 p-1.5 rounded-lg border border-primary-200 dark:border-primary-800">
                                                    <button 
                                                        onClick={() => updateQuantity(item.id, -1)}
                                                        className="p-1 text-primary-600 hover:bg-primary-100 dark:hover:bg-primary-800 rounded-md transition-colors"
                                                    >
                                                        <Minus className="w-4 h-4" />
                                                    </button>
                                                    <span className="font-bold text-xs text-primary-800 dark:text-primary-200">
                                                        {cartItem.quantity}
                                                    </span>
                                                    <button 
                                                        onClick={() => updateQuantity(item.id, 1)}
                                                        disabled={cartItem.quantity >= item.rations}
                                                        className="p-1 text-primary-600 hover:bg-primary-100 dark:hover:bg-primary-800 rounded-md transition-colors disabled:opacity-50"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : isSoldOut ? (
                                                <div className="w-full py-2 px-3 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg font-bold text-xs text-center border border-gray-200 dark:border-gray-600">
                                                    Agotado
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={() => addToCart(item)}
                                                    className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2 px-3 rounded-lg font-bold text-xs transition-colors shadow-md shadow-primary-200 dark:shadow-none"
                                                >
                                                    Añadir
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            ))}

            {groupedItems.length === 0 && (
                <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-xl text-gray-500 dark:text-gray-400 font-medium">No hay platos disponibles para reservar en este momento.</p>
                </div>
            )}

            {isCartOpen && (
                <CartModal 
                    cart={cart} 
                    onClose={() => setIsCartOpen(false)} 
                    onConfirm={handleConfirmReservation}
                    isSubmitting={isSubmitting}
                    currentUser={currentUser}
                    updateQuantity={updateQuantity}
                    removeFromCart={removeFromCart}
                />
            )}

            {isSuccessOpen && (
                <Modal isOpen={true} onClose={() => setIsSuccessOpen(false)} title="¡Reserva Confirmada!">
                    <div className="text-center py-8">
                        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">¡Gracias por tu reserva!</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Hemos registrado tu pedido correctamente. Te hemos enviado un correo electrónico con los detalles de tu compra y las instrucciones de recogida.
                        </p>
                        <button 
                            onClick={() => setIsSuccessOpen(false)} 
                            className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-xl font-bold transition-colors shadow-lg shadow-primary-200 dark:shadow-none"
                        >
                            Volver al catálogo
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

const CartModal: React.FC<{
    cart: CartItem[], 
    onClose: () => void, 
    onConfirm: (details: any) => void,
    isSubmitting: boolean,
    currentUser: any,
    updateQuantity: (id: string, delta: number) => void,
    removeFromCart: (id: string) => void
}> = ({ cart, onClose, onConfirm, isSubmitting, currentUser, updateQuantity, removeFromCart }) => {
    const [name, setName] = useState(currentUser?.name || '');
    const [email, setEmail] = useState(currentUser?.email || '');
    const [phone, setPhone] = useState(currentUser?.phone || '');
    const [notes, setNotes] = useState('');
    const [userAllergens, setUserAllergens] = useState<string[]>([]);

    const total = cart.reduce((sum, item) => sum + (item.saleItem.price * item.quantity), 0);

    const conflictingAllergens = useMemo(() => {
        const conflicts = new Set<string>();
        cart.forEach(cartItem => {
            cartItem.saleItem.allergens.forEach(a => {
                if (userAllergens.includes(a)) {
                    conflicts.add(a);
                }
            });
        });
        return Array.from(conflicts);
    }, [cart, userAllergens]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm({ name, email, phone, notes, allergens: userAllergens });
    };

    if (cart.length === 0) {
        return (
            <Modal isOpen={true} onClose={onClose} title="Tu Carrito">
                <div className="text-center py-8">
                    <ShoppingCart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">Tu carrito está vacío.</p>
                    <button onClick={onClose} className="mt-6 bg-primary-600 text-white px-6 py-2 rounded-lg font-medium">
                        Volver al catálogo
                    </button>
                </div>
            </Modal>
        );
    }

    return (
        <Modal isOpen={true} onClose={onClose} title="Completar Reserva">
            <div className="max-h-[80vh] overflow-y-auto pr-2">
                <div className="mb-6 space-y-4">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white border-b pb-2">Resumen de tu pedido</h3>
                    {cart.map(item => (
                        <div key={item.saleItem.id} className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                            <div className="flex-1">
                                <h4 className="font-bold text-gray-900 dark:text-white">{item.saleItem.name}</h4>
                                <p className="text-sm text-gray-500">{item.saleItem.price.toFixed(2)} € x {item.quantity}</p>
                            </div>
                            <div className="flex items-center space-x-3">
                                <div className="flex items-center bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                                    <button onClick={() => updateQuantity(item.saleItem.id, -1)} className="p-1 text-gray-500 hover:text-primary-600">
                                        <Minus className="w-4 h-4" />
                                    </button>
                                    <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                                    <button 
                                        onClick={() => updateQuantity(item.saleItem.id, 1)} 
                                        disabled={item.quantity >= item.saleItem.rations}
                                        className="p-1 text-gray-500 hover:text-primary-600 disabled:opacity-50"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                                <button onClick={() => removeFromCart(item.saleItem.id)} className="text-red-500 hover:text-red-700 p-1">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                    <div className="flex justify-between items-center pt-4 border-t">
                        <span className="font-bold text-lg text-gray-900 dark:text-white">Total:</span>
                        <span className="font-bold text-2xl text-primary-600">{total.toFixed(2)} €</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl space-y-4 border border-gray-100 dark:border-gray-700">
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white">Tus Datos</h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre completo *</label>
                            <input 
                                type="text" 
                                required 
                                value={name} 
                                onChange={e => setName(e.target.value)}
                                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-primary-500"
                                placeholder="Ej. Juan Pérez"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Correo electrónico *</label>
                            <input 
                                type="email" 
                                required 
                                value={email} 
                                onChange={e => setEmail(e.target.value)}
                                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-primary-500"
                                placeholder="Ej. juan@ejemplo.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Teléfono de contacto *</label>
                            <input 
                                type="tel" 
                                required 
                                value={phone} 
                                onChange={e => setPhone(e.target.value)}
                                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-primary-500"
                                placeholder="Ej. 600 123 456"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Comentarios (Opcional)</label>
                            <textarea 
                                value={notes} 
                                onChange={e => setNotes(e.target.value)}
                                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-primary-500"
                                placeholder="Alguna indicación especial para la recogida..."
                                rows={2}
                            />
                        </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">Intolerancias y Alergias</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Selecciona los alérgenos que no puedes consumir:</p>
                        <AllergenSelector selected={userAllergens} onChange={setUserAllergens} />
                        
                        {conflictingAllergens.length > 0 && (
                            <div className="mt-6 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-lg">
                                <div className="flex items-start">
                                    <AlertTriangle className="h-6 w-6 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="text-sm font-bold text-red-800 dark:text-red-300">¡Advertencia de Alérgenos!</h4>
                                        <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                                            Has seleccionado productos que contienen alérgenos a los que eres intolerante: <strong className="font-extrabold">{conflictingAllergens.join(', ')}</strong>.
                                        </p>
                                        <p className="text-sm text-red-700 dark:text-red-400 mt-2">
                                            Puedes enviar la reserva e intentaremos tenerlo en cuenta, pero <strong className="underline">NO SE GARANTIZA</strong> el cambio o adaptación de estos productos.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="px-5 py-2.5 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-primary-200 dark:shadow-none disabled:opacity-70 flex items-center"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                                    Procesando...
                                </>
                            ) : 'Confirmar Reserva'}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};
