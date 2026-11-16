/**
 * routeConfig.js
 * Definición centralizada de todas las rutas de la app.
 * Úsala para generar breadcrumbs, menús dinámicos o Guards.
 *
 * Versión TESIS: las rutas de módulos apagados se filtran con los feature flags
 * (ver config/features.js). Las entradas siguen escritas acá — NO se borran —
 * así prender un módulo vuelve a mostrarlas sin tocar este archivo.
 * `flag: null` = siempre visible.
 */
import { FEATURES } from '../config/features';

const activas = (rutas) => rutas.filter((r) => !r.flag || FEATURES[r.flag]);

export const PUBLIC_ROUTES = [
  { path: '/login',               label: 'Iniciar Sesión' },
  { path: '/actualizar-password', label: 'Actualizar Contraseña' },
];

export const CLIENT_ROUTES = activas([
  { path: '/',             label: 'Inicio',       icon: 'home'                                    },
  { path: '/mis-reservas', label: 'Mis Reservas', icon: 'calendar'                                },
  { path: '/tienda',       label: 'Implementos',  icon: 'shop',            flag: 'TIENDA'         },
  { path: '/premios',      label: 'Premios',      icon: 'star',            flag: 'FIDELIZACION'   },
  { path: '/torneos',      label: 'Torneos',      icon: 'trophy',          flag: 'TORNEOS'        },
  { path: '/soporte',      label: 'Soporte',      icon: 'headset',         flag: 'SOPORTE'        },
  { path: '/sponsors',     label: 'Sponsors',     icon: 'heart-handshake', flag: 'SPONSORS'       },
  { path: '/perfil',       label: 'Mi Perfil',    icon: 'user'                                    },
]);

export const ADMIN_ROUTES = activas([
  { path: '/admin',               label: 'Dashboard',    icon: 'dashboard'                          },
  { path: '/admin/canchas',       label: 'Escenarios',   icon: 'calendar'                           },
  { path: '/admin/reservas',      label: 'Reservas',     icon: 'ticket'                             },
  { path: '/admin/pagos',         label: 'Pagos',        icon: 'credit-card', flag: 'PAGOS'         },
  { path: '/admin/validar',       label: 'Validar QR',   icon: 'qr-code'                            },
  { path: '/admin/bloqueos',      label: 'Bloqueos',     icon: 'calendar-off'                       },
  { path: '/admin/productos',     label: 'Implementos',  icon: 'store',       flag: 'TIENDA'        },
  { path: '/admin/prestamos',     label: 'Préstamos',    icon: 'backpack',    flag: 'TIENDA'        },
  { path: '/admin/premios',       label: 'Premios',      icon: 'gift',        flag: 'FIDELIZACION'  },
  { path: '/admin/torneos',       label: 'Torneos',      icon: 'trophy',      flag: 'TORNEOS'       },
  { path: '/admin/sponsors',      label: 'Sponsors',     icon: 'megaphone',   flag: 'SPONSORS'      },
  { path: '/admin/promociones',   label: 'Promociones',  icon: 'tag',         flag: 'PROMOCIONES'   },
  { path: '/admin/soporte',       label: 'Soporte',      icon: 'headset',     flag: 'SOPORTE'       },
  { path: '/admin/usuarios',      label: 'Usuarios',     icon: 'users'                              },
]);
