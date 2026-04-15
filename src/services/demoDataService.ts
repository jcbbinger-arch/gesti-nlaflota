import { AppData, Profile, User, Supplier, Product, Event, Order, Incident, ServiceGroup, Service } from '../types';
import { users as initialUsers } from './authService';
import { trainingCycles, modules, groups } from './dataService';

const demoUsers: User[] = [
    ...initialUsers,
    { id: 'teacher-2', name: 'Carlos Gomez (Tutor)', email: 'carlos.gomez@managerpro.edu', password: 'password', avatar: 'https://i.pravatar.cc/150?u=teacher-2', profiles: [Profile.TEACHER], activity_status: 'Activo', location_status: 'En el centro', contract_type: 'Fijo', role_type: 'Titular', phone: '622334455', address: 'Plaza Mayor 1' },
    { id: 'teacher-3', name: 'Lucia Fernandez (Sustituta)', email: 'lucia.fernandez@managerpro.edu', password: 'password', avatar: 'https://i.pravatar.cc/150?u=teacher-3', profiles: [Profile.TEACHER], activity_status: 'Activo', location_status: 'Fuera del centro', contract_type: 'Interino', role_type: 'Sustituto', phone: '633445566', address: 'Camino Nuevo 8' },
    { id: 'student-2', name: 'Elena Rodriguez', email: 'elena.r@managerpro.edu', password: 'password', avatar: 'https://i.pravatar.cc/150?u=student-2', profiles: [Profile.STUDENT], activity_status: 'Activo', location_status: 'En el centro', classroom_id: 'classroom-1', student_simulated_profile: Profile.TEACHER },
    { id: 'student-3', name: 'Javier Morales', email: 'javier.m@managerpro.edu', password: 'password', avatar: 'https://i.pravatar.cc/150?u=student-3', profiles: [Profile.STUDENT], activity_status: 'Activo', location_status: 'En el centro', classroom_id: 'classroom-1', student_simulated_profile: Profile.ALMACEN },
    { id: 'user-5', name: 'Super Usuario (Todos los Perfiles)', email: 'all@example.com', password: 'password123', avatar: 'https://i.pravatar.cc/150?u=all@example.com', profiles: [Profile.ADMIN, Profile.TEACHER, Profile.ALMACEN, Profile.CREATOR, Profile.STUDENT], activity_status: 'Activo', location_status: 'En el centro', role_type: 'Titular', contract_type: 'Fijo', classroom_id: 'classroom-1', phone: '655667788', address: 'Plaza del Centro 1', student_simulated_profile: Profile.TEACHER },
];

const demoSuppliers: Supplier[] = [
    { id: 'sup-1', name: 'Distribuciones Gourmet SL', cif: 'B98765432', address: 'Pol. Ind. El Sabor, Parcela 5', phone: '912345678', email: 'pedidos@gourmetsl.es', contact_person: 'Marta Casado', status: 'Activo' },
    { id: 'sup-2', name: 'Frutas y Verduras del Campo', cif: 'A12312312', address: 'Mercado Central, Puesto 12', phone: '934567890', email: 'info@delcampo.es', contact_person: 'Juan Torres', status: 'Activo' },
    { id: 'sup-3', name: 'Carnes de la Sierra', cif: 'B87654321', address: 'Calle Mayor 45, Pueblo Seco', phone: '965432109', email: 'carnes@sierra.com', contact_person: 'Pedro Jimenez', status: 'Inactivo' },
];

const demoProducts: Product[] = [
    { id: 'prod-1', name: 'Solomillo de Ternera', description: 'Pieza de 1kg aprox.', reference: 'CAR-SOL-01', unit: 'kg', suppliers: [{ supplier_id: 'sup-1', price: 25.50 }, { supplier_id: 'sup-3', price: 24.90 }], tax: 10, category: 'VACUNO', family: 'Carnes', allergens: [], status: 'Activo', product_state: 'Fresco', warehouse_status: 'Disponible' },
    { id: 'prod-2', name: 'Harina de Trigo', description: 'Saco de 25kg', reference: 'ALI-HAR-05', unit: 'kg', suppliers: [{ supplier_id: 'sup-1', price: 0.80 }], tax: 4, category: 'HARINAS', family: 'HARINAS, SEMILLAS Y GRANOS', allergens: ['Gluten'], status: 'Activo', product_state: 'Otros', warehouse_status: 'Disponible' },
    { id: 'prod-3', name: 'Aceite de Oliva Virgen Extra', description: 'Garrafa 5L', reference: 'ALI-ACE-02', unit: 'L', suppliers: [{ supplier_id: 'sup-1', price: 6.50 }, { supplier_id: 'sup-2', price: 6.75 }], tax: 10, category: 'ACEITES', family: 'ACEITES Y GRASAS', allergens: [], status: 'Activo', product_state: 'Otros', warehouse_status: 'Bajo Pedido' },
    { id: 'prod-4', name: 'Lechuga Romana', description: 'Caja 12 unidades', reference: 'VER-LEC-01', unit: 'Uds', suppliers: [{ supplier_id: 'sup-2', price: 0.60 }], tax: 4, category: 'VERDURAS', family: 'Vegetales', allergens: [], status: 'Activo', product_state: 'Fresco', warehouse_status: 'Disponible' },
];

const demoEvents: Event[] = [
    { id: 'evt-1', name: 'Pedido Semanal Ordinario', type: 'Regular', start_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), end_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), budget_per_teacher: 300, status: 'Activo' },
    { id: 'evt-2', name: 'Extra Navidad', type: 'Extraordinario', start_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), end_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), budget_per_teacher: 500, authorized_teachers: ['teacher-1'], status: 'Activo' }
];

const demoOrders: Order[] = [
    { id: 'ord-1', user_id: 'teacher-1', date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), status: 'Completado', event_id: 'evt-2', items: [{ product_id: 'prod-1', quantity: 5, price: 25.50, tax: 10 }], cost: 140.25, notes: 'Para el menú de Navidad' },
    { id: 'ord-2', user_id: 'teacher-2', date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), status: 'Enviado', event_id: 'evt-1', items: [{ product_id: 'prod-2', quantity: 10, price: 0.80, tax: 4 }, { product_id: 'prod-4', quantity: 12, price: 0.60, tax: 4 }], cost: 15.90, notes: 'Básicos de cocina', new_product_requests: [{ product_name: 'Tinta de Calamar Fresca (500g)', quantity: 2, notes: 'Proveedor sugerido: Pescados del Mar Menor, precio aprox 8€/ud' }] },
    { id: 'ord-3', user_id: 'teacher-1', date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), status: 'Enviado', event_id: 'evt-1', items: [{ product_id: 'prod-3', quantity: 2, price: 6.50, tax: 10 }], cost: 14.30, notes: '' },
];

const demoIncidents: Incident[] = [
    { id: 'inc-1', date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), description: 'El solomillo llegó con la cadena de frío rota.', reported_by: 'user-2', status: 'Resuelta', supplier_id: 'sup-1', product_id: 'prod-1', event_id: 'evt-2' }
];

const demoServiceGroups: ServiceGroup[] = [
    { id: 'sg-1', name: 'Servicio Miércoles Mediodía', teacher_ids: ['teacher-1', 'teacher-2'] }
];

const demoServices: Service[] = [
    { id: 'svc-1', name: 'Comida de Navidad', date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), service_group_id: 'sg-1', menu: [{ recipe_id: 'rec-1' }], roles: { 'Cocina': 'teacher-1' }, status: 'Planificación' }
];

export const demoData: AppData = {
    users: demoUsers,
    products: demoProducts,
    suppliers: demoSuppliers,
    events: demoEvents,
    orders: demoOrders,
    incidents: demoIncidents,
    training_cycles: trainingCycles,
    modules,
    groups,
    assignments: [
        { id: 'asg-1', user_id: 'teacher-1', group_id: 'grp-c1-1-1' },
        { id: 'asg-2', user_id: 'teacher-2', group_id: 'grp-c1-2-1' },
    ],
    recipes: [
        { 
            id: 'rec-1', 
            name: 'Solomillo Wellington', 
            description: 'Clásico solomillo envuelto en hojaldre', 
            author_id: 'teacher-1', 
            yield_amount: 4,
            yield_unit: 'raciones',
            category: 'Platos Principales',
            ingredients: [{ product_id: 'prod-1', quantity: 1, unit: 'kg' }], 
            preparation_steps: '1. Sellar el solomillo.\n2. Envolver en duxelles y hojaldre.\n3. Hornear a 200°C durante 20 minutos.', 
            is_public: true, 
            cost: 25.50,
            price: 45.00,
            key_points: 'Asegurarse de que el hojaldre esté bien frío.',
            presentation: 'Plato llano grande',
            temperature: 'Caliente',
            recommended_marking: 'Cuchillo y tenedor de carne',
            service_type: 'Emplatado en cocina',
            client_description: 'Jugoso solomillo de ternera envuelto en un crujiente hojaldre con duxelles de champiñones.',
            service_time: '8 min',
        },
        {
            id: 'rec-2',
            name: 'Ensalada César',
            description: 'Ensalada clásica con pollo y aderezo César.',
            author_id: 'teacher-2',
            yield_amount: 2,
            yield_unit: 'raciones',
            category: 'Entrantes',
            ingredients: [
                { product_id: 'prod-4', quantity: 1, unit: 'Uds' }
            ],
            preparation_steps: '1. Lavar y cortar la lechuga.\n2. Añadir pollo a la parrilla y picatostes.\n3. Aliñar con salsa César.',
            is_public: true,
            cost: 1.50,
            price: 8.00,
            key_points: 'Usar anchoas en el aderezo para un sabor auténtico.',
            presentation: 'Bol de ensalada',
            temperature: 'Frio',
            recommended_marking: 'Tenedor',
            service_type: 'Emplatado en cocina',
            client_description: 'Lechuga romana fresca con pollo a la parrilla, picatostes y nuestra salsa César casera.',
            service_time: '3 min',
        }
    ],
    sales: [
        { id: 'sale-1', teacher_id: 'teacher-1', date: new Date().toISOString(), amount: 150.75, category: 'Menú del Día' }
    ],
    sale_items: [
        { 
            id: 'sale-item-1', 
            recipe_id: 'rec-1',
            name: 'Lentejas con Chorizo', 
            description: 'Lentejas caseras con chorizo y morcilla', 
            price: 5.00, 
            rations: 20, 
            allergens: ['Gluten', 'Sulfitos'], 
            workspace_id: 'workspace-1', 
            status: 'Activo', 
            created_at: new Date().toISOString(),
            sale_date: new Date().toISOString().split('T')[0],
            pickup_time: '14:00',
            end_time: '15:00'
        },
        { 
            id: 'sale-item-2', 
            recipe_id: 'rec-2',
            name: 'Ensalada César (Preparación)', 
            description: 'Ensalada clásica con pollo y aderezo César.', 
            price: 8.00, 
            rations: 10, 
            allergens: ['Gluten'], 
            workspace_id: 'workspace-1', 
            status: 'Preparacion', 
            created_at: new Date().toISOString(),
            sale_date: new Date().toISOString().split('T')[0],
            pickup_time: '14:00',
            end_time: '15:00'
        }
    ],
    reservations: [
        { id: 'res-1', sale_item_id: 'sale-item-1', user_id: 'student-2', user_name: 'Elena Rodriguez', quantity: 1, status: 'pendiente', created_at: new Date().toISOString() }
    ],
    mini_economato_stock: [
        { id: 'prod-2', stock: 50, min_stock: 20 },
        { id: 'prod-3', stock: 10, min_stock: 15 }
    ],
    messages: [
        { id: 'msg-1', sender_id: 'user-1', recipient_ids: ['user-2'], subject: 'Revisión de Pedidos', body: 'Por favor, revisa los pedidos pendientes para el evento semanal.', date: new Date().toISOString(), read_by: {} }
    ],
    classrooms: [
        { id: 'classroom-1', name: 'Prácticas de Almacén 101', code: 'DEMO123', tutor_id: 'teacher-1' }
    ],
    classroom_products: [
        { id: 'cprod-1', name: 'Harina de Simulación', reference: 'SIM-HAR-01', category: 'Secos', classroom_id: 'classroom-1' }
    ],
    classroom_suppliers: [
        { id: 'csupp-1', name: 'Proveedor Ficticio A', classroom_id: 'classroom-1' }
    ],
    classroom_events: [
        { id: 'cevt-1', name: 'Práctica #1: Pedido y Recepción', start_date: new Date().toISOString(), end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), classroom_id: 'classroom-1' }
    ],
    classroom_orders: [
        { id: 'cord-1', student_id: 'student-2', event_id: 'cevt-1', classroom_id: 'classroom-1', date: new Date().toISOString(), status: 'Pendiente', items: [{ product_id: 'cprod-1', quantity: 5 }] }
    ],
    service_groups: demoServiceGroups,
    services: demoServices,
    dining_services: [],
    dining_reservations: []
};