import { Component } from 'react';
import { esErrorDeChunk, recargarPorChunkViejo } from '../lib/recargaAuto';

/**
 * Captura errores de render en el árbol.
 * - Si es un error de "chunk viejo" (cache tras deploy) → recarga automática.
 * - Si es un error real → muestra el detalle (para depurar).
 */
export default class ErrorBoundary extends Component {
  state = { error: null, recargando: false };

  static getDerivedStateFromError(error) {
    // Si es un módulo viejo, marcamos "recargando" y disparamos la recarga
    if (esErrorDeChunk(error)) {
      recargarPorChunkViejo();
      return { error, recargando: true };
    }
    return { error, recargando: false };
  }

  componentDidCatch(error, info) {
    console.error('💥 ErrorBoundary atrapó:', error, info);
  }

  render() {
    const { error, recargando } = this.state;

    // Pantalla amable mientras se actualiza a la última versión
    if (recargando) {
      return (
        <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="w-12 h-12 rounded-full border-2 border-brand-300 border-t-brand-500 animate-spin" />
          <p className="text-surface-300">Actualizando a la última versión…</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="min-h-screen bg-surface-950 flex items-center justify-center p-6">
          <div className="max-w-lg w-full card p-6 border-red-300">
            <h1 className="text-xl font-bold text-red-700 mb-2">Ups, algo se rompió 😅</h1>
            <p className="text-surface-300 text-sm mb-4">
              Probá recargar. Si sigue, este es el detalle del error:
            </p>
            <pre className="text-xs text-red-700 bg-surface-900 rounded-xl p-4 overflow-auto max-h-72 whitespace-pre-wrap">
              {error?.message || String(error)}
              {'\n\n'}
              {error?.stack}
            </pre>
            <button onClick={() => window.location.reload()} className="btn-primary mt-4">
              Recargar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
