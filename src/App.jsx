import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
// Versión TESIS: los módulos apagados NO se borran, se saltean acá. Ver config/features.js
import { FEATURES } from './config/features';

// Layouts
import MainLayout from './layouts/MainLayout';
import AdminLayout from './layouts/AdminLayout';

// Páginas Públicas
const Login             = lazy(() => import('./pages/Login'));
const ActualizarPassword = lazy(() => import('./pages/ActualizarPassword'));

// ⛔ MÓDULOS APAGADOS EN LA TESIS
// Los archivos siguen en el repo, intactos y funcionando: acá solo se corta la
// referencia, que es lo que evita que Vite meta su código en el build (si el
// `import()` queda escrito, el chunk se genera igual aunque el flag esté en false,
// y el service worker se lo termina descargando al usuario).
// PARA PRENDER UNO: poné su flag en true en config/features.js Y descomentá su línea.

// Páginas Cliente
const Home        = lazy(() => import('./pages/Home'));
const MisReservas = lazy(() => import('./pages/MisReservas'));
const Tienda      = lazy(() => import('./pages/Tienda'));
const Recompensas = null; // lazy(() => import('./pages/Recompensas'));  ← FIDELIZACION
const Torneos     = null; // lazy(() => import('./pages/Torneos'));      ← TORNEOS
const TorneoDetalle = null; // lazy(() => import('./pages/TorneoDetalle')); ← TORNEOS
const Soporte     = lazy(() => import('./pages/Soporte'));
const Sponsors    = null; // lazy(() => import('./pages/Sponsors'));     ← SPONSORS
const Perfil      = lazy(() => import('./pages/Perfil'));
const CanchaDetalle = lazy(() => import('./pages/CanchaDetalle'));
const ReservaDetalle = lazy(() => import('./pages/ReservaDetalle'));

// Páginas Admin
const Dashboard        = lazy(() => import('./pages/admin/Dashboard'));
const CanchasAdmin     = lazy(() => import('./pages/admin/CanchasAdmin'));
const ReservasAdmin    = lazy(() => import('./pages/admin/ReservasAdmin'));
const PromocionesAdmin = lazy(() => import('./pages/admin/PromocionesAdmin'));
const ProductosAdmin   = lazy(() => import('./pages/admin/ProductosAdmin'));
const PrestamosAdmin   = lazy(() => import('./pages/admin/PrestamosAdmin'));
const BloqueosAdmin    = lazy(() => import('./pages/admin/BloqueosAdmin'));
const PremiosAdmin     = null; // lazy(() => import('./pages/admin/PremiosAdmin'));     ← FIDELIZACION
const SponsorsAdmin    = null; // lazy(() => import('./pages/admin/SponsorsAdmin'));    ← SPONSORS
const TorneosAdmin     = null; // lazy(() => import('./pages/admin/TorneosAdmin'));     ← TORNEOS
const TorneoDetalleAdmin = null; // lazy(() => import('./pages/admin/TorneoDetalleAdmin')); ← TORNEOS
const PagosAdmin       = null; // lazy(() => import('./pages/admin/PagosAdmin'));   ← PAGOS
const ValidarReserva   = lazy(() => import('./pages/admin/ValidarReserva'));
const SoporteAdmin     = lazy(() => import('./pages/admin/SoporteAdmin'));
const UsuariosAdmin    = lazy(() => import('./pages/admin/UsuariosAdmin'));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-surface-950">
    <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
  </div>
);

function App() {
  return (
    <AuthProvider>
      {/* 🔔 Toasts globales (tema oscuro premium) */}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3500,
          style: {
            background: '#FFFFFF',
            color: '#17202A',
            border: '1px solid #E2E8F0',
            borderRadius: '16px',
            padding: '12px 16px',
            fontSize: '14px',
            boxShadow: '0 4px 24px rgba(16,32,64,0.14)',
          },
          success: { iconTheme: { primary: '#0E9F6E', secondary: '#fff' } },
          error: { iconTheme: { primary: '#DA1F26', secondary: '#fff' } },
        }}
      />
      <Router>
       <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Rutas Públicas */}
            <Route path="/login"              element={<Login />} />
            <Route path="/actualizar-password" element={<ActualizarPassword />} />

            {/* Rutas para Clientes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<MainLayout />}>
                <Route path="/"             element={<Home />} />
                <Route path="/mis-reservas" element={<MisReservas />} />
                <Route path="/tienda"       element={<Tienda />} />
                {FEATURES.FIDELIZACION && <Route path="/premios"     element={<Recompensas />} />}
                {FEATURES.TORNEOS      && <Route path="/torneos"     element={<Torneos />} />}
                {FEATURES.TORNEOS      && <Route path="/torneos/:id" element={<TorneoDetalle />} />}
                <Route path="/soporte"      element={<Soporte />} />
                {FEATURES.SPONSORS     && <Route path="/sponsors"    element={<Sponsors />} />}
                <Route path="/perfil"       element={<Perfil />} />
                <Route path="/cancha/:id"   element={<CanchaDetalle />} />
                <Route path="/reserva/:id"  element={<ReservaDetalle />} />
              </Route>
            </Route>

            {/* Rutas para Admins */}
            <Route element={<ProtectedRoute requireAdmin={true} />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin"               element={<Dashboard />} />
                <Route path="/admin/canchas"       element={<CanchasAdmin />} />
                <Route path="/admin/reservas"      element={<ReservasAdmin />} />
                <Route path="/admin/promociones"   element={<PromocionesAdmin />} />
                <Route path="/admin/productos"     element={<ProductosAdmin />} />
                <Route path="/admin/prestamos"     element={<PrestamosAdmin />} />
                <Route path="/admin/bloqueos"      element={<BloqueosAdmin />} />
                {FEATURES.FIDELIZACION && <Route path="/admin/premios"     element={<PremiosAdmin />} />}
                {FEATURES.SPONSORS     && <Route path="/admin/sponsors"    element={<SponsorsAdmin />} />}
                {FEATURES.TORNEOS      && <Route path="/admin/torneos"     element={<TorneosAdmin />} />}
                {FEATURES.TORNEOS      && <Route path="/admin/torneos/:id" element={<TorneoDetalleAdmin />} />}
                {FEATURES.PAGOS       && <Route path="/admin/pagos"  element={<PagosAdmin />} />}

                <Route path="/admin/soporte"       element={<SoporteAdmin />} />
                <Route path="/admin/usuarios"      element={<UsuariosAdmin />} />
              </Route>
            </Route>

            {/* Validar QR: lo usan el admin Y el guardia de la puerta.
                Va en su propio bloque porque exige un rol distinto. */}
            <Route element={<ProtectedRoute roles={['admin', 'guardia']} />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin/validar" element={<ValidarReserva />} />
              </Route>
            </Route>

            {/* Cualquier ruta desconocida → al inicio (evita pantallas en blanco) */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
       </ErrorBoundary>
      </Router>
    </AuthProvider>
  );
}

export default App;
