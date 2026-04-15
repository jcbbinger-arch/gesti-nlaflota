import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../../components/Sidebar';
import { Header } from '../../components/Header';
import { ImpersonationBanner } from '../../components/ImpersonationBanner';
import { useAuth } from '../../contexts/AuthContext';
import { PrintHeader } from '../../components/PrintHeader';
import { useCompany } from '../../contexts/CompanyContext';
import { useData } from '../../contexts/DataContext';
import { Profile } from '../../types';
import { PrintFooter } from '../../components/PrintFooter';

export const ManagerLayout: React.FC = () => {
  const { isImpersonating } = useAuth();
  const { companyInfo } = useCompany();
  const { users } = useData();
  const managerUser = users.find(u => u.id === companyInfo.manager_user_id);
  
  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <ImpersonationBanner />
        <main className={`flex-1 overflow-x-hidden overflow-y-auto ${isImpersonating ? 'pt-10' : ''}`}>
          <PrintHeader companyInfo={companyInfo} managerUser={managerUser} />
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