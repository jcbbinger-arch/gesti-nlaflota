import React from 'react';
import { Company, User } from '../types';

interface PrintHeaderProps {
  companyInfo: Company;
  managerUser?: User;
  currentUser?: User;
}

export const PrintHeader: React.FC<PrintHeaderProps> = ({ companyInfo, managerUser, currentUser }) => {
  return (
    <div className="hidden print:block mb-8 border-b-2 border-black pb-4">
      <div className="flex justify-between items-start">
        <div className="flex flex-col space-y-2">
          <img src={companyInfo.print_logo} alt="Logo Empresa" className="max-w-[150px] max-h-[75px]" />
          {currentUser?.instituteLogo && (
            <img src={currentUser.instituteLogo} alt="Logo Instituto" className="max-w-[120px] max-h-[60px]" />
          )}
        </div>
        <div className="text-right text-xs">
          <h2 className="font-bold text-lg">{currentUser?.instituteName || companyInfo.name}</h2>
          <p>{companyInfo.address}</p>
          {currentUser?.teacherName && (
            <p className="mt-1"><strong>Profesor:</strong> {currentUser.teacherName}</p>
          )}
          {managerUser && (
            <div className="mt-2">
              <p><strong>Contacto Almacén:</strong> {managerUser.name}</p>
              <p><strong>Teléfono:</strong> {companyInfo.phone}</p>
              <p><strong>Email:</strong> {managerUser.email}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};