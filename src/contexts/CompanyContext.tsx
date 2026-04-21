import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { Company } from '../types';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';

interface CompanyContextType {
  companyInfo: Company;
  setCompanyInfo: (info: Company) => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

const initialCompanyInfo: Company = {
  name: "IES Escuela de Hostelería",
  logo: "https://tailwindui.com/img/logos/mark.svg?color=indigo&shade=600",
  print_logo: "https://tailwindui.com/img/logos/mark.svg?color=black",
  cif: "Q1234567J",
  address: "Avenida de la Gastronomía s/n, 28001 Madrid",
  phone: "910 00 00 00",
  email: "contacto@ieshosteleria.edu",
  default_budget: 300,
  manager_user_id: 'user-2',
};

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [companyInfo, setCompanyInfoState] = useState<Company>(initialCompanyInfo);
  const { currentUser } = useAuth();

  useEffect(() => {
    const docRef = doc(db, 'settings', 'company');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setCompanyInfoState(docSnap.data() as Company);
      } else if (currentUser?.role === 'admin') {
        // Initialize if it doesn't exist and user is admin
        setDoc(docRef, initialCompanyInfo, { merge: true }).catch(console.error);
      }
    }, (error) => {
      console.error("Error fetching company info:", error);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const setCompanyInfo = async (info: Company) => {
    try {
      // Optimistic update
      setCompanyInfoState(info);
      await setDoc(doc(db, 'settings', 'company'), info, { merge: true });
    } catch (error) {
      console.error("Error updating company info:", error);
    }
  };

  const value = useMemo(() => ({ companyInfo, setCompanyInfo }), [companyInfo]);

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
};

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};