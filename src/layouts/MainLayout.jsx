import { Outlet, Link, NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import SponsorBanner from '../components/SponsorBanner';
import NotificacionesBell from '../components/NotificacionesBell';
import MSym from '../components/MSym';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { FEATURES } from '../config/features';
import { MARCA } from '../config/marca';
import { perfilCompleto } from '../utils/perfil';
import CompletarPerfil from '../components/CompletarPerfil';

// Navegación principal (desktop) y barra inferior (mobile).
// `flag: null` = siempre visible. Con un flag, aparece solo si está prendido.
const NAV = [
  { to: '/',             icon: 'home',         label: 'Inicio',   flag: null           },
  { to: '/mis-reservas', icon: 'event',        label: 'Reservas', flag: null           },
  { to: '/tienda',       icon: 'sports_soccer',label: 'Implementos', flag: 'TIENDA'    },
  { to: '/premios',      icon: 'star',         label: 'Premios',  flag: 'FIDELIZACION' },
  { to: '/torneos',      icon: 'trophy',       label: 'Torneos',  flag: 'TORNEOS'      },
  { to: '/soporte',      icon: 'support_agent',label: 'Soporte',  flag: 'SOPORTE'      },
].filter((n) => n.flag === null || FEATURES[n.flag]);

// La barra superior muestra un subconjunto más compacto. Se arma sobre el NAV
// ya filtrado, así nunca queda un link a una ruta apagada.
const NAV_TOP = NAV.filter((n) => ['/', '/mis-reservas', '/tienda', '/torneos'].includes(n.to));

export default function MainLayout() {
  const { user, perfil, loading } = useAuth();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      // 1. Intentamos cerrar sesión formalmente en la nube
      await supabase.auth.signOut();
    } catch (error) {
      // Si Supabase da error por un token corrupto, lo ignoramos y seguimos
      console.error('Error interno ignorado:', error);
    } finally {
      // 2. MODO NUCLEAR: Destruimos toda la memoria del navegador a la fuerza
      localStorage.clear();
      sessionStorage.clear();

      // 3. Forzamos una recarga completa de la página hacia el login
      window.location.href = '/login';
    }
  };

  const nombre = user?.user_metadata?.nombre || 'Estudiante';

  // Perfil obligatorio: el estudiante recién registrado no entra a la app hasta
  // cargar sus datos. La base rechaza igual la reserva incompleta; esto evita
  // que se entere recién al intentar reservar. El admin no pasa por acá.
  const esPersonal = perfil?.rol === 'admin' || perfil?.rol === 'guardia';
  if (!loading && perfil && !esPersonal && !perfilCompleto(perfil)) {
    return <CompletarPerfil />;
  }

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col font-sans">

      {/* 🌟 Header Premium (Efecto Glassmorphism) */}
      <header className="sticky top-0 z-50 bg-surface-900/95 backdrop-blur-md border-b border-line shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-20 md:h-24 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link to="/" className="hover:scale-105 transition-transform flex-shrink-0">
            <img src={MARCA.logoCompacto} alt={MARCA.logoAlt} className="h-14 md:h-16 w-auto object-contain" />
          </Link>

          {/* Nav desktop */}
          <nav className="hidden lg:flex items-center gap-1 mr-auto ml-6">
            {NAV_TOP.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === '/'}
                className={({ isActive }) =>
                  'px-4 py-2 rounded-xl text-sm font-semibold transition-colors ' +
                  (isActive ? 'text-ink bg-surface-850' : 'text-surface-400 hover:text-ink hover:bg-surface-850')
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          {/* Perfil y Botón de Salida */}
          <div className="flex items-center gap-4 md:gap-5 flex-shrink-0">

            {/* Saludo */}
            <div className="hidden sm:block text-right">
              <p className="text-xs text-surface-400 font-medium">Bienvenido,</p>
              <p className="font-bold text-brand-500">{nombre}</p>
            </div>

            {/* 🔔 Notificaciones */}
            <NotificacionesBell />

            <div className="flex items-center gap-3 border-l border-line pl-4 md:pl-5">
              {/* Avatar → Mi Perfil */}
              <Link
                to="/perfil"
                title="Mi Perfil"
                className="w-10 h-10 rounded-full flex items-center justify-center text-white overflow-hidden hover:ring-2 hover:ring-brand-500/50 transition-all"
                style={{ background: 'linear-gradient(135deg, #1E3E72, #DA1F26)' }}
              >
                {user?.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-display text-lg leading-none">{nombre.charAt(0).toUpperCase()}</span>
                )}
              </Link>

              {/* Botón Cerrar Sesión Nuclear */}
              <button
                onClick={handleLogout}
                className="p-2.5 text-surface-400 hover:text-red-700 hover:bg-red-500/10 rounded-xl transition-all duration-300 group"
                title="Cerrar Sesión"
              >
                <MSym name="logout" className="text-[22px] group-hover:scale-110 transition-transform" />
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* 🎯 Banner de Sponsors — apagado en la versión tesis */}
      {FEATURES.SPONSORS && <SponsorBanner />}

      {/* 📄 Contenido Dinámico */}
      <main className="flex-1 overflow-x-hidden relative pb-20 md:pb-0">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <Outlet />
        </motion.div>
      </main>

      {/* 📱 Navegación inferior (mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface-900/95 backdrop-blur-md border-t border-line safe-area-bottom">
        <div className="grid grid-cols-6 h-16">
          {NAV.map((n) => {
            const active = location.pathname === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={"flex flex-col items-center justify-center gap-0.5 transition-colors " + (active ? 'text-brand-500' : 'text-surface-500 hover:text-surface-300')}
              >
                <MSym name={n.icon} className={"text-[22px] " + ''} fill={active} />
                <span className="text-[9px] font-medium">{n.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

    </div>
  );
}
