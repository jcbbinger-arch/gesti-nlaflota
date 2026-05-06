import React, { createContext, useContext, useMemo, useEffect, useState } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { handleFirestoreError } from '../utils/firebaseErrors';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import { initialData } from '../services/dataService';
import { demoData } from '../services/demoDataService';
import { 
    User, Product, Supplier, AppEvent, Order, Incident, 
    TrainingCycle, Module, Group, Assignment, Recipe, StockItem, Sale, Message,
    Classroom, ClassroomProduct, ClassroomSupplier, ClassroomEvent, ClassroomOrder,
    ServiceGroup, Service, WorkspaceSettings, SaleItem, Reservation,
    DiningService, DiningReservation, StockReception, Transfer, SUPER_USER_EMAILS,
    AcademicYear, SupplierReception
} from '../types';
import { logAudit } from '../utils/auditLogger';

export interface DataContextType {
    users: User[];
    products: Product[];
    suppliers: Supplier[];
    events: AppEvent[];
    orders: Order[];
    incidents: Incident[];
    training_cycles: TrainingCycle[];
    modules: Module[];
    groups: Group[];
    assignments: Assignment[];
    recipes: Recipe[];
    sales: Sale[];
    sale_items: SaleItem[];
    reservations: Reservation[];
    mini_economato_stock: StockItem[];
    messages: Message[];
    classrooms: Classroom[];
    classroom_products: ClassroomProduct[];
    classroom_suppliers: ClassroomSupplier[];
    classroom_events: ClassroomEvent[];
    classroom_orders: ClassroomOrder[];
    service_groups: ServiceGroup[];
    services: Service[];
    transfers: Transfer[];
    dining_services: DiningService[];
    dining_reservations: DiningReservation[];
    stock_receptions: StockReception[];
    supplier_receptions: SupplierReception[];
    academic_years: AcademicYear[];
    selectedYearId: string | null;
    setSelectedYearId: (id: string | null) => void;
    isPastYear: boolean;
    workspaceSettings: WorkspaceSettings | null;
    setUsers: (data: User[] | ((prev: User[]) => User[])) => void;
    setProducts: (data: Product[] | ((prev: Product[]) => Product[])) => void;
    setSuppliers: (data: Supplier[] | ((prev: Supplier[]) => Supplier[])) => void;
    setEvents: (data: AppEvent[] | ((prev: AppEvent[]) => AppEvent[])) => void;
    setOrders: (data: Order[] | ((prev: Order[]) => Order[])) => void;
    setIncidents: (data: Incident[] | ((prev: Incident[]) => Incident[])) => void;
    setTrainingCycles: (data: TrainingCycle[] | ((prev: TrainingCycle[]) => TrainingCycle[])) => void;
    setModules: (data: Module[] | ((prev: Module[]) => Module[])) => void;
    setGroups: (data: Group[] | ((prev: Group[]) => Group[])) => void;
    setAssignments: (data: Assignment[] | ((prev: Assignment[]) => Assignment[])) => void;
    setRecipes: (data: Recipe[] | ((prev: Recipe[]) => Recipe[])) => void;
    setSales: (data: Sale[] | ((prev: Sale[]) => Sale[])) => void;
    setSaleItems: (data: SaleItem[] | ((prev: SaleItem[]) => SaleItem[])) => void;
    setReservations: (data: Reservation[] | ((prev: Reservation[]) => Reservation[])) => void;
    setMiniEconomatoStock: (data: StockItem[] | ((prev: StockItem[]) => StockItem[])) => void;
    setMessages: (data: Message[] | ((prev: Message[]) => Message[])) => void;
    setClassrooms: (data: Classroom[] | ((prev: Classroom[]) => Classroom[])) => void;
    setClassroomProducts: (data: ClassroomProduct[] | ((prev: ClassroomProduct[]) => ClassroomProduct[])) => void;
    setClassroomSuppliers: (data: ClassroomSupplier[] | ((prev: ClassroomSupplier[]) => ClassroomSupplier[])) => void;
    setClassroomEvents: (data: ClassroomEvent[] | ((prev: ClassroomEvent[]) => ClassroomEvent[])) => void;
    setClassroomOrders: (data: ClassroomOrder[] | ((prev: ClassroomOrder[]) => ClassroomOrder[])) => void;
    setServiceGroups: (data: ServiceGroup[] | ((prev: ServiceGroup[]) => ServiceGroup[])) => void;
    setServices: (data: Service[] | ((prev: Service[]) => Service[])) => void;
    setTransfers: (data: Transfer[] | ((prev: Transfer[]) => Transfer[])) => void;
    setDiningServices: (data: DiningService[] | ((prev: DiningService[]) => DiningService[])) => void;
    setDiningReservations: (data: DiningReservation[] | ((prev: DiningReservation[]) => DiningReservation[])) => void;
    setStockReceptions: (data: StockReception[] | ((prev: StockReception[]) => StockReception[])) => void;
    setSupplierReceptions: (data: SupplierReception[] | ((prev: SupplierReception[]) => SupplierReception[])) => void;
    setAcademicYears: (data: AcademicYear[] | ((prev: AcademicYear[]) => AcademicYear[])) => void;
    setWorkspaceSettings: (settings: WorkspaceSettings) => void;
    loadDemoData: () => Promise<void>;
    seedInitialData: () => Promise<void>;
}

export const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [users, setUsersState] = useState<User[]>([]);
    const [products, setProductsState] = useState<Product[]>([]);
    const [suppliers, setSuppliersState] = useState<Supplier[]>([]);
    const [events, setEventsState] = useState<AppEvent[]>([]);
    const [orders, setOrdersState] = useState<Order[]>([]);
    const [incidents, setIncidentsState] = useState<Incident[]>([]);
    const [training_cycles, setTrainingCyclesState] = useState<TrainingCycle[]>([]);
    const [modules, setModulesState] = useState<Module[]>([]);
    const [groups, setGroupsState] = useState<Group[]>([]);
    const [assignments, setAssignmentsState] = useState<Assignment[]>([]);
    const [recipes, setRecipesState] = useState<Recipe[]>([]);
    const [sales, setSalesState] = useState<Sale[]>([]);
    const [sale_items, setSaleItemsState] = useState<SaleItem[]>([]);
    const [reservations, setReservationsState] = useState<Reservation[]>([]);
    const [supplier_receptions, setSupplierReceptionsState] = useState<SupplierReception[]>([]);
    const [mini_economato_stock, setMiniEconomatoStockState] = useState<StockItem[]>([]);
    const [messages, setMessagesState] = useState<Message[]>([]);
    const [classrooms, setClassroomsState] = useState<Classroom[]>([]);
    const [classroom_products, setClassroomProductsState] = useState<ClassroomProduct[]>([]);
    const [classroom_suppliers, setClassroomSuppliersState] = useState<ClassroomSupplier[]>([]);
    const [classroom_events, setClassroomEventsState] = useState<ClassroomEvent[]>([]);
    const [classroom_orders, setClassroomOrdersState] = useState<ClassroomOrder[]>([]);
    const [service_groups, setServiceGroupsState] = useState<ServiceGroup[]>([]);
    const [services, setServicesState] = useState<Service[]>([]);
    const [transfers, setTransfersState] = useState<Transfer[]>([]);
    const [dining_services, setDiningServicesState] = useState<DiningService[]>([]);
    const [dining_reservations, setDiningReservationsState] = useState<DiningReservation[]>([]);
    const [stock_receptions, setStockReceptionsState] = useState<StockReception[]>([]);
    const [academic_years, setAcademicYearsState] = useState<AcademicYear[]>([]);
    const [selectedYearId, setSelectedYearId] = useState<string | null>(null);
    const [workspaceSettings, setWorkspaceSettingsState] = useState<WorkspaceSettings | null>(null);
    const { currentUser } = useAuth();

    useEffect(() => {
        // Public collections (accessible without login)
        const publicCollections: { name: string, setter: (data: any) => void }[] = [
            { name: 'sale_items', setter: setSaleItemsState },
        ];

        const publicUnsubscribes = publicCollections.map(col => {
            return onSnapshot(collection(db, col.name), (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                col.setter(data);
            }, (error) => {
                console.error(`Error listening to public ${col.name}:`, error);
                handleFirestoreError(error, 'list', col.name);
            });
        });

        if (!currentUser) {
            console.log('DataProvider - No user, skipping private listeners');
            return () => {
                publicUnsubscribes.forEach(unsub => unsub());
            };
        }

        const collections: { name: string, setter: (data: any) => void }[] = [
            { name: 'users', setter: setUsersState },
            { name: 'products', setter: setProductsState },
            { name: 'suppliers', setter: setSuppliersState },
            { name: 'events', setter: setEventsState },
            { name: 'orders', setter: setOrdersState },
            { name: 'incidents', setter: setIncidentsState },
            { name: 'training_cycles', setter: setTrainingCyclesState },
            { name: 'modules', setter: setModulesState },
            { name: 'groups', setter: setGroupsState },
            { name: 'assignments', setter: setAssignmentsState },
            { name: 'recipes', setter: setRecipesState },
            { name: 'sales', setter: setSalesState },
            // sale_items is now public
            { name: 'reservations', setter: setReservationsState },
            { name: 'mini_economato_stock', setter: setMiniEconomatoStockState },
            { name: 'messages', setter: setMessagesState },
            { name: 'classrooms', setter: setClassroomsState },
            { name: 'classroom_products', setter: setClassroomProductsState },
            { name: 'classroom_suppliers', setter: setClassroomSuppliersState },
            { name: 'classroom_events', setter: setClassroomEventsState },
            { name: 'classroom_orders', setter: setClassroomOrdersState },
            { name: 'service_groups', setter: setServiceGroupsState },
            { name: 'services', setter: setServicesState },
            { name: 'transfers', setter: setTransfersState },
            { name: 'dining_services', setter: setDiningServicesState },
            { name: 'dining_reservations', setter: setDiningReservationsState },
            { name: 'stock_receptions', setter: setStockReceptionsState },
            { name: 'supplier_receptions', setter: setSupplierReceptionsState },
            { name: 'academic_years', setter: setAcademicYearsState },
        ];

        const unsubscribes = collections.map(col => {
            return onSnapshot(collection(db, col.name), (snapshot) => {
                let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                // Sanitize users
                if (col.name === 'users') {
                    data = data.map((d: any) => ({
                        ...d,
                        profiles: Array.isArray(d.profiles) ? d.profiles : [],
                        access_profiles: d.access_profiles || {},
                        activity_status: d.activity_status || 'Activo',
                        location_status: d.location_status || 'Fuera del centro'
                    }));
                }

                col.setter(data);
            }, (error) => {
                console.error(`Error listening to ${col.name}:`, error);
                handleFirestoreError(error, 'list', col.name);
            });
        });

        let unsubWorkspaceSettings: () => void;
        if (currentUser.workspaceId) {
            unsubWorkspaceSettings = onSnapshot(doc(db, 'workspace_settings', currentUser.workspaceId), (docSnap) => {
                if (docSnap.exists()) {
                    setWorkspaceSettingsState(docSnap.data() as WorkspaceSettings);
                } else {
                    setWorkspaceSettingsState(null);
                }
            }, (error) => {
                console.error("Error listening to workspace_settings:", error);
            });
        }

        return () => {
            publicUnsubscribes.forEach(unsub => unsub());
            unsubscribes.forEach(unsub => unsub());
            if (unsubWorkspaceSettings) unsubWorkspaceSettings();
        };
    }, [currentUser]);

    // Cleanup script for bugged user (pablo.palazon@murciaeduca.es)
    useEffect(() => {
        if (!currentUser) return;
        const targetEmail = 'pablo.palazon@murciaeduca.es';
        const userToDelete = users.find(u => u.email === targetEmail);
        if (userToDelete) {
            console.warn('LIMPIEZA AUTOMÁTICA: Eliminando registro bugueado de:', targetEmail);
            deleteDoc(doc(db, 'users', userToDelete.id))
                .then(() => console.log('Registro eliminado con éxito. El usuario puede volver a entrar.'))
                .catch(err => console.error('Error en limpieza:', err));
        }
    }, [users, currentUser]);

    const updateCollection = async (collectionName: string, data: any[] | ((prev: any[]) => any[]), currentState: any[]) => {
        const newData = typeof data === 'function' ? data(currentState) : data;
        
        const currentIds = new Map(currentState.map(item => [item.id, item]));
        const newIds = new Set(newData.map(item => item.id));
        
        const deletedIds = currentState.filter(item => !newIds.has(item.id)).map(item => item.id);
        const itemsToUpdate = newData.filter(item => {
            const currentItem = currentIds.get(item.id);
            if (!currentItem) return true; // New item
            // Simple comparison for changes
            return JSON.stringify(item) !== JSON.stringify(currentItem);
        });

        if (deletedIds.length === 0 && itemsToUpdate.length === 0) return;

        // Trigger audit logs for changed items
        for (const op of [
            ...deletedIds.map(id => ({ type: 'DELETE' as const, id })),
            ...itemsToUpdate.map(item => ({ type: 'UPDATE' as const, id: item.id }))
        ]) {                
            logAudit(collectionName, op.id, op.type, {}); 
        }

        try {
            // Firestore batch limit is 500 operations
            const allOps = [
                ...deletedIds.map(id => ({ type: 'delete' as const, id })),
                ...itemsToUpdate.map(item => ({ type: 'set' as const, item }))
            ];

            for (let i = 0; i < allOps.length; i += 500) {
                const chunk = allOps.slice(i, i + 500);
                const batch = writeBatch(db);
                for (const op of chunk) {
                    if (op.type === 'delete') {
                        batch.delete(doc(db, collectionName, op.id!));
                    } else {
                        batch.set(doc(db, collectionName, op.item!.id), op.item, { merge: true });
                    }
                }
                await batch.commit();
            }
        } catch (err) {
            console.error(`Failed to update ${collectionName}:`, err);
            handleFirestoreError(err, 'write', collectionName);
        }
    };

    const setUsers = (data: any) => updateCollection('users', data, users);
    const setProducts = (data: any) => updateCollection('products', data, products);
    const setSuppliers = (data: any) => updateCollection('suppliers', data, suppliers);
    const setEvents = (data: any) => updateCollection('events', data, events);
    const setOrders = (data: any) => updateCollection('orders', data, orders);
    const setIncidents = (data: any) => updateCollection('incidents', data, incidents);
    const setTrainingCycles = (data: any) => updateCollection('training_cycles', data, training_cycles);
    const setModules = (data: any) => updateCollection('modules', data, modules);
    const setGroups = (data: any) => updateCollection('groups', data, groups);
    const setAssignments = (data: any) => updateCollection('assignments', data, assignments);
    const setRecipes = (data: any) => updateCollection('recipes', data, recipes);
    const setSales = (data: any) => updateCollection('sales', data, sales);
    const setSaleItems = (data: any) => updateCollection('sale_items', data, sale_items);
    const setReservations = (data: any) => updateCollection('reservations', data, reservations);
    const setMiniEconomatoStock = (data: any) => updateCollection('mini_economato_stock', data, mini_economato_stock);
    const setMessages = (data: any) => updateCollection('messages', data, messages);
    const setClassrooms = (data: any) => updateCollection('classrooms', data, classrooms);
    const setClassroomProducts = (data: any) => updateCollection('classroom_products', data, classroom_products);
    const setClassroomSuppliers = (data: any) => updateCollection('classroom_suppliers', data, classroom_suppliers);
    const setClassroomEvents = (data: any) => updateCollection('classroom_events', data, classroom_events);
    const setClassroomOrders = (data: any) => updateCollection('classroom_orders', data, classroom_orders);
    const setServiceGroups = (data: any) => updateCollection('service_groups', data, service_groups);
    const setServices = (data: any) => updateCollection('services', data, services);
    const setTransfers = (data: any) => updateCollection('transfers', data, transfers);
    const setDiningServices = (data: any) => updateCollection('dining_services', data, dining_services);
    const setDiningReservations = (data: any) => updateCollection('dining_reservations', data, dining_reservations);
    const setStockReceptions = (data: any) => updateCollection('stock_receptions', data, stock_receptions);
    const setSupplierReceptions = (data: any) => updateCollection('supplier_receptions', data, supplier_receptions);
    const setAcademicYears = (data: any) => updateCollection('academic_years', data, academic_years);

    const setWorkspaceSettings = async (settings: WorkspaceSettings) => {
        if (!currentUser?.workspaceId) return;
        try {
            await setDoc(doc(db, 'workspace_settings', currentUser.workspaceId), settings, { merge: true });
        } catch (err) {
            console.error("Failed to update workspace_settings:", err);
        }
    };

    const seedData = async (data: any) => {
        for (const key of Object.keys(data)) {
            const items = data[key];
            if (Array.isArray(items) && items.length > 0) {
                try {
                    const promises = items.map(item => {
                        if (item.id) {
                            return setDoc(doc(db, key, item.id), item, { merge: true });
                        }
                        return Promise.resolve();
                    });
                    await Promise.all(promises);
                } catch (err) {
                    console.error(`Failed to seed ${key}:`, err);
                }
            }
        }
    };

    const loadDemoData = () => seedData(demoData);
    const seedInitialData = () => seedData(initialData);

    const filteredUsers = useMemo(() => users.filter(u => !SUPER_USER_EMAILS.includes(u.email)), [users]);

    const activeYearId = useMemo(() => {
        if (selectedYearId) return selectedYearId;
        return academic_years.find(y => y.is_active)?.id || null;
    }, [selectedYearId, academic_years]);

    // Update selectedYearId when active year is found if not set
    useEffect(() => {
        if (!selectedYearId && academic_years.length > 0) {
            const active = academic_years.find(y => y.is_active);
            if (active) setSelectedYearId(active.id);
        }
    }, [academic_years, selectedYearId]);

    const filteredEvents = useMemo(() => 
        events.filter(e => !activeYearId || e.academic_year_id === activeYearId),
    [events, activeYearId]);

    const filteredOrders = useMemo(() => 
        orders.filter(o => !activeYearId || o.academic_year_id === activeYearId),
    [orders, activeYearId]);

    const filteredReservations = useMemo(() => 
        reservations.filter(r => !activeYearId || r.academic_year_id === activeYearId),
    [reservations, activeYearId]);

    const filteredDiningServices = useMemo(() => 
        dining_services.filter(s => !activeYearId || s.academic_year_id === activeYearId),
    [dining_services, activeYearId]);

    const filteredSales = useMemo(() => 
        sales.filter(s => !activeYearId || s.academic_year_id === activeYearId),
    [sales, activeYearId]);

    const filteredSaleItems = useMemo(() => 
        sale_items.filter(s => !activeYearId || s.academic_year_id === activeYearId),
    [sale_items, activeYearId]);

    const isPastYear = useMemo(() => {
        if (!selectedYearId) return false;
        const year = academic_years.find(y => y.id === selectedYearId);
        return year ? !year.is_active : false;
    }, [selectedYearId, academic_years]);

    const value: DataContextType = useMemo(() => ({
        users: filteredUsers, products, suppliers, 
        events: filteredEvents, 
        orders: filteredOrders, 
        incidents, 
        training_cycles, modules, groups, assignments, recipes, 
        sales: filteredSales, 
        mini_economato_stock, messages,
        classrooms, classroom_products, classroom_suppliers, classroom_events, classroom_orders,
        service_groups, services, transfers, workspaceSettings, 
        sale_items: filteredSaleItems, 
        reservations: filteredReservations,
        dining_services: filteredDiningServices, 
        dining_reservations, stock_receptions,
        supplier_receptions,
        academic_years, selectedYearId, setSelectedYearId, isPastYear,
        setUsers, setProducts, setSuppliers, setEvents, setOrders, setIncidents,
        setTrainingCycles, setModules, setGroups, setAssignments, setRecipes, setSales,
        setSaleItems, setReservations,
        setMiniEconomatoStock, setMessages, setClassrooms, setClassroomProducts,
        setClassroomSuppliers, setClassroomEvents, setClassroomOrders,
        setServiceGroups, setServices, setTransfers, setDiningServices, setDiningReservations, 
        setStockReceptions, setSupplierReceptions, setAcademicYears, setWorkspaceSettings,
        loadDemoData, seedInitialData
    }), [
        filteredUsers, products, suppliers, filteredEvents, filteredOrders, incidents, 
        training_cycles, modules, groups, assignments, recipes, filteredSales, mini_economato_stock, messages,
        classrooms, classroom_products, classroom_suppliers, classroom_events, classroom_orders,
        service_groups, services, transfers, workspaceSettings, filteredSaleItems, filteredReservations,
        filteredDiningServices, dining_reservations, stock_receptions, supplier_receptions, academic_years, selectedYearId, isPastYear
    ]);

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};
