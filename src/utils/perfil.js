/**
 * perfil.js — Qué significa "perfil completo".
 *
 * ⚠️ Esta lista tiene que coincidir con la del SQL. La validación de verdad está
 * en `fn_validar_reserva_estudiante` (supabase/politica_uso_escenarios.sql), que
 * rechaza la reserva si falta alguno de estos campos. Acá se repite para poder
 * mostrar la pantalla de bienvenida ANTES de que el estudiante intente reservar
 * y se lleve el error de la base. Si agregás un campo obligatorio, cambialo en
 * los dos lugares.
 */

export const CAMPOS_OBLIGATORIOS = ['nombre', 'apellido', 'codigo_unico', 'facultad', 'carrera'];

/** ¿El perfil tiene todo lo que hace falta para poder reservar? */
export const perfilCompleto = (perfil) =>
  !!perfil && CAMPOS_OBLIGATORIOS.every((c) => String(perfil[c] || '').trim() !== '');

/** Los campos que le faltan, para poder decírselo. */
export const camposFaltantes = (perfil) =>
  CAMPOS_OBLIGATORIOS.filter((c) => String(perfil?.[c] || '').trim() === '');
