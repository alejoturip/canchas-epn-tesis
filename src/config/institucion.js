/**
 * institucion.js — Datos de la institución y regla de acceso.
 * ---------------------------------------------------------------------------
 * Versión TESIS (Escuela Politécnica Nacional). El sistema es de uso interno:
 * solo se puede crear una cuenta con el correo institucional.
 *
 * ⚠️ Esto es la mitad de la regla — la mitad de UX. La que manda de verdad es
 * el trigger `validar_correo_institucional` sobre `auth.users`
 * (supabase/restringir_registro_epn.sql): sin él, cualquiera puede saltarse
 * esta pantalla y registrarse pegándole directo a la API de Supabase.
 * Si cambiás el dominio acá, cambialo también en el SQL.
 */

export const INSTITUCION = {
  nombre:  'Escuela Politécnica Nacional',
  siglas:  'EPN',
  dominio: 'epn.edu.ec',
};

/** Cómo se le muestra al usuario: "@epn.edu.ec". */
export const CORREO_SUFIJO = `@${INSTITUCION.dominio}`;

/**
 * Formato del código único del estudiante. Ejemplo real: 202410216.
 *
 * ⚠️ Si cambia la cantidad de dígitos, hay que cambiarla TAMBIÉN en el CHECK
 * `perfiles_codigo_unico_formato` de supabase/politica_uso_escenarios.sql. Acá
 * es para avisarle al estudiante antes de mandar el formulario; la base es la
 * que realmente lo impone, junto con la unicidad.
 */
export const CODIGO_UNICO = {
  digitos: 9,
  ejemplo: '202410216',
};

/**
 * Facultades y escuelas de la EPN, para el desplegable del perfil.
 *
 * ⚠️ VERIFICÁ ESTA LISTA contra la página oficial antes de entregar: las
 * facultades se reorganizan cada tanto y no la tomé de una fuente oficial.
 * Agregar o corregir una es editar este arreglo, nada más.
 *
 * Es el dato que habilita el reporte de uso de escenarios POR FACULTAD, que es
 * lo que le sirve a la unidad de deportes para repartir horarios.
 */
export const FACULTADES = [
  'Ingeniería de Sistemas',
  'Ingeniería Eléctrica y Electrónica',
  'Ingeniería Mecánica',
  'Ingeniería Civil y Ambiental',
  'Ingeniería Química y Agroindustria',
  'Geología y Petróleos',
  'Ciencias',
  'Ciencias Administrativas',
  'Escuela de Formación de Tecnólogos (ESFOT)',
  'Otra',
];

/**
 * Contacto de la unidad que administra los escenarios deportivos.
 * Lo usa la pantalla de Soporte.
 *
 * 🔴 VACÍO A PROPÓSITO. Antes acá había (hardcodeados en `Soporte.jsx`) un
 * número de WhatsApp y dos correos personales heredados de "La Fija". Completá
 * con los datos institucionales que correspondan.
 *
 * Si quedan vacíos, Soporte simplemente **no muestra** esas tarjetas y el ticket
 * se guarda igual en `tickets_soporte` (que es el canal real: el admin lo
 * responde desde /admin/soporte). O sea, la pantalla funciona sin esto.
 */
export const CONTACTO = {
  whatsapp: '0987684148',   // solo dígitos, con código de país. Ej: '593999999999'
  correo:   'alejandrofabara1@gmail.com',   // Ej: 'deportes@epn.edu.ec'
};
