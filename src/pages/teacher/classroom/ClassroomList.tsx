import React, { useState, useMemo, useEffect, useCallback, createContext, useContext } from 'react';
import { useData, DataContext, DataContextType } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { Card } from '../../../components/Card';
import { Modal } from '../../../components/Modal';
import { PlusIcon, DownloadIcon, UploadIcon, TrashIcon, PencilIcon, KeyIcon, SignatureIcon, ChartIcon, UsersIcon, ProductIcon, EventIcon, HistoryIcon } from '../../../components/icons';
import { Classroom, User, Profile, getProfileDisplayName, AppData, Product, Supplier, Order } from '../../../types';
import { useLocalStorage } from '../../../hooks/useLocalStorage';

// --- DATA PROVIDER FOR SANDBOXED ENVIRONMENT ---
const SandboxedClassroomProvider: React.FC<{ classroom_id: string; children: React.ReactNode }> = ({ classroom_id, children }) => {
    const globalData = useData();
    const dataKey = `classroom-data-${classroom_id}`;

    const [sandboxedData, setSandboxedData] = useLocalStorage<Pick<AppData, 'products' | 'suppliers' | 'orders' | 'events'>>(dataKey, {
        products: [],
        suppliers: [],
        orders: [],
        events: [],
    });

    const value: DataContextType = useMemo(() => ({
        ...globalData,
        products: sandboxedData.products,
        suppliers: sandboxedData.suppliers,
        orders: sandboxedData.orders,
        events: sandboxedData.events,
        setProducts: (action) => setSandboxedData(prev => ({ ...prev, products: typeof action === 'function' ? action(prev.products) : action })),
        setSuppliers: (action) => setSandboxedData(prev => ({ ...prev, suppliers: typeof action === 'function' ? action(prev.suppliers) : action })),
        setOrders: (action) => setSandboxedData(prev => ({ ...prev, orders: typeof action === 'function' ? action(prev.orders) : action })),
        setEvents: (action) => setSandboxedData(prev => ({ ...prev, events: typeof action === 'function' ? action(prev.events) : action })),
    }), [globalData, sandboxedData, setSandboxedData]);

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

// --- TAB COMPONENTS ---

const DashboardTab: React.FC<{ classroom: Classroom, setActiveTab: (tab: string) => void }> = ({ classroom, setActiveTab }) => {
    const { users } = useData(); // Global users
    const sandboxedData = useData(); // Sandboxed data
    
    const studentCount = useMemo(() => users.filter(u => u.classroom_id === classroom.id).length, [users, classroom.id]);
    const activePractice = useMemo(() => sandboxedData.events.find(e => new Date(e.end_date) > new Date()), [sandboxedData.events]);
    const submittedOrders = useMemo(() => activePractice ? sandboxedData.orders.filter(o => o.event_id === activePractice.id).length : 0, [sandboxedData.orders, activePractice]);

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg text-center">
                    <p className="text-sm text-gray-500">Nº de Alumnos</p>
                    <p className="text-2xl font-bold">{studentCount}</p>
                </div>
                 <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg text-center">
                    <p className="text-sm text-gray-500">Nº de Productos Ficticios</p>
                    <p className="text-2xl font-bold">{sandboxedData.products.length}</p>
                </div>
                 <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg text-center">
                    <p className="text-sm text-gray-500">Nº de Proveedores Ficticios</p>
                    <p className="text-2xl font-bold">{sandboxedData.suppliers.length}</p>
                </div>
            </div>
             <Card title="Práctica Activa">
                {activePractice ? (
                    <div>
                        <h3 className="font-bold">{activePractice.name}</h3>
                        <p>Finaliza: {new Date(activePractice.end_date).toLocaleString()}</p>
                        <p>{submittedOrders} pedidos de alumnos enviados.</p>
                    </div>
                ) : <p>No hay ninguna práctica activa en este momento.</p>}
            </Card>
             <Card title="Accesos Rápidos" className="mt-6">
                <div className="flex space-x-4">
                     <button onClick={() => setActiveTab('students')} className="bg-blue-500 text-white py-2 px-4 rounded-md">Gestionar Alumnos</button>
                     <button onClick={() => setActiveTab('practices')} className="bg-green-500 text-white py-2 px-4 rounded-md">Crear Nueva Práctica</button>
                </div>
            </Card>
        </div>
    );
};

const StudentManagerTab: React.FC<{ classroom: Classroom }> = ({ classroom }) => {
    // Student Manager needs global user data
    const { users, setUsers } = useData();
    const { impersonateUser } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<User | null>(null);

    const students = useMemo(() => users.filter(u => u.classroom_id === classroom.id), [users, classroom.id]);
    
    const handleOpenModal = (student: User | null = null) => {
        setSelectedStudent(student);
        setIsModalOpen(true);
    };

    const handleSaveStudent = (studentData: Partial<User>) => {
        if (selectedStudent) { // Editing
            setUsers(users.map(u => u.id === selectedStudent.id ? { ...u, ...studentData, password: studentData.password || u.password } : u));
        } else { // Creating
            const newStudent: User = {
                id: `student-${Date.now()}`, name: studentData.name || '', email: studentData.email || '',
                password: studentData.password || 'password', avatar: `https://i.pravatar.cc/150?u=${studentData.email}`,
                profiles: [Profile.STUDENT], activity_status: 'Activo', location_status: 'En el centro',
                classroom_id: classroom.id, student_simulated_profile: studentData.student_simulated_profile,
            };
            setUsers(prevUsers => [...prevUsers, newStudent]);
        }
        setIsModalOpen(false);
    };
    
    const handleDeleteStudent = (student: User) => {
        if (window.confirm(`¿Seguro que quieres eliminar al alumno ${student.name}? Esta acción no se puede deshacer.`)) {
            setUsers(users.filter(u => u.id !== student.id));
        }
    };
    
    return (
        <div>
             <div className="flex justify-end mb-4">
                <button onClick={() => handleOpenModal()} className="no-print bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 flex items-center">
                    <PlusIcon className="w-5 h-5 mr-1" /> Añadir Alumno
                </button>
            </div>
            <table className="w-full text-sm">
                <thead><tr><th className="text-left p-2">Nombre</th><th className="text-left p-2">Email</th><th className="text-left p-2">Rol Simulado</th><th className="text-left p-2">Acciones</th></tr></thead>
                <tbody>
                    {students.map(student => (
                        <tr key={student.id} className="border-t">
                            <td className="p-2">{student.name}</td>
                            <td className="p-2">{student.email}</td>
                            <td className="p-2">{student.student_simulated_profile ? getProfileDisplayName(student.student_simulated_profile, 'student_simulation') : 'Sin Asignar'}</td>
                            <td className="p-2 space-x-2">
                                <button onClick={() => impersonateUser(student)} title="Suplantar" className="text-yellow-600 p-1 inline-block hover:scale-110 transition-transform"><SignatureIcon className="w-4 h-4"/></button>
                                <button onClick={() => handleOpenModal(student)} title="Editar" className="text-blue-600 p-1 inline-block hover:scale-110 transition-transform"><PencilIcon className="w-4 h-4"/></button>
                                <button onClick={() => handleDeleteStudent(student)} title="Eliminar" className="text-red-600 p-1 inline-block hover:scale-110 transition-transform"><TrashIcon className="w-4 h-4"/></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
             {isModalOpen && <StudentFormModal student={selectedStudent} onClose={() => setIsModalOpen(false)} onSave={handleSaveStudent} />}
        </div>
    );
};

const CatalogManagerTab: React.FC<{ classroom: Classroom }> = ({ classroom }) => {
    const { products, setProducts, suppliers, setSuppliers } = useData(); // Sandboxed data
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [subTab, setSubTab] = useState<'products' | 'suppliers'>('products');

    const handleSaveProduct = (data: Partial<Product>) => {
        if(selectedProduct) {
            setProducts(products.map(p => p.id === selectedProduct.id ? {...p, ...data} : p));
        } else {
            // FIX: Removed invalid 'price' property and ensured all required properties of 'Product' are present.
            const newProduct: Product = {
                id: `cprod-${Date.now()}`,
                name: data.name!,
                unit: data.unit!,
                description: data.description || '',
                reference: data.reference || '',
                suppliers: [],
                tax: 0,
                category: '',
                family: '',
                allergens: [],
                status: 'Activo'
            };
            setProducts([...products, newProduct]);
        }
        setIsProductModalOpen(false);
    };
    
    const handleSaveSupplier = (data: Partial<Supplier>) => {
         if(selectedSupplier) {
            setSuppliers(suppliers.map(s => s.id === selectedSupplier.id ? {...s, ...data} : s));
        } else {
            const newSupplier: Supplier = {
                id: `csupp-${Date.now()}`, name: data.name!, cif: '', address: '', phone: '', email: '', contact_person: '', status: 'Activo'
            };
            setSuppliers([...suppliers, newSupplier]);
        }
        setIsSupplierModalOpen(false);
    };

    return (
        <div>
            {/* Sub-tab navigation */}
            <div className="flex space-x-4 border-b mb-4">
                <button onClick={() => setSubTab('products')} className={`py-2 ${subTab === 'products' ? 'border-b-2 border-primary-500' : ''}`}>Productos</button>
                <button onClick={() => setSubTab('suppliers')} className={`py-2 ${subTab === 'suppliers' ? 'border-b-2 border-primary-500' : ''}`}>Proveedores</button>
            </div>
            
            {subTab === 'products' && (
                <div>
                    <button onClick={() => { setSelectedProduct(null); setIsProductModalOpen(true); }} className="bg-blue-500 text-white px-3 py-1 rounded mb-2">Nuevo Producto</button>
                    <table className="w-full text-sm">
                        {/* Table for products */}
                    </table>
                </div>
            )}
            {subTab === 'suppliers' && (
                <div>
                    <button onClick={() => { setSelectedSupplier(null); setIsSupplierModalOpen(true); }} className="bg-blue-500 text-white px-3 py-1 rounded mb-2">Nuevo Proveedor</button>
                    <table className="w-full text-sm">
                         {/* Table for suppliers */}
                    </table>
                </div>
            )}
            
            {/* Modals will be here */}
        </div>
    );
};

const PracticesTab: React.FC<{ classroom: Classroom }> = () => {
    const { events, setEvents } = useData(); // sandboxed
    // Logic for CRUD on classroom events
    return <p>Gestión de Prácticas (Eventos) - Próximamente</p>;
};

const OrderReviewTab: React.FC<{ classroom: Classroom }> = ({ classroom }) => {
    const { orders, users } = useData(); // Orders are sandboxed, users are global
    const usersMap = useMemo(() => new Map(users.map(u => [u.id, u.name])), [users]);
    // FIX: Correctly filter orders by finding students in the current classroom via their `userId`. The `Order` type does not have `classroomId`.
    const classroomOrders = useMemo(() => {
        const studentIdsInClass = new Set(users.filter(u => u.classroom_id === classroom.id).map(u => u.id));
        return orders.filter(o => studentIdsInClass.has(o.user_id));
    }, [orders, users, classroom.id]);

    return (
        <div>
            <table className="w-full text-sm">
                <thead><tr><th className="text-left p-2">Alumno</th><th className="text-left p-2">Fecha</th><th className="text-left p-2">Nº Items</th><th className="text-left p-2">Estado</th></tr></thead>
                <tbody>
                    {classroomOrders.map(order => (
                        <tr key={order.id} className="border-t">
                            {/* FIX: Use `order.userId` instead of the non-existent `order.studentId`. */}
                            <td className="p-2">{usersMap.get(order.user_id) || 'Desconocido'}</td>
                            <td className="p-2">{new Date(order.date).toLocaleDateString()}</td>
                            <td className="p-2">{order.items.length}</td>
                            <td className="p-2">{order.status}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const ConfigurationTab: React.FC<{ classroom: Classroom }> = ({ classroom }) => {
    const dataKey = `classroom-data-${classroom.id}`;
     const handleReset = () => {
        if (window.confirm("¿Seguro que quieres borrar TODOS los datos de esta aula (productos, proveedores, pedidos...)? Esta acción es irreversible.")) {
            localStorage.removeItem(dataKey);
            alert("Aula reiniciada. Refresca la página para ver los cambios.");
        }
    };
    return (
        <div className="p-4 bg-red-50 dark:bg-red-900/50 rounded-lg flex justify-between items-center mt-6">
            <div>
                <h4 className="font-semibold text-red-700 dark:text-red-300">Zona Peligrosa: Reiniciar Aula</h4>
                <p className="text-xs">Borra permanentemente todos los datos de esta aula.</p>
            </div>
            <button onClick={handleReset} className="bg-red-600 text-white py-1 px-3 rounded-md text-sm flex items-center"><TrashIcon className="w-4 h-4 mr-1"/> Reiniciar</button>
        </div>
    );
};

// --- MODALS ---
const StudentFormModal: React.FC<{ student: User | null; onClose: () => void; onSave: (data: Partial<User>) => void; }> = ({ student, onClose, onSave }) => {
    const [formState, setFormState] = useState({
        name: student?.name || '', email: student?.email || '', password: '',
        student_simulated_profile: student?.student_simulated_profile,
    });
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave({ ...formState, password: formState.password || undefined }); };
    return (
        <Modal isOpen={true} onClose={onClose} title={student ? 'Editar Alumno' : 'Nuevo Alumno'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" name="name" value={formState.name} onChange={e => setFormState({...formState, name: e.target.value})} placeholder="Nombre" required className="w-full p-2 border rounded"/>
                <input type="email" name="email" value={formState.email} onChange={e => setFormState({...formState, email: e.target.value})} placeholder="Email" required className="w-full p-2 border rounded"/>
                <input type="password" name="password" placeholder={student ? "Nueva contraseña (opcional)" : "Contraseña"} onChange={e => setFormState({...formState, password: e.target.value})} required={!student} className="w-full p-2 border rounded"/>
                <select name="student_simulated_profile" value={formState.student_simulated_profile || ''} onChange={e => setFormState({...formState, student_simulated_profile: e.target.value as any})} className="w-full p-2 border rounded">
                    <option value="">-- Rol Simulado --</option>
                    <option value={Profile.TEACHER}>{getProfileDisplayName(Profile.TEACHER, 'student_simulation')}</option>
                    <option value={Profile.ALMACEN}>{getProfileDisplayName(Profile.ALMACEN)}</option>
                </select>
                <div className="flex justify-end"><button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded">Guardar</button></div>
            </form>
        </Modal>
    );
};


// --- MAIN VIEW COMPONENTS ---
const ClassroomManagementView: React.FC<{ classroom: Classroom, onBack: () => void }> = ({ classroom, onBack }) => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const tabs = {
        dashboard: { name: 'Dashboard', icon: <ChartIcon className="w-5 h-5 mr-2"/>, component: <DashboardTab classroom={classroom} setActiveTab={setActiveTab} /> },
        students: { name: 'Alumnos', icon: <UsersIcon className="w-5 h-5 mr-2"/>, component: <StudentManagerTab classroom={classroom} /> },
        catalog: { name: 'Catálogo del Aula', icon: <ProductIcon className="w-5 h-5 mr-2"/>, component: <CatalogManagerTab classroom={classroom} /> },
        practices: { name: 'Prácticas (Eventos)', icon: <EventIcon className="w-5 h-5 mr-2"/>, component: <PracticesTab classroom={classroom} /> },
        review: { name: 'Revisión de Pedidos', icon: <HistoryIcon className="w-5 h-5 mr-2"/>, component: <OrderReviewTab classroom={classroom} /> },
        config: { name: 'Configuración', icon: <PencilIcon className="w-5 h-5 mr-2"/>, component: <ConfigurationTab classroom={classroom} /> }
    };

    return (
         <div>
            <button onClick={onBack} className="text-sm text-primary-600 hover:underline mb-4 no-print">&larr; Volver a la lista de aulas</button>
            <Card title={`Panel de Control: ${classroom.name}`}>
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="-mb-px flex space-x-4 overflow-x-auto" aria-label="Tabs">
                        {Object.entries(tabs).map(([key, { name, icon }]) => (
                            <button key={key} onClick={() => setActiveTab(key)} className={`${activeTab === key ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} flex items-center whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}>
                                {icon} {name}
                            </button>
                        ))}
                    </nav>
                </div>
                <div className="mt-4">
                    {tabs[activeTab as keyof typeof tabs].component}
                </div>
            </Card>
        </div>
    );
};

export const ClassroomList: React.FC = () => {
    const { classrooms } = useData();
    const { currentUser } = useAuth();
    const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);

    const myClassrooms = useMemo(() => classrooms.filter(c => c.tutor_id === currentUser?.id), [classrooms, currentUser]);
    
    // Auto-select if only one classroom
    useEffect(() => {
        if (myClassrooms.length === 1 && !selectedClassroom) {
            setSelectedClassroom(myClassrooms[0]);
        }
    }, [myClassrooms, selectedClassroom]);

    if (selectedClassroom) {
        return (
            <SandboxedClassroomProvider classroom_id={selectedClassroom.id}>
                <ClassroomManagementView 
                    classroom={selectedClassroom}
                    onBack={() => setSelectedClassroom(null)}
                />
            </SandboxedClassroomProvider>
        );
    }
    
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Mis Aulas de Práctica</h1>
            </div>
            
            {myClassrooms.length > 0 ? (
                <Card title="Selecciona un aula para gestionar">
                    <div className="space-y-3">
                        {myClassrooms.map(classroom => (
                            <div key={classroom.id} onClick={() => setSelectedClassroom(classroom)} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg flex justify-between items-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600">
                                <h3 className="font-bold text-lg">{classroom.name}</h3>
                                <button className="bg-primary-600 text-white py-2 px-4 rounded-md">Gestionar</button>
                            </div>
                        ))}
                    </div>
                </Card>
            ) : (
                <Card title="Sin Aulas Asignadas">
                    <p>No tienes ninguna aula de práctica asignada. Contacta con un administrador para que te asigne una.</p>
                </Card>
            )}
        </div>
    );
};
