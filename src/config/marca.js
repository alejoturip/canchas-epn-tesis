/**
 * marca.js — Identidad de la aplicación.
 * ---------------------------------------------------------------------------
 * Fuente única de la marca. Antes "La Fija" estaba escrito a mano en 8 lugares
 * (título del navegador, manifest de la PWA, login, headers, hero); ahora todo
 * sale de acá.
 *
 * Los datos de la INSTITUCIÓN (nombre, siglas, dominio del correo, contacto)
 * viven aparte, en `config/institucion.js`. La distinción importa: PoliSport EPN
 * es el sistema; la Escuela Politécnica Nacional es la institución que lo usa.
 */

export const MARCA = {
  nombre:      'PoliSport EPN',
  nombreCorto: 'PoliSport',        // la PWA instalada muestra pocos caracteres
  descriptor:  'Reservas Deportivas',
  eslogan:     'Tu espacio. Tu deporte. Tu Politécnica.',
  descripcion: 'Reserva de espacios e implementos deportivos de la Escuela Politécnica Nacional',

  /**
   * ⚠️ El logo es CUADRADO (escudo + tipografía + eslogan), no apaisado como el
   * de La Fija. Los `<img>` de la app ya se recalibraron para eso.
   *
   * Cuando tengas la **versión compacta** (solo escudo + "POLISPORT EPN", sin el
   * descriptor ni el eslogan), guardala como `/logo-compacto.png` y cambiá la
   * línea de abajo: en un header de 64px el eslogan del logo completo queda
   * ilegible. Hasta entonces las dos apuntan al mismo archivo y no se rompe nada.
   */
  logo:         '/logo.png',   // completo, con eslogan → login
  logoCompacto: '/logo.png',   // ← cambiar a '/logo-compacto.png' cuando exista
  logoAlt:      'PoliSport EPN — Escuela Politécnica Nacional',
};
