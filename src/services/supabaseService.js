/**
 * supabaseService.js
 * Capa de acceso a datos — centraliza todas las queries de Supabase.
 * Importa estas funciones desde tus páginas/hooks en lugar de llamar
 * directamente a supabase para facilitar el testing y el mantenimiento.
 */

import { supabase } from '../lib/supabase';

// ── Canchas ──────────────────────────────────────────────────────────────────

export const getCanchasActivas = () =>
  supabase.from('canchas').select('*').eq('activa', true).order('id');

export const getAllCanchas = () =>
  supabase.from('canchas').select('*').order('created_at', { ascending: false });

export const getCanchaById = (id) =>
  supabase.from('canchas').select('*').eq('id', id).single();

export const createCancha = (data) =>
  supabase.from('canchas').insert([data]);

export const updateCancha = (id, data) =>
  supabase.from('canchas').update(data).eq('id', id);

export const deleteCancha = (id) =>
  supabase.from('canchas').delete().eq('id', id);

// ── Reservas ─────────────────────────────────────────────────────────────────

export const getReservasByUser = (userId) =>
  supabase
    .from('reservas')
    .select('*, canchas(nombre, imagen_url)')
    .eq('perfil_id', userId)
    .order('fecha', { ascending: false });

export const getAllReservas = () =>
  supabase
    .from('reservas')
    .select('*, canchas(nombre), perfiles(nombre, email)')
    .order('fecha', { ascending: false });

export const createReserva = (data) =>
  supabase.from('reservas').insert([data]);

export const updateReservaEstado = (id, estado) =>
  supabase.from('reservas').update({ estado }).eq('id', id);

// ── Productos ─────────────────────────────────────────────────────────────────

export const getProductosActivos = () =>
  supabase.from('productos_tienda').select('*').eq('activa', true).gt('stock', 0);

export const getAllProductos = () =>
  supabase.from('productos_tienda').select('*').order('created_at', { ascending: false });

// ── Préstamos de implementos ─────────────────────────────────────────────────
// Versión TESIS: los implementos NO se venden, se PRESTAN contra una reserva.
// Flujo: solicitado → aprobado → prestado → devuelto (ver prestamos_implementos.sql).

/** Catálogo completo de implementos activos (incluye los que están sin stock). */
export const getImplementos = () =>
  supabase.from('productos_tienda').select('*').eq('activa', true).order('nombre');

/** Reservas del usuario sobre las que puede pedir implementos (de hoy en adelante). */
export const getReservasParaPrestamo = (userId) => {
  const hoy = new Date().toISOString().split('T')[0];
  return supabase
    .from('reservas')
    .select('id, fecha, hora_inicio, hora_fin, estado, canchas(nombre)')
    .eq('perfil_id', userId)
    .gte('fecha', hoy)
    .in('estado', ['pendiente', 'confirmada'])
    .order('fecha', { ascending: true })
    .order('hora_inicio', { ascending: true });
};

const PRESTAMO_SELECT =
  '*, reservas(fecha, hora_inicio, hora_fin, estado, canchas(nombre)), prestamo_items(*)';

/** Préstamos del estudiante, con su reserva y sus ítems. */
export const getPrestamosByUser = (userId) =>
  supabase
    .from('prestamos')
    .select(PRESTAMO_SELECT)
    .eq('perfil_id', userId)
    .order('created_at', { ascending: false });

/** Todos los préstamos + datos del estudiante (admin). */
export const getAllPrestamos = () =>
  supabase
    .from('prestamos')
    .select(`${PRESTAMO_SELECT}, perfiles!prestamos_perfil_id_fkey(nombre, email, telefono)`)
    .order('created_at', { ascending: false });

/**
 * Crea la solicitud y sus ítems en dos pasos (la cabecera primero, porque los
 * ítems necesitan su id). Si falla la carga de ítems se borra la cabecera para
 * no dejar un préstamo vacío dando vueltas.
 */
export const crearPrestamo = async ({ perfil_id, reserva_id, observaciones }, items) => {
  const { data: prestamo, error } = await supabase
    .from('prestamos')
    .insert([{ perfil_id, reserva_id, observaciones: observaciones || null }])
    .select()
    .single();
  if (error) return { data: null, error };

  const filas = items.map((i) => ({
    prestamo_id: prestamo.id,
    producto_id: i.id,
    nombre: i.nombre,
    valor_reposicion: Number(i.precio) || 0,
    cantidad: i.cantidad,
  }));

  const { error: errItems } = await supabase.from('prestamo_items').insert(filas);
  if (errItems) {
    await supabase.from('prestamos').delete().eq('id', prestamo.id);
    return { data: null, error: errItems };
  }
  return { data: prestamo, error: null };
};

/** El estudiante da de baja su propia solicitud (solo si sigue 'solicitado'). */
export const cancelarPrestamo = (id) =>
  supabase.from('prestamos').update({ estado: 'cancelado' }).eq('id', id);

/** Cambia el estado del préstamo (admin). `extra` lleva motivo/nota/atendido_por. */
export const updatePrestamoEstado = (id, estado, extra = {}) =>
  supabase.from('prestamos').update({ estado, ...extra }).eq('id', id);

/** Cuántas unidades de un ítem volvieron (admin, al registrar la devolución). */
export const updatePrestamoItemDevueltos = (id, devueltos) =>
  supabase.from('prestamo_items').update({ devueltos }).eq('id', id);

// ── Personal, estudiantes y configuración (admin) ────────────────────────────

/** Fila única con los parámetros del sistema (sanciones, umbral, días). */
export const getConfiguracion = () =>
  supabase.from("configuracion").select("*").eq("id", true).maybeSingle();

export const updateConfiguracion = (cambios) =>
  supabase.from("configuracion").update({ ...cambios, actualizado_at: new Date().toISOString() }).eq("id", true);

/** Estudiantes con su estado sancionatorio. */
export const getEstudiantes = () =>
  supabase
    .from("perfiles")
    .select("id, nombre, apellido, email, codigo_unico, facultad, ausencias, ausencias_totales, bloqueado_hasta")
    .eq("rol", "cliente")
    .order("nombre");

/** Personal: administradores y guardias. */
export const getPersonal = () =>
  supabase
    .from("perfiles")
    .select("id, nombre, email, rol, activo, created_at")
    .in("rol", ["admin", "guardia"])
    .order("rol");

/** Levanta la sanción de un estudiante y le pone el contador en cero. */
export const levantarSancion = (perfilId) =>
  supabase.from("perfiles").update({ bloqueado_hasta: null, ausencias: 0 }).eq("id", perfilId);

/** Sanciona a mano hasta una fecha (formato YYYY-MM-DD). */
export const aplicarSancion = (perfilId, hasta) =>
  supabase.from("perfiles").update({ bloqueado_hasta: hasta }).eq("id", perfilId);

/** Habilita o deshabilita a un guardia sin borrarle la cuenta. */
export const setPersonalActivo = (perfilId, activo) =>
  supabase.from("perfiles").update({ activo }).eq("id", perfilId);

/** Cambia el rol de una cuenta (solo el admin puede: lo cuida un trigger). */
export const setRol = (perfilId, rol) =>
  supabase.from("perfiles").update({ rol }).eq("id", perfilId);

// ── Sponsors ─────────────────────────────────────────────────────────────────

export const getSponsors = () =>
  supabase.from('sponsors').select('*').order('created_at', { ascending: true });

// ── Torneos ───────────────────────────────────────────────────────────────────

export const getTorneos = () =>
  supabase.from('torneos').select('*').order('fecha_inicio', { ascending: true });

export const inscribirseATorneo = (torneoId, userId) =>
  supabase.from('inscripciones_torneos').insert([{ torneo_id: torneoId, user_id: userId }]);

// ── Premios / Puntos ──────────────────────────────────────────────────────────

export const getPremiosByUser = (userId) =>
  supabase.from('premios').select('*').eq('perfil_id', userId).order('created_at', { ascending: false });

export const getPuntosUsuario = (userId) =>
  supabase.from('perfiles').select('reservas_completadas').eq('id', userId).single();

// ── Soporte ───────────────────────────────────────────────────────────────────

export const createTicketSoporte = (data) =>
  supabase.from('tickets_soporte').insert([data]);

// ── Perfil ────────────────────────────────────────────────────────────────────

export const getPerfilCompleto = (userId) =>
  supabase.from('perfiles').select('*').eq('id', userId).single();

export const updatePerfil = (userId, data) =>
  supabase.from('perfiles').update(data).eq('id', userId);

/** Cuenta total de reservas del usuario (sin traer filas). */
export const countReservasUsuario = (userId) =>
  supabase
    .from('reservas')
    .select('id', { count: 'exact', head: true })
    .eq('perfil_id', userId);

/** Cuenta reservas en un estado concreto (ej: 'completada'). */
export const countReservasPorEstado = (userId, estado) =>
  supabase
    .from('reservas')
    .select('id', { count: 'exact', head: true })
    .eq('perfil_id', userId)
    .eq('estado', estado);

/** Cuenta premios obtenidos por el usuario. */
export const countPremiosUsuario = (userId) =>
  supabase
    .from('premios')
    .select('id', { count: 'exact', head: true })
    .eq('perfil_id', userId);

/** Cuenta torneos en los que el usuario está inscrito (ojo: usa user_id). */
export const countTorneosUsuario = (userId) =>
  supabase
    .from('inscripciones_torneos')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

/** Próxima reserva del usuario (pendiente/confirmada, de hoy en adelante). */
export const getProximaReserva = (userId) => {
  const hoy = new Date().toISOString().split('T')[0];
  return supabase
    .from('reservas')
    .select('fecha, hora_inicio, canchas(nombre)')
    .eq('perfil_id', userId)
    .gte('fecha', hoy)
    .in('estado', ['pendiente', 'confirmada'])
    .order('fecha', { ascending: true })
    .order('hora_inicio', { ascending: true })
    .limit(1)
    .maybeSingle();
};

// ── Pagos ─────────────────────────────────────────────────────────────────────

/** Crea una solicitud de pago (estado pendiente). */
export const createPago = (data) =>
  supabase.from('pagos').insert([data]).select().single();

/** Adjunta el comprobante y el método a un pago pendiente. */
export const updatePagoComprobante = (id, comprobante_url, metodo_pago) =>
  supabase.from('pagos').update({ comprobante_url, metodo_pago }).eq('id', id);

/** Cambia el estado de un pago (aprobado | rechazado). */
export const updatePagoEstado = (id, estado) =>
  supabase.from('pagos').update({ estado }).eq('id', id);

/** Lista todos los pagos con datos de la reserva y el cliente (admin). */
export const getAllPagos = () =>
  supabase
    .from('pagos')
    .select('*, perfiles(nombre, email), reservas(fecha, hora_inicio, hora_fin, canchas(nombre))')
    .order('created_at', { ascending: false });

// ── Reservas / QR de acceso ─────────────────────────────────────────────────

export const getReservaById = (id) =>
  supabase
    .from('reservas')
    .select(
      '*, canchas(nombre, imagen_url, direccion),' +
      'perfiles!reservas_perfil_id_fkey(nombre, apellido, codigo_unico, facultad, carrera)'
    )
    .eq('id', id)
    .single();

export const getReservaByToken = (token) =>
  supabase
    .from('reservas')
    .select('*, canchas(nombre), perfiles(nombre, email, codigo_unico)')
    .eq('acceso_token', token)
    .maybeSingle();

/** Registra el ingreso a la cancha y guarda el historial de validación. */
export const marcarIngreso = async (reserva, validadoPor) => {
  const { error: errReserva } = await supabase
    .from('reservas')
    .update({ ingreso_at: new Date().toISOString(), validado_por: validadoPor })
    .eq('id', reserva.id);
  if (errReserva) return { error: errReserva };

  const { error } = await supabase.from('validaciones_acceso').insert([{
    reserva_id: reserva.id,
    validado_por: validadoPor,
    estado_final: 'ingreso',
  }]);
  return { error };
};
