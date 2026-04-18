import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/Card';

export const SupportMaintenance: React.FC = () => {
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(false);

    // Permitir acceso si es Creador (o superusuario) o Administrador
    const canAccess = currentUser && (currentUser.profiles.includes('creator') || currentUser.profiles.includes('admin') || currentUser.isMaintainer);

    if (!canAccess) {
        return <Navigate to="/blocked-access" replace />;
    }

    const handleBackup = async () => {
        setLoading(true);
        try {
            const token = await currentUser.getIdToken();
            const response = await fetch('/api/backup', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Error al generar la copia');
            
            const data = await response.json();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup-${new Date().toISOString()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error(error);
            alert('Error al descargar la copia de seguridad');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold mb-6">Soporte y Mantenimiento Avanzado</h1>
            <Card>
                <div className="p-4">
                    <h2 className="text-xl font-semibold mb-4">Copia de Seguridad</h2>
                    <p className="mb-4">Genera una copia de seguridad filtrada por los últimos 3 cursos académicos.</p>
                    <button 
                        onClick={handleBackup} 
                        disabled={loading}
                        className="bg-primary-600 text-white py-2 px-4 rounded hover:bg-primary-700 disabled:opacity-50"
                    >
                        {loading ? 'Generando...' : 'Descargar Copia de Seguridad JSON'}
                    </button>
                </div>
            </Card>
        </div>
    );
};
