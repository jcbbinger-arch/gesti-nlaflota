import React from 'react';
import { Company, User } from '../types';

interface PrintHeaderProps {
  companyInfo: Company;
  managerUser?: User;
  currentUser?: User;
}

export const PrintHeader: React.FC<PrintHeaderProps> = ({ companyInfo, managerUser, currentUser }) => {
  // Use institute logo if available, otherwise company logo
  const logoSrc = currentUser?.instituteLogo || companyInfo.print_logo;
  
  return (
    <div className="hidden print:block mb-8 border-b-2 border-black pb-4">
      <div className="flex justify-between items-start">
        <div className="flex flex-col space-y-2">
          {logoSrc && (
            <img 
              src={logoSrc} 
              alt="Logo" 
              className="max-w-[200px] max-h-[100px] w-auto h-auto object-contain" 
              referrerPolicy="no-referrer"
            />
          )}
        </div>
        <div className="text-right text-[10px]">
          <h2 className="font-bold text-base uppercase tracking-tighter">{currentUser?.instituteName || companyInfo.name}</h2>
          <p className="opacity-70">{companyInfo.address}</p>
          {currentUser?.teacherName && (
            <div className="mt-2 bg-black text-white px-2 py-1 inline-block rounded">
              <p className="font-black">PROFESOR: {currentUser.teacherName.toUpperCase()}</p>
            </div>
          )}
          {managerUser && (
            <div className="mt-2 opacity-60">
              <p>Ref: {managerUser.name} | {companyInfo.phone}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};