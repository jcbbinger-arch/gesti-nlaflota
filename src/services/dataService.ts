import {
  User,
  Product,
  Supplier,
  AppEvent,
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
  StockReception,
} from '../types';
import { users as initialUsers } from './authService';

// This file provides the initial data structure for the application.
// In a real application, this would likely be fetched from an API.

export const users: User[] = initialUsers;
export const products: Product[] = [];
export const suppliers: Supplier[] = [];
export const events: AppEvent[] = [];
export const orders: Order[] = [];
export const incidents: Incident[] = [];
export const trainingCycles: TrainingCycle[] = [];
export const modules: Module[] = [];
export const groups: Group[] = [];
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
  transfers: [],
  dining_services: [],
  dining_reservations: [],
  stock_receptions: []
};