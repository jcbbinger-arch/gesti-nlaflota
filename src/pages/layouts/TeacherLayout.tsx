import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../../components/Sidebar';
import { Header } from '../../components/Header';
import { ImpersonationBanner } from '../../components/ImpersonationBanner';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { PrintHeader } from '../../components/PrintHeader';
import { useCompany } from '../../contexts/CompanyContext';
import { useData } from '../../contexts/DataContext';
import { Profile } from '../../types';
import { PrintFooter } from '../../components/PrintFooter';

export const TeacherLayout: React.FC = () => {
  const { isImpersonating, currentUser } = useAuth();
  const { setPrimaryColor } = useTheme();
  const location = useLocation();
  const { companyInfo } = useCompany();
  const { users } = useData();
  const managerUser = users.find(u => u.id === companyInfo.manager_user_id);

  const defaultColor = '#3b82f6'; // Default blue from theme
  const classroomColor = '#16a34a'; // Green

  useEffect(() => {
    if (location.pathname.startsWith('/teacher/aula')) {
      setPrimaryColor(classroomColor);
    } else {
      setPrimaryColor(defaultColor);
    }
    // Cleanup function to reset color when leaving the teacher section entirely
    return () => {
      setPrimaryColor(defaultColor);
    };
  }, [location.pathname, setPrimaryColor]);
  
  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <ImpersonationBanner />
        <main className={`flex-1 overflow-x-hidden overflow-y-auto ${isImpersonating ? 'pt-10' : ''}`}>
          <PrintHeader companyInfo={companyInfo} managerUser={managerUser} currentUser={currentUser || undefined} />
          <Header />
          <div className="container mx-auto px-6 py-8">
            <Outlet />
          </div>
          <PrintFooter />
        </main>
      </div>
    </div>
  );
};