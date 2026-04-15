import {
  User,
  Product,
  Supplier,
  Event,
  Order,
  Incident,
  TrainingCycle,
  Module,
  Group,
  Assignment,
  Recipe,
  StockItem,
  Sale,
  SaleItem,
  Reservation,
  Message,
  Classroom,
  ClassroomProduct,
  ClassroomSupplier,
  ClassroomEvent,
  ClassroomOrder,
  AppData,
  ServiceGroup,
  Service,
} from '../types';
import { users as initialUsers } from './authService';

// This file provides the initial data structure for the application.
// In a real application, this would likely be fetched from an API.

export const users: User[] = initialUsers;
export const products: Product[] = [];
export const suppliers: Supplier[] = [];
export const events: Event[] = [];
export const orders: Order[] = [];
export const incidents: Incident[] = [];
export const trainingCycles: TrainingCycle[] = [
    { id: 'cycle-1', name: 'Técnico en Cocina y Gastronomía' },
    { id: 'cycle-2', name: 'Técnico en Servicios en Restauración' },
    { id: 'cycle-3', name: 'Técnico Superior en Dirección de Cocina' },
    { id: 'cycle-4', name: 'Técnico Superior en Dirección de Servicios de Restauración' },
    { id: 'cycle-5', name: 'Especialista en Panadería y bollería Artesanales (Master)' },
    { id: 'cycle-6', name: 'Técnico en Panadería, Repostería y Confitería' }
];
export const modules: Module[] = [
    // Cocina y Gastronomía
    { id: 'mod-c1-1', cycle_id: 'cycle-1', name: 'Preelaboración y conservación de alimentos' },
    { id: 'mod-c1-2', cycle_id: 'cycle-1', name: 'Técnicas culinarias' },
    { id: 'mod-c1-3', cycle_id: 'cycle-1', name: 'Procesos básicos de pastelería y repostería' },
    { id: 'mod-c1-4', cycle_id: 'cycle-1', name: 'Productos culinarios' },
    { id: 'mod-c1-5', cycle_id: 'cycle-1', name: 'Postres en restauración' },
    { id: 'mod-c1-6', cycle_id: 'cycle-1', name: 'Sostenibilidad aplicada al sistema productivo' },
    { id: 'mod-c1-7', cycle_id: 'cycle-1', name: 'Optativa' },
    // Servicios en Restauración
    { id: 'mod-c2-1', cycle_id: 'cycle-2', name: 'Operaciones básicas en bar-cafetería' },
    { id: 'mod-c2-2', cycle_id: 'cycle-2', name: 'Operaciones básicas en restaurante' },
    { id: 'mod-c2-3', cycle_id: 'cycle-2', name: 'Servicios en bar-cafetería' },
    { id: 'mod-c2-4', cycle_id: 'cycle-2', name: 'Servicios en restaurante y eventos especiales' },
    { id: 'mod-c2-5', cycle_id: 'cycle-2', name: 'El vino y su servicio' },
    // Dirección de Cocina
    { id: 'mod-c3-1', cycle_id: 'cycle-3', name: 'Procesos de preelaboración y conservación en cocina' },
    { id: 'mod-c3-2', cycle_id: 'cycle-3', name: 'Elaboraciones de pastelería y repostería en cocina' },
    { id: 'mod-c3-3', cycle_id: 'cycle-3', name: 'Procesos de elaboración culinaria' },
    { id: 'mod-c3-4', cycle_id: 'cycle-3', name: 'Gestión de la producción en cocina' },
    { id: 'mod-c3-5', cycle_id: 'cycle-3', name: 'Control del aprovisionamiento de materias primas' },
    { id: 'mod-c3-6', cycle_id: 'cycle-3', name: 'Gestión de la calidad y de la seguridad e higiene alimentaria' },
    { id: 'mod-c3-7', cycle_id: 'cycle-3', name: 'Gastronomía y nutrición' },
    // Dirección de Servicios de Restauración
    { id: 'mod-c4-1', cycle_id: 'cycle-4', name: 'Procesos de servicios en bar-cafetería' },
    { id: 'mod-c4-2', cycle_id: 'cycle-4', name: 'Procesos de servicios en restaurante' },
    { id: 'mod-c4-3', cycle_id: 'cycle-4', name: 'Sumillería' },
    { id: 'mod-c4-4', cycle_id: 'cycle-4', name: 'Planificación y dirección de servicios y eventos en restauración' },
    { id: 'mod-c4-5', cycle_id: 'cycle-4', name: 'Control del aprovisionamiento de materias primas' },
    // Panadería y bollería Artesanales
    { id: 'mod-c5-1', cycle_id: 'cycle-5', name: 'Masas madre de cultivo y prefermentos' },
    { id: 'mod-c5-2', cycle_id: 'cycle-5', name: 'Tecnología del frío aplicada a la panadería artesanal' },
    { id: 'mod-c5-3', cycle_id: 'cycle-5', name: 'Panes artesanos de cereales tradicionales, especiales y pseudocereales' },
    { id: 'mod-c5-4', cycle_id: 'cycle-5', name: 'Bollería artesanal y hojaldres' },
    { id: 'mod-c5-5', cycle_id: 'cycle-5', name: 'Cata y maridaje de productos de panificación' },
    // Panadería, Repostería y Confitería
    { id: 'mod-c6-1', cycle_id: 'cycle-6', name: 'Elaboraciones de panadería-bollería' },
    { id: 'mod-c6-2', cycle_id: 'cycle-6', name: 'Procesos básicos de pastelería y repostería' },
    { id: 'mod-c6-3', cycle_id: 'cycle-6', name: 'Operaciones y control de almacén en la industria alimentaria' },
    { id: 'mod-c6-4', cycle_id: 'cycle-6', name: 'Presentación y venta de productos de panadería y pastelería' },
    { id: 'mod-c6-5', cycle_id: 'cycle-6', name: 'Materias primas y procesos en panadería, pastelería y repostería' },
    { id: 'mod-c6-6', cycle_id: 'cycle-6', name: 'Elaboraciones de confitería y otras especialidades' },
    { id: 'mod-c6-7', cycle_id: 'cycle-6', name: 'Postres en restauración' },
    { id: 'mod-c6-8', cycle_id: 'cycle-6', name: 'Productos de obrador' },
    { id: 'mod-c6-9', cycle_id: 'cycle-6', name: 'Optativa' },
];
export const groups: Group[] = [
    // Cocina y Gastronomía
    { id: 'grp-c1-1-1', module_id: 'mod-c1-1', name: '1HCA' }, { id: 'grp-c1-1-2', module_id: 'mod-c1-1', name: '1HCB' }, { id: 'grp-c1-1-3', module_id: 'mod-c1-1', name: '1HCC' },
    { id: 'grp-c1-2-1', module_id: 'mod-c1-2', name: '1HCA' }, { id: 'grp-c1-2-2', module_id: 'mod-c1-2', name: '1HCB' }, { id: 'grp-c1-2-3', module_id: 'mod-c1-2', name: '1HCC' },
    { id: 'grp-c1-3-1', module_id: 'mod-c1-3', name: '1HCA' }, { id: 'grp-c1-3-2', module_id: 'mod-c1-3', name: '1HCB' }, { id: 'grp-c1-3-3', module_id: 'mod-c1-3', name: '1HCC' },
    { id: 'grp-c1-4-1', module_id: 'mod-c1-4', name: '2HCA' }, { id: 'grp-c1-4-2', module_id: 'mod-c1-4', name: '2HCB' },
    { id: 'grp-c1-5-1', module_id: 'mod-c1-5', name: '2HCA' }, { id: 'grp-c1-5-2', module_id: 'mod-c1-5', name: '2HCB' },
    { id: 'grp-c1-6-1', module_id: 'mod-c1-6', name: '2HCA' }, { id: 'grp-c1-6-2', module_id: 'mod-c1-6', name: '2HCB' },
    { id: 'grp-c1-7-1', module_id: 'mod-c1-7', name: '2HCA' }, { id: 'grp-c1-7-2', module_id: 'mod-c1-7', name: '2HCB' },
    // Servicios en Restauración
    { id: 'grp-c2-1-1', module_id: 'mod-c2-1', name: 'IHS' },
    { id: 'grp-c2-2-1', module_id: 'mod-c2-2', name: '1HS' },
    { id: 'grp-c2-3-1', module_id: 'mod-c2-3', name: '2HS' },
    { id: 'grp-c2-4-1', module_id: 'mod-c2-4', name: '2HS' },
    { id: 'grp-c2-5-1', module_id: 'mod-c2-5', name: '2HS' },
    // Dirección de Cocina
    { id: 'grp-c3-1-1', module_id: 'mod-c3-1', name: '3HDC' },
    { id: 'grp-c3-2-1', module_id: 'mod-c3-2', name: '3HDC' },
    { id: 'grp-c3-3-1', module_id: 'mod-c3-3', name: '3HDC' },
    { id: 'grp-c3-4-1', module_id: 'mod-c3-4', name: '3HDC' },
    { id: 'grp-c3-5-1', module_id: 'mod-c3-5', name: '4HDC' },
    { id: 'grp-c3-6-1', module_id: 'mod-c3-6', name: '4HDC' },
    { id: 'grp-c3-7-1', module_id: 'mod-c3-7', name: '4HDC' },
    // Dirección de Servicios de Restauración
    { id: 'grp-c4-1-1', module_id: 'mod-c4-1', name: '3HDS' },
    { id: 'grp-c4-2-1', module_id: 'mod-c4-2', name: '3HDS' },
    { id: 'grp-c4-3-1', module_id: 'mod-c4-3', name: '3HDS' },
    { id: 'grp-c4-4-1', module_id: 'mod-c4-4', name: '3HDS' },
    { id: 'grp-c4-5-1', module_id: 'mod-c4-5', name: '4HDS' },
    // Panadería y bollería Artesanales
    { id: 'grp-c5-1-1', module_id: 'mod-c5-1', name: '5PBA' },
    { id: 'grp-c5-2-1', module_id: 'mod-c5-2', name: '5PBA' },
    { id: 'grp-c5-3-1', module_id: 'mod-c5-3', name: '5PBA' },
    { id: 'grp-c5-4-1', module_id: 'mod-c5-4', name: '5PBA' },
    { id: 'grp-c5-5-1', module_id: 'mod-c5-5', name: '5PBA' },
    // Panadería, Repostería y Confitería
    { id: 'grp-c6-1-1', module_id: 'mod-c6-1', name: '1YP' },
    { id: 'grp-c6-2-1', module_id: 'mod-c6-2', name: '1YP' },
    { id: 'grp-c6-3-1', module_id: 'mod-c6-3', name: '1YP' },
    { id: 'grp-c6-4-1', module_id: 'mod-c6-4', name: '1YP' },
    { id: 'grp-c6-5-1', module_id: 'mod-c6-5', name: '1YP' },
    { id: 'grp-c6-6-1', module_id: 'mod-c6-6', name: '2YP' },
    { id: 'grp-c6-7-1', module_id: 'mod-c6-7', name: '2YP' },
    { id: 'grp-c6-8-1', module_id: 'mod-c6-8', name: '2YP' },
    { id: 'grp-c6-9-1', module_id: 'mod-c6-9', name: '2YP' },
];
export const assignments: Assignment[] = [];
export const recipes: Recipe[] = [];
export const sales: Sale[] = [];
export const saleItems: SaleItem[] = [];
export const reservations: Reservation[] = [];
export const miniEconomatoStock: StockItem[] = [];
export const messages: Message[] = [];
export const classrooms: Classroom[] = [];
export const classroomProducts: ClassroomProduct[] = [];
export const classroomSuppliers: ClassroomSupplier[] = [];
export const classroomEvents: ClassroomEvent[] = [];
export const classroomOrders: ClassroomOrder[] = [];
export const serviceGroups: ServiceGroup[] = [];
export const services: Service[] = [];

export const initialData: AppData = {
  users,
  products,
  suppliers,
  events,
  orders,
  incidents,
  training_cycles: trainingCycles,
  modules,
  groups,
  assignments,
  recipes,
  sales,
  sale_items: saleItems,
  reservations: reservations,
  mini_economato_stock: miniEconomatoStock,
  messages,
  classrooms,
  classroom_products: classroomProducts,
  classroom_suppliers: classroomSuppliers,
  classroom_events: classroomEvents,
  classroom_orders: classroomOrders,
  service_groups: serviceGroups,
  services,
  dining_services: [],
  dining_reservations: []
};