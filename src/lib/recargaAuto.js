/**
 * recargaAuto.js — recuperación automática cuando el navegador tiene cacheada
 * una versión vieja de la app (tras un deploy) y falla al cargar un módulo/chunk.
 */

// Mensajes típicos de "no pude cargar un módulo" (Chrome, Safari, Firefox)
const REGEX_CHUNK = /(importing a module script failed|failed to fetch dynamically imported module|error loading dynamically imported module|module script failed|dynamically imported module|chunkloaderror|loading chunk)/i;

export function esErrorDeChunk(error) {
  const msg = (error && (error.message || String(error))) || '';
  return REGEX_CHUNK.test(msg);
}

/**
 * Recarga la página una sola vez (con guarda anti-bucle: si ya recargó hace
 * menos de 10s, no vuelve a recargar para no quedar en un loop infinito).
 * Devuelve true si disparó la recarga.
 */
export function recargarPorChunkViejo() {
  try {
    const ultima = Number(sessionStorage.getItem('recarga_chunk_ts') || 0);
    if (Date.now() - ultima < 10000) return false; // ya recargamos hace poco
    sessionStorage.setItem('recarga_chunk_ts', String(Date.now()));
  } catch { /* sessionStorage no disponible: recargamos igual */ }
  window.location.reload();
  return true;
}
