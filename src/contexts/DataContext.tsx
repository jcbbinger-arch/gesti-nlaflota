import React, { createContext, useContext, useMemo, useEffect, useState } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import { initialData } from '../services/dataService';
import { demoData } from '../services/demoDataService';
import { 
    User, Product, Supplier, Event, Order, Incident, 
    TrainingCycle, Module, Group, Assignment, Recipe, StockItem, Sale, Message,
    Classroom, ClassroomProduct, ClassroomSupplier, ClassroomEvent, ClassroomOrder,
    ServiceGroup, Service, WorkspaceSettings, SaleItem, Reservation,
    DiningService, DiningReservation
} from '../types';

export interface DataContextType {
    users: User[];
    products: Product[];
    suppliers: Supplier[];
    events: Event[];
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
    dining_services: DiningService[];
    dining_reservations: DiningReservation[];
    workspaceSettings: WorkspaceSettings | null;
    setUsers: (data: User[] | ((prev: User[]) => User[])) => void;
    setProducts: (data: Product[] | ((prev: Product[]) => Product[])) => void;
    setSuppliers: (data: Supplier[] | ((prev: Supplier[]) => Supplier[])) => void;
    setEvents: (data: Event[] | ((prev: Event[]) => Event[])) => void;
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
    setDiningServices: (data: DiningService[] | ((prev: DiningService[]) => DiningService[])) => void;
    setDiningReservations: (data: DiningReservation[] | ((prev: DiningReservation[]) => DiningReservation[])) => void;
    setWorkspaceSettings: (settings: WorkspaceSettings) => void;
    loadDemoData: () => Promise<void>;
    seedInitialData: () => Promise<void>;
}

export const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [users, setUsersState] = useState<User[]>([]);
    const [products, setProductsState] = useState<Product[]>([]);
    const [suppliers, setSuppliersState] = useState<Supplier[]>([]);
    const [events, setEventsState] = useState<Event[]>([]);
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
    const [mini_economato_stock, setMiniEconomatoStockState] = useState<StockItem[]>([]);
    const [messages, setMessagesState] = useState<Message[]>([]);
    const [classrooms, setClassroomsState] = useState<Classroom[]>([]);
    const [classroom_products, setClassroomProductsState] = useState<ClassroomProduct[]>([]);
    const [classroom_suppliers, setClassroomSuppliersState] = useState<ClassroomSupplier[]>([]);
    const [classroom_events, setClassroomEventsState] = useState<ClassroomEvent[]>([]);
    const [classroom_orders, setClassroomOrdersState] = useState<ClassroomOrder[]>([]);
    const [service_groups, setServiceGroupsState] = useState<ServiceGroup[]>([]);
    const [services, setServicesState] = useState<Service[]>([]);
    const [dining_services, setDiningServicesState] = useState<DiningService[]>([]);
    const [dining_reservations, setDiningReservationsState] = useState<DiningReservation[]>([]);
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
            { name: 'dining_services', setter: setDiningServicesState },
            { name: 'dining_reservations', setter: setDiningReservationsState },
        ];

        const unsubscribes = collections.map(col => {
            return onSnapshot(collection(db, col.name), (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                col.setter(data);
            }, (error) => {
                console.error(`Error listening to ${col.name}:`, error);
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
            throw err;
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
    const setDiningServices = (data: any) => updateCollection('dining_services', data, dining_services);
    const setDiningReservations = (data: any) => updateCollection('dining_reservations', data, dining_reservations);

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

    const filteredUsers = useMemo(() => users.filter(u => u.email !== 'managerproapp@gmail.com'), [users]);

    const value: DataContextType = useMemo(() => ({
        users: filteredUsers, products, suppliers, events, orders, incidents, 
        training_cycles, modules, groups, assignments, recipes, sales, mini_economato_stock, messages,
        classrooms, classroom_products, classroom_suppliers, classroom_events, classroom_orders,
        service_groups, services, workspaceSettings, sale_items, reservations,
        dining_services, dining_reservations,
        setUsers, setProducts, setSuppliers, setEvents, setOrders, setIncidents,
        setTrainingCycles, setModules, setGroups, setAssignments, setRecipes, setSales,
        setSaleItems, setReservations,
        setMiniEconomatoStock, setMessages, setClassrooms, setClassroomProducts,
        setClassroomSuppliers, setClassroomEvents, setClassroomOrders,
        setServiceGroups, setServices, setDiningServices, setDiningReservations, setWorkspaceSettings,
        loadDemoData, seedInitialData
    }), [
        filteredUsers, products, suppliers, events, orders, incidents, 
        training_cycles, modules, groups, assignments, recipes, sales, mini_economato_stock, messages,
        classrooms, classroom_products, classroom_suppliers, classroom_events, classroom_orders,
        service_groups, services, workspaceSettings, sale_items, reservations,
        dining_services, dining_reservations
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
