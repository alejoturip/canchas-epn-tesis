import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import NotificacionesBell from '../components/NotificacionesBell';
import MSym from '../components/MSym';
import { FEATURES } from '../config/features';
import { MARCA } from '../config/marca';

// `flag: null` = siempre visible. Con un flag, aparece solo si está prendido.
const menuItems = [
  { icon: 'dashboard',        label: 'Panel',       path: '/admin',             flag: null           },
  { icon: 'stadium',          label: 'Escenarios',  path: '/admin/canchas',     flag: null           },
  { icon: 'event_available',  label: 'Reservas',    path: '/admin/reservas',    flag: null           },
  { icon: 'payments',         label: 'Pagos',       path: '/admin/pagos',       flag: 'PAGOS'        },
  { icon: 'qr_code_scanner',  label: 'Validar QR',  path: '/admin/validar',     flag: null           },
  { icon: 'event_busy',       label: 'Bloqueos',    path: '/admin/bloqueos',    flag: null           },
  { icon: 'storefront',       label: 'Implementos', path: '/admin/productos',   flag: 'TIENDA'       },
  { icon: 'backpack',         label: 'Préstamos',   path: '/admin/prestamos',   flag: 'TIENDA'       },
  { icon: 'redeem',           label: 'Premios',     path: '/admin/premios',     flag: 'FIDELIZACION' },
  { icon: 'sell',             label: 'Promociones', path: '/admin/promociones', flag: 'PROMOCIONES'  },
  { icon: 'campaign',         label: 'Sponsors',    path: '/admin/sponsors',    flag: 'SPONSORS'     },
  { icon: 'trophy',           label: 'Torneos',     path: '/admin/torneos',     flag: 'TORNEOS'      },
  { icon: 'support_agent',    label: 'Soporte',     path: '/admin/soporte',     flag: 'SOPORTE'      },
  { icon: 'manage_accounts',  label: 'Usuarios',    path: '/admin/usuarios',    flag: null           },
].filter((m) => m.flag === null || FEATURES[m.flag]);

// El guardia solo ve la pantalla de escanear. Lo de abajo es cosmético: quien
// realmente lo frena es `ProtectedRoute` en las rutas y el RLS en la base.
const RUTAS_GUARDIA = ['/admin/validar'];
const menuPara = (rol) =>
  rol === 'guardia' ? menuItems.filter((m) => RUTAS_GUARDIA.includes(m.path)) : menuItems;

function SidebarContent({ user, perfil, location, onClose, onLogout }) {
  const items = menuPara(perfil?.rol);
  return (
    <div className="flex flex-col h-full">
      {/* Logo + close (solo en mobile) */}
      <div className="p-6 border-b border-line flex items-center justify-between">
        <div>
          <img src={MARCA.logoCompacto} alt={MARCA.logoAlt} className="h-20 w-auto object-contain mb-1" />
          <p className="text-xs text-surface-400">
            {perfil?.rol === 'guardia' ? 'Control de acceso' : 'Panel de Gestión Deportiva'}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-2 rounded-lg hover:bg-surface-700 text-surface-400 hover:text-ink transition-colors"
          >
            <MSym name="close" className="text-[22px]" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium
                ${isActive
                  ? 'bg-brand-500/10 text-brand-600 border border-brand-300'
                  : 'text-surface-300 hover:text-ink hover:bg-surface-850 border border-transparent'
                }`}
            >
              <MSym name={item.icon} className={`text-[22px] flex-shrink-0 ${isActive ? 'text-brand-600' : 'text-surface-400'}`} fill={isActive} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User + logout */}
      <div className="p-4 border-t border-line">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-display text-lg flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #1E3E72, #DA1F26)' }}>
            {user?.user_metadata?.nombre?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-ink truncate">{user?.user_metadata?.nombre || 'Usuario'}</p>
            <p className="text-xs text-pitch font-semibold">
              {perfil?.rol === 'guardia' ? 'Guardia' : 'Administrador'}
            </p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-700 rounded-xl transition-colors text-sm font-medium border border-red-300"
        >
          <MSym name="logout" className="text-[18px]" /> Cerrar Sesión
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const { user, perfil } = useAuth();
  const location = useLocation();
  const [drawerAbierto, setDrawerAbierto] = useState(false);

  const handleLogout = () => {
    localStorage.clear();
    window.location.replace('/login');
  };

  return (
    <div className="min-h-screen bg-surface-950 flex">

      {/* ── Sidebar desktop (fijo, siempre visible) ── */}
      <aside className="hidden md:flex w-64 bg-surface-900 border-r border-line flex-col flex-shrink-0 sticky top-0 h-screen">
        <SidebarContent
          user={user}
          perfil={perfil}
          location={location}
          onClose={null}
          onLogout={handleLogout}
        />
      </aside>

      {/* ── Drawer mobile (overlay) ── */}
      <AnimatePresence>
        {drawerAbierto && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerAbierto(false)}
              className="md:hidden fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
            />
            {/* Panel */}
            <motion.div
              key="drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="md:hidden fixed left-0 top-0 bottom-0 z-50 w-72 bg-surface-900 border-r border-line flex flex-col"
            >
              <SidebarContent
                user={user}
                perfil={perfil}
                location={location}
                onClose={() => setDrawerAbierto(false)}
                onLogout={handleLogout}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Área principal ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar mobile */}
        <header className="md:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-surface-900/95 backdrop-blur-md border-b border-line">
          <button
            onClick={() => setDrawerAbierto(true)}
            className="p-2 rounded-xl hover:bg-surface-700 text-surface-300 hover:text-ink transition-colors"
          >
            <MSym name="menu" className="text-[22px]" />
          </button>
          <img src={MARCA.logoCompacto} alt={MARCA.logoAlt} className="h-11 w-auto object-contain" />
          <div className="ml-auto flex items-center gap-2">
            {/* 🔔 Notificaciones */}
            <NotificacionesBell />
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-500 to-accent flex items-center justify-center text-white text-sm font-bold">
              {user?.user_metadata?.nombre?.charAt(0) || 'A'}
            </div>
          </div>
        </header>

        {/* Top bar desktop (solo campana de notificaciones) */}
        <header className="hidden md:flex sticky top-0 z-30 items-center justify-end px-8 py-3 bg-surface-900/70 backdrop-blur-md border-b border-line">
          <NotificacionesBell />
        </header>

        {/* Contenido */}
        <main className="flex-1 overflow-y-auto">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="p-4 md:p-8 max-w-7xl mx-auto"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
