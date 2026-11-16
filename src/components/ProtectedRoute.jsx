import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

/**
 * @param {boolean} requireAdmin  atajo para `roles={['admin']}` (se mantiene por compatibilidad)
 * @param {string[]} roles        roles que pueden entrar. Ej: ['admin','guardia']
 */
export default function ProtectedRoute({ requireAdmin = false, roles = null }) {
  const { user, perfil, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 text-brand animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const permitidos = roles || (requireAdmin ? ['admin'] : null);
  if (permitidos && !permitidos.includes(perfil?.rol)) {
    // El guardia no tiene "inicio" de estudiante: se lo manda a lo suyo.
    return <Navigate to={perfil?.rol === 'guardia' ? '/admin/validar' : '/'} replace />;
  }

  return <Outlet />;
}