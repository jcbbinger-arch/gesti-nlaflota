
import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/Card';
import { WarningIcon } from '../../components/icons';

export const BlockedAccess: React.FC<{ message?: string }> = ({ message }) => {
  return (
    <Card title="Acceso Restringido">
        <div className="text-center">
            <WarningIcon className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <p className="text-lg">
                {message || "No tienes acceso a esta sección en este momento."}
            </p>
            <Link to="../dashboard" className="mt-4 inline-block text-primary-600 hover:underline">
                Volver al Dashboard
            </Link>
        </div>
    </Card>
  );
};
