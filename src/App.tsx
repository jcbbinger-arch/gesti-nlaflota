import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { CompanyProvider } from './contexts/CompanyContext';
import { CreatorProvider } from './contexts/CreatorContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { NavigationProvider } from './contexts/NavigationContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';

import { Login } from './pages/shared/Login';
import { StudentClassroomRegister } from './pages/shared/StudentClassroomRegister';
import { ProfileSelector } from './pages/shared/ProfileSelector';
import { BlockedAccess } from './pages/shared/BlockedAccess';
import { MyProfile } from './pages/shared/MyProfile';
import { Messaging } from './pages/shared/Messaging';

import { CreatorLayout } from './pages/layouts/CreatorLayout';
import { CreatorDashboard } from './pages/creator/CreatorDashboard';
import { UserManager } from './pages/creator/UserManager';
import { SupportMaintenance } from './pages/shared/SupportMaintenance';

import { AdminLayout } from './pages/layouts/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { TeacherManager } from './pages/admin/TeacherManager';
import { ProductManager } from './pages/admin/ProductManager';
import { SupplierManager } from './pages/admin/SupplierManager';
import { EventManager } from './pages/admin/EventManager';
import { AssignmentManager } from './pages/admin/AssignmentManager';
import { ExpenseManager } from './pages/admin/ExpenseManager';
import { ExpenseDetailByTeacher } from './pages/admin/ExpenseDetailByTeacher';
import { CompanyData } from './pages/admin/CompanyData';
import { ClassroomManager } from './pages/admin/ClassroomManager';
import { ServicePlanner } from './pages/admin/ServicePlanner';
import { AcademicYearManager } from './pages/admin/AcademicYearManager';

import { ManagerLayout } from './pages/layouts/ManagerLayout';
import { ManagerDashboard } from './pages/manager/ManagerDashboard';
import { ProcessOrders } from './pages/manager/ProcessOrders';
import { WarehouseOrder } from './pages/manager/WarehouseOrder';
import { EconomatoManager } from './pages/manager/EconomatoManager';
import { MiniEconomato } from './pages/manager/MiniEconomato';
import { OrderHistory } from './pages/manager/OrderHistory';
import { ProductMetadataManager } from './pages/manager/ProductMetadataManager';
import { DataCleanupManager } from './pages/manager/DataCleanupManager';

import { TeacherLayout } from './pages/layouts/TeacherLayout';
import { TeacherDashboard } from './pages/teacher/TeacherDashboard';
import { OrderPortal } from './pages/teacher/OrderPortal';
import { OrderForm } from './pages/teacher/OrderForm';
import { TeacherOrderHistory } from './pages/teacher/TeacherOrderHistory';
import { SalesManager } from './pages/teacher/SalesManager';
import { TakeawaySales } from './pages/teacher/TakeawaySales';
import { ReservationManager } from './pages/teacher/ReservationManager';
import { NotificationManager } from './pages/teacher/NotificationManager';
import { RecipeManager } from './pages/teacher/RecipeManager';
import { RecipeForm } from './pages/teacher/RecipeForm';
import { ServiceViewer } from './pages/teacher/ServiceViewer';
import { TransferPortal } from './pages/teacher/TransferPortal';

import { ClassroomList } from './pages/teacher/classroom/ClassroomList';

import { StudentLayout } from './pages/layouts/StudentLayout';
import { StudentDashboard } from './pages/student/StudentDashboard';
import { TakeawayCatalog } from './pages/student/TakeawayCatalog';
import { MyReservations } from './pages/student/MyReservations';

import { Profile } from './types';
import { useAuth } from './contexts/AuthContext';
import { SettingsModal } from './components/SettingsModal';

const RedirectHandler: React.FC = () => {
  const { currentUser, selectedProfile } = useAuth();
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  if (!selectedProfile || !currentUser.profiles.includes(selectedProfile)) {
    return <Navigate to="/select-profile" replace />;
  }
  
  if (selectedProfile === Profile.CUSTOMER) {
    return <Navigate to="/student/takeaway-catalog" replace />;
  }
  if (selectedProfile === Profile.STUDENT) {
    return <Navigate to="/student/dashboard" replace />;
  }
  
  return <Navigate to={`/${selectedProfile}/dashboard`} replace />;
};

import { DiningServiceManager } from './pages/admin/DiningServiceManager';
import { DiningReservations } from './pages/almacen/DiningReservations';
import { DiningServiceView } from './pages/teacher/DiningServiceView';
import { SalesDashboard } from './pages/sales/SalesDashboard';

const AppContent: React.FC = () => {
  const { isAuthReady, currentUser, selectedProfile } = useAuth();
  const [showMandatorySettings, setShowMandatorySettings] = React.useState(false);

  const isProfileIncomplete = currentUser && (!currentUser.instituteName || !currentUser.teacherName) && selectedProfile === Profile.TEACHER;

  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Intercept dot key (keypad or main) on numeric inputs
      if ((e.key === '.' || e.key === 'Decimal') && (e.target as HTMLElement).tagName === 'INPUT') {
        const target = e.target as HTMLInputElement;
        
        // Target inputs that are likely numeric
        const isNumeric = target.type === 'number' || 
                          target.inputMode === 'decimal' || 
                          target.classList.contains('numeric-input') ||
                          target.name.toLowerCase().includes('precio') ||
                          target.name.toLowerCase().includes('cantidad') ||
                          target.name.toLowerCase().includes('cost') ||
                          target.name.toLowerCase().includes('yield') ||
                          target.name.toLowerCase().includes('amount') ||
                          target.name.toLowerCase().includes(' rations') ||
                          target.placeholder?.toLowerCase().includes('precio') ||
                          target.placeholder?.toLowerCase().includes('cantidad') ||
                          target.placeholder?.toLowerCase().includes('raciones');

        if (isNumeric) {
          // If it's type="number", browsers in ES locale might block '.'
          // We force the decimal separator if necessary
          if (target.type !== 'number') {
            e.preventDefault();
            const start = target.selectionStart || 0;
            const end = target.selectionEnd || 0;
            const value = target.value;
            
            // Insert comma instead of dot
            target.value = value.substring(0, start) + ',' + value.substring(end);
            
            // Restore cursor position
            const newPos = start + 1;
            target.setSelectionRange(newPos, newPos);
            
            // Trigger React state updates
            target.dispatchEvent(new Event('input', { bubbles: true }));
            target.dispatchEvent(new Event('change', { bubbles: true }));
          } else {
            // For type="number", we can't easily prevent and replace with comma 
            // if the browser locale expects comma, because target.value only accepts dots in JS.
            // But usually the browser DOES accept the dot key from keypad and translates it.
            // If it doesn't, one trick is to briefly change to type text, insert, and change back.
            // For now, the non-number type fix covers many of our custom forms.
          }
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, []);

  React.useEffect(() => {
    setShowMandatorySettings(!!isProfileIncomplete);
  }, [isProfileIncomplete]);

  if (!isAuthReady) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/student-register" element={<StudentClassroomRegister />} />
        <Route path="/catalogo" element={<TakeawayCatalog />} />
        <Route path="/select-profile" element={<ProfileSelector />} />
        <Route path="/blocked-access" element={<BlockedAccess />} />
        <Route path="/" element={<RedirectHandler />} />

        <Route element={<ProtectedRoute allowedProfiles={[Profile.CREATOR]} />}>
          <Route path="/creator" element={<CreatorLayout />}>
            <Route path="dashboard" element={<CreatorDashboard />} />
            <Route path="user-manager" element={<UserManager />} />
            <Route path="maintenance" element={<SupportMaintenance />} />
            <Route path="profile" element={<MyProfile />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedProfiles={[Profile.ADMIN]} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="teachers" element={<TeacherManager />} />
            <Route path="products" element={<ProductManager />} />
            <Route path="suppliers" element={<SupplierManager />} />
            <Route path="events" element={<EventManager />} />
            <Route path="service-planner" element={<ServicePlanner />} />
            <Route path="assignments" element={<AssignmentManager />} />
            <Route path="expenses" element={<ExpenseManager />} />
            <Route path="expenses/:teacher_id" element={<ExpenseDetailByTeacher />} />
            <Route path="company" element={<CompanyData />} />
            <Route path="classrooms" element={<ClassroomManager />} />
            <Route path="academic-years" element={<AcademicYearManager />} />
            <Route path="support" element={<SupportMaintenance />} />
            <Route path="dining-services" element={<DiningServiceManager />} />
            <Route path="dining-view" element={<DiningServiceView />} />
            <Route path="messaging" element={<Messaging />} />
            <Route path="profile" element={<MyProfile />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedProfiles={[Profile.ALMACEN]} />}>
          <Route path="/almacen" element={<ManagerLayout />}>
              <Route path="dashboard" element={<ManagerDashboard />} />
              <Route path="process-orders/:eventId?" element={<ProcessOrders />} />
              <Route path="warehouse-order/:eventId?" element={<WarehouseOrder />} />
              <Route path="economato" element={<EconomatoManager />} />
              <Route path="mini-economato" element={<MiniEconomato />} />
              <Route path="dining-reservations" element={<DiningReservations />} />
              <Route path="dining-view" element={<DiningServiceView />} />
              <Route path="order-history" element={<OrderHistory />} />
              <Route path="cleanup" element={<DataCleanupManager />} />
              <Route path="products" element={<ProductManager />} />
              <Route path="product-metadata" element={<ProductMetadataManager />} />
              <Route path="suppliers" element={<SupplierManager />} />
              <Route path="messaging" element={<Messaging />} />
              <Route path="profile" element={<MyProfile />} />
              <Route index element={<Navigate to="dashboard" replace />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedProfiles={[Profile.TEACHER, Profile.ALMACEN, Profile.ADMIN]} />}>
          <Route path="/teacher" element={<TeacherLayout />}>
              <Route path="dashboard" element={<TeacherDashboard />} />
              <Route path="service-planner" element={<ServiceViewer />} />
              <Route path="order-portal" element={<OrderPortal />} />
              <Route path="order-portal/transfers" element={<TransferPortal />} />
              <Route path="order-portal/new/:eventId" element={<OrderForm />} />
              <Route path="order-portal/edit/:orderId" element={<OrderForm />} />
              <Route path="order-history" element={<TeacherOrderHistory />} />
              <Route path="sales" element={<SalesManager />} />
              <Route path="takeaway-sales" element={<TakeawaySales />} />
              <Route path="takeaway-catalog" element={<TakeawayCatalog />} />
              <Route path="reservations" element={<ReservationManager />} />
              <Route path="dining-view" element={<DiningServiceView />} />
              <Route path="notifications" element={<NotificationManager />} />
              <Route path="recipes" element={<RecipeManager />} />
              <Route path="recipes/new" element={<RecipeForm />} />
              <Route path="recipes/edit/:recipeId" element={<RecipeForm />} />
              <Route path="mini-economato" element={<MiniEconomato />} />
              <Route path="aula" element={<ClassroomList />} />
              <Route path="messaging" element={<Messaging />} />
              <Route path="profile" element={<MyProfile />} />
              <Route index element={<Navigate to="dashboard" replace />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedProfiles={[Profile.SALES_MANAGER]} />}>
          <Route path="/sales_manager" element={<TeacherLayout />}>
              <Route path="dashboard" element={<SalesDashboard />} />
              <Route path="takeaway-catalog" element={<TakeawayCatalog />} />
              <Route path="reservations" element={<ReservationManager />} />
              <Route path="sales-history" element={<TakeawaySales />} />
              <Route path="messaging" element={<Messaging />} />
              <Route path="profile" element={<MyProfile />} />
              <Route index element={<Navigate to="dashboard" replace />} />
          </Route>
        </Route>
        
        <Route element={<ProtectedRoute allowedProfiles={[Profile.STUDENT, Profile.CUSTOMER]} />}>
          <Route path="/student" element={<StudentLayout />}>
              <Route path="dashboard" element={<StudentDashboard />} />
              <Route path="takeaway-catalog" element={<TakeawayCatalog />} />
              <Route path="my-reservations" element={<MyReservations />} />
              <Route path="teacher-dashboard" element={<TeacherDashboard />} />
              <Route path="order-portal" element={<OrderPortal />} />
              <Route path="order-portal/new/:eventId" element={<OrderForm />} />
              <Route path="order-portal/edit/:orderId" element={<OrderForm />} />
              <Route path="order-history" element={<TeacherOrderHistory />} />
              <Route path="recipes" element={<RecipeManager />} />
              <Route path="recipes/new" element={<RecipeForm />} />
              <Route path="recipes/edit/:recipeId" element={<RecipeForm />} />
              <Route path="almacen-dashboard" element={<ManagerDashboard />} />
              <Route path="process-orders/:eventId?" element={<ProcessOrders />} />
              <Route path="economato" element={<EconomatoManager />} />
              <Route path="mini-economato" element={<MiniEconomato />} />
              <Route path="almacen-order-history" element={<OrderHistory />} />
              <Route path="products" element={<ProductManager />} />
              <Route path="suppliers" element={<SupplierManager />} />
              <Route path="messaging" element={<Messaging />} />
              <Route path="profile" element={<MyProfile />} />
              <Route index element={<Navigate to="dashboard" replace />} />
          </Route>
        </Route>

        <Route path="*" element={<RedirectHandler />} />
      </Routes>
      {showMandatorySettings && <SettingsModal onClose={() => setShowMandatorySettings(false)} />}
    </>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider>
          <NavigationProvider>
            <CompanyProvider>
              <CreatorProvider>
                <DataProvider>
                  <ErrorBoundary>
                    <AppContent />
                  </ErrorBoundary>
                </DataProvider>
              </CreatorProvider>
            </CompanyProvider>
          </NavigationProvider>
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
