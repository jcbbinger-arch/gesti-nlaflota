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
  { name: 'Mantenimiento', href: '/creator/maintenance', icon: <PowerIcon /> },
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
  { name: 'Familias y Categorías', href: '/almacen/product-metadata', icon: <BookIcon /> },
  { name: 'Mini-Economato', href: '/almacen/mini-economato', icon: <HouseIcon /> },
  { name: 'Reposiciones Economato', href: '/teacher/order-portal?type=economato', icon: <ShoppingCartIcon /> },
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
  { name: 'Mini-Economato (Consulta)', href: '/teacher/mini-economato', icon: <HouseIcon /> },
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
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  
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
      navItems = [...creatorNav];
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

  const navLinkClasses = "flex items-center px-4 py-2.5 text-gray-300 hover:bg-primary-700 hover:text-white rounded-md transition-all duration-200 group relative";
  const activeNavLinkClasses = "bg-primary-700 text-white";

  return (
    <>
      <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-gradient-to-b from-gray-900 to-blue-950 text-gray-200 hidden md:flex flex-col shrink-0 transition-all duration-300 relative group/sidebar`}>
        {/* Collapse Toggle */}
        <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3 top-28 bg-primary-600 text-white p-1 rounded-full shadow-lg opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 z-50 border-2 border-white dark:border-gray-800"
        >
            <svg className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="9 5l7 7-7 7" />
            </svg>
        </button>

        <div className={`h-24 flex items-center ${isCollapsed ? 'justify-center' : 'justify-center p-4'} border-b border-gray-700/50 transition-all duration-300 overflow-hidden`}>
            <img src={companyInfo.logo} alt="Logo" className={`${isCollapsed ? 'h-8' : 'h-12'} w-auto transition-all duration-300`} />
        </div>
        
        <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto no-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) => {
                  const isDashboard = item.href.endsWith('dashboard');
                  const checkIsActive = isDashboard ? isActive : window.location.hash.startsWith(`#${item.href}`);
                  return checkIsActive ? `${navLinkClasses} ${activeNavLinkClasses}` : navLinkClasses;
              }}
            >
              <span className={`${isCollapsed ? 'mx-auto' : 'mr-3'} w-6 h-6 shrink-0`}>{item.icon}</span>
              {!isCollapsed && <span className="truncate">{item.name}</span>}
              
              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-full ml-4 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 pointer-events-none shadow-xl border border-gray-700">
                    {item.name}
                </div>
              )}
            </NavLink>
          ))}
          {currentUser && currentUser.profiles.length > 1 && (
              <NavLink
                  to="/select-profile"
                  className={navLinkClasses}
              >
                  <span className={`${isCollapsed ? 'mx-auto' : 'mr-3'} w-6 h-6 shrink-0`}><UsersIcon /></span>
                  {!isCollapsed && <span className="truncate">Cambiar Perfil</span>}
                  {isCollapsed && (
                    <div className="absolute left-full ml-4 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 pointer-events-none shadow-xl border border-gray-700">
                        Cambiar Perfil
                    </div>
                  )}
              </NavLink>
          )}
        </nav>

        {!isCollapsed && (
            <div className="px-4 py-4 border-t border-gray-700/50 text-center text-xs text-gray-500 flex flex-col items-center space-y-2">
                <img src={creatorInfo.logo} alt="Logo Creador" className="h-10 w-10 rounded-full object-cover" />
                <p className="font-semibold text-gray-200 text-sm">{creatorInfo.app_name || 'Manager Pro'}</p>
                <div className="opacity-60 hover:opacity-100 transition-opacity">
                    <p>{creatorInfo.copyright}</p>
                    <a href={creatorInfo.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary-400">
                        {creatorInfo.name}
                    </a>
                </div>
            </div>
        )}
      </aside>

      {/* Mobile Bottom Navigation - Robust UX for quick access */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-gray-900 border-t border-gray-800 flex items-center justify-around px-2 z-[60] shadow-2xl">
        <MobileNavLink to={`/${selectedProfile}/dashboard`} icon={<HouseIcon />} label="Inicio" />
        {selectedProfile === Profile.TEACHER && <MobileNavLink to="/teacher/order-portal" icon={<ClipboardDocumentListIcon />} label="Pedidos" />}
        {selectedProfile === Profile.ALMACEN && <MobileNavLink to="/almacen/process-orders" icon={<PrinterIcon />} label="Procesar" />}
        <MobileNavLink to={`/${selectedProfile}/messaging`} icon={<MessageIcon />} label="Mensajes" />
        <MobileNavLink to={`/${selectedProfile}/profile`} icon={<ProfileIcon />} label="Perfil" />
      </nav>
    </>
  );
};

const MobileNavLink: React.FC<{ to: string; icon: React.ReactNode; label: string }> = ({ to, icon, label }) => (
    <NavLink 
        to={to} 
        className={({ isActive }) => `flex flex-col items-center justify-center space-y-1 transition-colors ${isActive ? 'text-primary-400' : 'text-gray-400'}`}
    >
        <span className="w-6 h-6">{icon}</span>
        <span className="text-[10px] uppercase font-bold tracking-tighter">{label}</span>
    </NavLink>
);
