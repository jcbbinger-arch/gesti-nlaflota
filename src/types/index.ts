export const SUPER_USER_EMAILS = ['managerproapp@gmail.com', 'jcbprofesor@gmail.com'];

export enum Profile {
  CREATOR = 'creator',
  ADMIN = 'admin',
  ALMACEN = 'almacen',
  TEACHER = 'teacher',
  STUDENT = 'student',
  SALES_MANAGER = 'sales_manager',
  CUSTOMER = 'customer',
}

export const getProfileDisplayName = (profile: Profile, context?: 'student_simulation'): string => {
  if (context === 'student_simulation' && profile === Profile.TEACHER) {
    return 'Profesional de Cocina';
  }
  const names: Record<Profile, string> = {
    [Profile.CREATOR]: 'Creador',
    [Profile.ADMIN]: 'Administrador',
    [Profile.ALMACEN]: 'Almacén',
    [Profile.TEACHER]: 'Profesor',
    [Profile.STUDENT]: 'Alumno',
    [Profile.SALES_MANAGER]: 'Gestor de Ventas',
    [Profile.CUSTOMER]: 'Cliente',
  };
  return names[profile] || profile;
};

export type OrderStatus = 'Borrador' | 'Enviado' | 'Cerrado' | 'Procesado' | 'Recibido Parcial' | 'Recibido OK' | 'Completado' | 'Cancelado';
export type UserActivityStatus = 'Activo' | 'De Baja';
export type UserLocationStatus = 'En el centro' | 'Fuera del centro';
export type SupplierStatus = 'Activo' | 'Inactivo';
export type ProductState = string;
export type WarehouseStatus = 'Disponible' | 'Bajo Pedido' | 'Descontinuado';
export type ReceptionLineStatus = 'pendiente' | 'ok' | 'parcial' | 'incidencia';

export interface CategoryConfig {
  name: string;
  colors: string[]; // Up to 3 colors
}

export interface WorkspaceSettings {
  workspaceId: string;
  categories: string[];
  families?: string[];
  product_conditions?: string[];
  categoryConfigs?: CategoryConfig[];
}

export const DEFAULT_CATEGORY_CONFIGS: CategoryConfig[] = [
    { name: "Entrantes", colors: ["#3b82f6", "#60a5fa"] },
    { name: "Principales", colors: ["#ef4444", "#f87171"] },
    { name: "Postres", colors: ["#ec4899", "#f472b6"] },
    { name: "Bebidas", colors: ["#10b981", "#34d399"] },
    { name: "Salsas", colors: ["#f59e0b", "#fbbf24"] },
    { name: "Guarniciones", colors: ["#8b5cf6", "#a78bfa"] }
];

export const DEFAULT_CATEGORIES = DEFAULT_CATEGORY_CONFIGS.map(c => c.name);


export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  avatar: string;
  profiles: Profile[];
  workspaceId?: string;
  teacherName?: string;
  teacherLogo?: string;
  instituteName?: string;
  instituteLogo?: string;
  role?: 'admin' | 'user';
  activity_status: UserActivityStatus;
  location_status: UserLocationStatus;
  access_profiles?: { [key in Profile]?: boolean };
  contract_type?: 'Fijo' | 'Interino';
  role_type?: 'Titular' | 'Sustituto';
  classroom_id?: string;
  phone?: string;
  secondary_phone?: string;
  address?: string;
  allergens?: string[];
  student_simulated_profile?: Profile.TEACHER | Profile.ALMACEN;
  must_change_password?: boolean;
}

export interface Company {
  name: string;
  logo: string;
  print_logo: string;
  cif: string;
  address: string;
  phone: string;
  email: string;
  default_budget: number;
  manager_user_id?: string;
}

export interface Creator {
  name: string;
  logo: string;
  website: string;
  copyright: string;
  app_name: string;
}

export interface ProductSupplier {
  supplier_id: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  reference: string;
  unit: string;
  suppliers: ProductSupplier[];
  tax: number; // e.g. 21 for 21%
  category: string;
  family: string;
  allergens: string[];
  status: 'Activo' | 'Inactivo';
  product_state?: ProductState;
  warehouse_status?: WarehouseStatus;
  image?: string;
  unit_size?: number;
  unit_size_type?: 'g' | 'kg' | 'ml' | 'L' | 'uds';
}

export interface Supplier {
  id: string;
  name: string;
  cif: string;
  address: string;
  phone: string;
  email: string;
  contact_person: string;
  status: SupplierStatus;
  website?: string;
  notes?: string;
}

export interface AppEvent {
    id: string;
    name: string;
    type: 'Regular' | 'Extraordinario';
    start_date: string; // ISO string
    end_date: string; // ISO string
    budget_per_teacher: number;
    authorized_teachers?: string[]; // user IDs
    status: 'Activo' | 'Inactivo';
}

export interface OrderItem {
  product_id: string;
  quantity: number;
  price: number;
  tax: number;
}

export interface NewProductRequest {
    product_name: string;
    quantity: number;
    notes: string;
}

export interface Order {
  id: string;
  user_id: string;
  date: string; // ISO string
  status: OrderStatus;
  event_id: string;
  items: OrderItem[];
  new_product_requests?: NewProductRequest[];
  cost?: number;
  notes?: string;
  is_staff_meal?: boolean;
  dining_service_id?: string;
}

export interface Incident {
    id: string;
    date: string; // ISO string
    description: string;
    reported_by: string; // userId
    status: 'Abierta' | 'En Progreso' | 'Resuelta';
    supplier_id: string;
    product_id?: string;
    event_id?: string;
}

export interface ReceptionItem {
    status: ReceptionLineStatus;
    received_quantity: number;
    ordered_quantity: number;
}

export interface TrainingCycle {
    id: string;
    name: string;
}

export interface Module {
    id: string;
    cycle_id: string;
    name: string;
}

export interface Group {
    id: string;
    module_id: string;
    name: string;
}

export interface Assignment {
    id: string;
    user_id: string;
    group_id: string;
}

export interface RecipeIngredient {
  product_id: string;
  quantity: number;
  unit: string;
  cost?: number;
}

export interface Recipe {
    id: string;
    name: string;
    description: string;
    author_id: string;
    photo?: string;
    yield_amount: number;
    yield_unit: string;
    category: string;
    ingredients: RecipeIngredient[];
    preparation_steps: string;
    key_points?: string; // For notes
    is_public: boolean;
    cost: number; // Will be auto-calculated
    price: number;
    custom_section?: {
        title: string;
        content: string;
    };
    presentation?: string;
    temperature?: 'Caliente' | 'Frio' | 'Ambiente';
    recommended_marking?: string;
    service_type?: string;
    client_description?: string;
    service_time?: string;
    selected_allergens?: string[];
}

export interface StockItem {
    id: string; // productId
    stock: number;
    min_stock: number;
    is_shared?: boolean;
    last_update?: string;
}

export interface StockReception {
    id: string;
    date: string;
    supplier_id: string;
    products: {
        product_id: string;
        quantity: number;
        price?: number;
    }[];
    notes?: string;
}

export interface Sale {
    id: string;
    teacher_id: string;
    date: string; // ISO string
    amount: number;
    category: string;
    description?: string;
}

export interface Message {
    id: string;
    sender_id: string;
    recipient_ids: string[];
    subject: string;
    body: string;
    date: string; // ISO string
    read_by: { [user_id: string]: boolean };
}

export interface Classroom {
    id: string;
    name: string;
    code: string; // Access code for students
    tutor_id: string; // userId
}

export interface ClassroomProduct {
    id: string;
    name: string;
    reference: string;
    category: string;
    classroom_id: string;
}

export interface ClassroomSupplier {
    id: string;
    name: string;
    classroom_id: string;
}

export interface ClassroomEvent {
    id: string;
    name: string;
    start_date: string; // ISO string
    end_date: string; // ISO string
    classroom_id: string;
}

export interface ClassroomOrderItem {
    product_id: string;
    quantity: number;
}

export interface ClassroomOrder {
    id: string;
    student_id: string; // userId of student
    event_id: string;
    classroom_id: string;
    date: string; // ISO string
    status: 'Pendiente' | 'Completado';
    items: ClassroomOrderItem[];
}

export type ServiceRole = 'Cocina' | 'Postres' | 'Servicios (Sala)' | 'Cafetería';

export interface ServiceGroup {
    id: string;
    name: string;
    teacher_ids: string[];
    roles?: Partial<Record<ServiceRole, string[]>>;
}

export interface ServiceMenuItem {
    recipe_id: string;
}

export interface Service {
    id: string;
    name: string;
    date: string; // ISO string
    service_group_id: string;
    menu: ServiceMenuItem[];
    roles: Partial<Record<ServiceRole, string>>; // string is userId
    status: 'Planificación' | 'Confirmado' | 'Completado';
}

export interface SaleItem {
    id: string;
    recipe_id: string;
    name: string;
    description?: string;
    price: number;
    rations: number;
    allergens: string[];
    notes?: string;
    workspace_id: string;
    status: 'Activo' | 'Inactivo' | 'Preparacion';
    created_at: string; // ISO string
    sale_date: string; // ISO string
    pickup_time: string;
    end_time: string;
    teacher_name?: string;
    group_name?: string;
}

export interface Reservation {
    id: string;
    sale_item_id: string;
    user_id?: string;
    user_name: string;
    email?: string;
    phone?: string;
    allergens?: string[];
    quantity: number;
    notes?: string;
    status: 'pendiente' | 'recogido' | 'cancelado';
    created_at: string; // ISO string
}

export type DiningServiceStatus = 'borrador' | 'abierto' | 'cerrado';

export interface DinerAllergen {
  diner_name?: string;
  allergens: string[];
}

export interface DiningService {
  id: string;
  service_id?: string; // Link to Service
  date: string;
  max_capacity: number;
  current_pax: number;
  menu_price: number;
  status: DiningServiceStatus;
  created_by: string;
  created_at: string;
}

export interface DiningReservation {
  id: string;
  service_id: string;
  reference_name: string;
  client_entity: string;
  pax: number;
  phone_1: string;
  phone_2?: string;
  total_price: number;
  table_number?: string;
  diners_allergens: DinerAllergen[];
  created_by: string;
  created_at: string;
}

export interface AppData {
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
    stock_receptions: StockReception[];
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
}