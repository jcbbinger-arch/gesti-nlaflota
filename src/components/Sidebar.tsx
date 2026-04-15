import React, { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';
import { useCreator } from '../contexts/CreatorContext';
import { useData } from '../contexts/DataContext';
import { Profile } from '../types';
import { 
    UsersIcon, ProductIcon, SupplierIcon, EventIcon, 
    AssignmentIcon, ExpenseIcon, CompanyIcon, HistoryIcon, 
    RecipeIcon, SaleIcon, ChartIcon, DemoIcon, BookIcon, ClassroomIcon,
    MessageIcon, ProfileIcon, HouseIcon,
    ShoppingCartIcon, TruckIcon, ArchiveBoxIcon, PrinterIcon,
    UserCircleIcon, MagnifyingGlassIcon, ComputerDesktopIcon, PowerIcon,
    ClipboardDocumentListIcon, CurrencyEuroIcon, CakeIcon,
    AppleIcon,
    AppLogoIcon,
    UserGroupIcon,
    ShareIcon
} from './icons';

const creatorNav = [
  { name: 'Panel de control', href: '/creator/dashboard', icon: <ComputerDesktopIcon /> },
  { name: 'Gestión de Usuarios', href: '/creator/user-manager', icon: <UsersIcon /> },
];

const adminNav = [
  { name: 'Panel de control', href: '/admin/dashboard', icon: <ComputerDesktopIcon /> },
  { name: 'Profesores', href: '/admin/teachers', icon: <UserCircleIcon /> },
  { name: 'Productos', href: '/admin/products', icon: <AppleIcon /> },
  { name: 'Proveedores', href: '/admin/suppliers', icon: <TruckIcon /> },
  { name: 'Eventos', href: '/admin/events', icon: <EventIcon /> },
  { name: 'Planificación de Servicios', href: '/admin/service-planner', icon: <UserGroupIcon /> },
  { name: 'Asignaciones', href: '/admin/assignments', icon: <AssignmentIcon /> },
  { name: 'Análisis de Gastos', href: '/admin/expenses', icon: <MagnifyingGlassIcon /> },
  { name: 'Datos Empresa', href: '/admin/company', icon: <CompanyIcon /> },
  { name: 'Aulas de Práctica', href: '/admin/classrooms', icon: <BookIcon /> },
  { name: 'Gestión de Comedor', href: '/admin/dining-services', icon: <ClipboardDocumentListIcon /> },
  { name: 'Vista Comedor', href: '/admin/dining-view', icon: <UserGroupIcon /> },
  { name: 'Soporte', href: '/admin/support', icon: <PowerIcon /> },
  { name: 'Mensajería', href: '/admin/messaging', icon: <MessageIcon /> },
  { name: 'Mi Perfil', href: '/admin/profile', icon: <ProfileIcon /> },
];

const almacenNav = [
  { name: 'Panel de control', href: '/almacen/dashboard', icon: <ComputerDesktopIcon /> },
  { name: 'Procesar Pedido General', href: '/almacen/process-orders', icon: <PrinterIcon /> },
  { name: 'Reposición Stock', href: '/almacen/warehouse-order', icon: <ArchiveBoxIcon /> },
  { name: 'Economato', href: '/almacen/economato', icon: <ShoppingCartIcon /> },
  { name: 'Proveedores', href: '/almacen/suppliers', icon: <TruckIcon /> },
  { name: 'Productos', href: '/almacen/products', icon: <AppleIcon /> },
  { name: 'Mini-Economato', href: '/almacen/mini-economato', icon: <HouseIcon /> },
  { name: 'Reservas Comedor', href: '/almacen/dining-reservations', icon: <ClipboardDocumentListIcon /> },
  { name: 'Vista Comedor', href: '/almacen/dining-view', icon: <UserGroupIcon /> },
  { name: 'Historial de Pedidos', href: '/almacen/order-history', icon: <HistoryIcon /> },
  { name: 'Mensajería', href: '/almacen/messaging', icon: <MessageIcon /> },
  { name: 'Mi Perfil', href: '/almacen/profile', icon: <ProfileIcon /> },
];

const teacherNav = [
  { name: 'Panel de control', href: '/teacher/dashboard', icon: <ComputerDesktopIcon /> },
  { name: 'Planificador de Servicios', href: '/teacher/service-planner', icon: <UserGroupIcon /> },
  { name: 'Portal de Pedidos', href: '/teacher/order-portal', icon: <ClipboardDocumentListIcon /> },
  { name: 'Historial de Pedidos', href: '/teacher/order-history', icon: <HistoryIcon /> },
  { name: 'Mis Recetas', href: '/teacher/recipes', icon: <CakeIcon /> },
  { name: 'Ventas', href: '/teacher/sales', icon: <CurrencyEuroIcon /> },
  { name: 'Ventas para Llevar', href: '/teacher/takeaway-sales', icon: <ShoppingCartIcon /> },
  { name: 'Catálogo de Ventas', href: '/teacher/takeaway-catalog', icon: <ShoppingCartIcon /> },
  { name: 'Reservas Take Away', href: '/teacher/reservations', icon: <ClipboardDocumentListIcon /> },
  { name: 'Vista Comedor', href: '/teacher/dining-view', icon: <UserGroupIcon /> },
  { name: 'Notificaciones', href: '/teacher/notifications', icon: <ShareIcon /> },
  { name: 'Aula de Almacén', href: '/teacher/aula', icon: <BookIcon /> },
  { name: 'Mensajería', href: '/teacher/messaging', icon: <MessageIcon /> },
  { name: 'Mi Perfil', href: '/teacher/profile', icon: <ProfileIcon /> },
];

const salesManagerNav = [
  { name: 'Panel de control', href: '/sales_manager/dashboard', icon: <ComputerDesktopIcon /> },
  { name: 'Catálogo de Ventas', href: '/sales_manager/takeaway-catalog', icon: <ShoppingCartIcon /> },
  { name: 'Gestión de Reservas', href: '/sales_manager/reservations', icon: <ClipboardDocumentListIcon /> },
  { name: 'Ventas Realizadas', href: '/sales_manager/sales-history', icon: <CurrencyEuroIcon /> },
  { name: 'Mensajería', href: '/sales_manager/messaging', icon: <MessageIcon /> },
  { name: 'Mi Perfil', href: '/sales_manager/profile', icon: <ProfileIcon /> },
];

const rewriteStudentNav = (nav: typeof teacherNav | typeof almacenNav, newPrefix: string) => {
  return nav.map(item => {
    let newItemHref = item.href;
    if (item.href.endsWith('dashboard')) {
        // Special handling for dashboards to avoid conflicts
        newItemHref = item.href.startsWith('/teacher') ? '/student/teacher-dashboard' : '/student/almacen-dashboard';
    } else if (item.href.includes('order-history')) {
         newItemHref = item.href.startsWith('/teacher') ? '/student/order-history' : '/student/almacen-order-history';
    } else if (item.href.includes('takeaway-sales')) {
         newItemHref = '/student/takeaway-catalog';
    }
    else {
        newItemHref = item.href.replace(/^\/(teacher|almacen)/, newPrefix);
    }
    return { ...item, href: newItemHref };
  });
};

export const Sidebar: React.FC = () => {
  const { selectedProfile, currentUser } = useAuth();
  const { companyInfo } = useCompany();
  const { creatorInfo } = useCreator();
  const { classrooms } = useData();
  
  let navItems: { name: string; href: string; icon: React.ReactNode; }[] = [];

  const isTutor = useMemo(() => classrooms.some(c => c.tutor_id === currentUser?.id), [classrooms, currentUser]);

  switch (selectedProfile) {
    case Profile.ADMIN:
      navItems = adminNav;
      break;
    case Profile.ALMACEN:
      navItems = almacenNav;
      break;
    case Profile.TEACHER:
      navItems = isTutor ? teacherNav : teacherNav.filter(item => item.name !== 'Aula de Almacén');
      break;
    case Profile.CREATOR:
      navItems = creatorNav;
      break;
    case Profile.STUDENT:
      if (currentUser?.student_simulated_profile === Profile.TEACHER) {
          navItems = rewriteStudentNav(teacherNav.filter(item => item.name !== 'Aula de Almacén'), '/student');
      } else if (currentUser?.student_simulated_profile === Profile.ALMACEN) {
          navItems = rewriteStudentNav(almacenNav, '/student');
      } else {
          navItems = [
              { name: 'Panel de control', href: '/student/dashboard', icon: <ComputerDesktopIcon /> },
              { name: 'Catálogo de Ventas', href: '/student/takeaway-catalog', icon: <ShoppingCartIcon /> },
              { name: 'Mis Reservas', href: '/student/my-reservations', icon: <ClipboardDocumentListIcon /> },
          ];
      }
      // Add My Reservations to simulated profiles too
      if (currentUser?.student_simulated_profile) {
          navItems.push({ name: 'Mis Reservas', href: '/student/my-reservations', icon: <ClipboardDocumentListIcon /> });
      }
      break;
    case Profile.CUSTOMER:
      navItems = [
          { name: 'Catálogo de Ventas', href: '/student/takeaway-catalog', icon: <ShoppingCartIcon /> },
          { name: 'Mis Reservas', href: '/student/my-reservations', icon: <ClipboardDocumentListIcon /> },
          { name: 'Mi Perfil', href: '/student/profile', icon: <ProfileIcon /> },
      ];
      break;
    case Profile.SALES_MANAGER:
      navItems = salesManagerNav;
      break;
    default:
      navItems = [];
  }

  const navLinkClasses = "flex items-center px-4 py-2.5 text-gray-300 hover:bg-primary-700 hover:text-white rounded-md transition-colors duration-200";
  const activeNavLinkClasses = "bg-primary-700 text-white";

  return (
    <aside className="w-64 bg-gradient-to-b from-gray-900 to-blue-950 text-gray-200 flex flex-col shrink-0">
      <div className="h-24 flex items-center justify-center p-4 border-b border-gray-700/50">
          <img src={companyInfo.logo} alt="Logo de la Empresa" className="h-12 w-auto" />
      </div>
      <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            // Use startsWith for nested routes, except for dashboard
            className={({ isActive, isPending }) => {
                const isDashboard = item.href.endsWith('dashboard');
                const checkIsActive = isDashboard ? isActive : window.location.hash.startsWith(`#${item.href}`);
                return checkIsActive ? `${navLinkClasses} ${activeNavLinkClasses}` : navLinkClasses;
            }}
          >
            <span className="mr-3 w-6 h-6 shrink-0">{item.icon}</span>
            <span className="truncate">{item.name}</span>
          </NavLink>
        ))}
        {currentUser && currentUser.profiles.length > 1 && (
            <NavLink
                to="/select-profile"
                className={navLinkClasses}
            >
                <span className="mr-3 w-6 h-6 shrink-0"><UsersIcon /></span>
                <span className="truncate">Cambiar Perfil</span>
            </NavLink>
        )}
      </nav>
      <div className="px-4 py-4 border-t border-gray-700/50 text-center text-xs text-gray-500 flex flex-col items-center space-y-2">
        <img src={creatorInfo.logo} alt="Logo del Creador" className="h-10 w-10 rounded-full object-cover" />
        <p className="font-semibold text-gray-300 text-sm">{creatorInfo.app_name || 'Manager Pro'}</p>
        <div>
            <p>{creatorInfo.copyright}</p>
            <a href={creatorInfo.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary-400">
                {creatorInfo.name}
            </a>
        </div>
      </div>
    </aside>
  );
};