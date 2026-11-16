import { useState } from 'react';
import MSym from './MSym';

/**
 * AyudaBox — recuadro de ayuda sutil, colapsable y descartable.
 * Se oculta para siempre (localStorage) cuando el usuario toca la X.
 * Uso: <AyudaBox id="dashboard" titulo="Guía rápida">...contenido...</AyudaBox>
 */
export default function AyudaBox({ id, titulo = 'Guía rápida', icon = 'lightbulb', children, defaultOpen = true }) {
  const key = `ayuda_oculta_${id}`;
  const [oculto, setOculto] = useState(() => {
    try { return localStorage.getItem(key) === '1'; } catch { return false; }
  });
  const [abierto, setAbierto] = useState(defaultOpen);

  const cerrar = () => {
    try { localStorage.setItem(key, '1'); } catch { /* noop */ }
    setOculto(true);
  };

  const reabrir = () => {
    try { localStorage.removeItem(key); } catch { /* noop */ }
    setAbierto(true);
    setOculto(false);
  };

  // Cuando está cerrada, dejamos un botoncito discreto para volver a verla
  if (oculto) {
    return (
      <button onClick={reabrir}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-surface-400 hover:text-cat-blue transition-colors">
        <MSym name="help" className="text-[16px]" /> Ver {titulo.toLowerCase()}
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-cat-blue/20 bg-cat-blue/[0.06] p-4">
      <div className="flex items-start gap-3">
        <span className="icon-chip bg-cat-blue/15 text-cat-blue flex-shrink-0">
          <MSym name={icon} className="text-[22px]" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <button onClick={() => setAbierto((a) => !a)} className="font-bold text-ink flex items-center gap-1.5">
              {titulo}
              <MSym name={abierto ? 'expand_less' : 'expand_more'} className="text-[18px] text-surface-400" />
            </button>
            <button onClick={cerrar} title="No mostrar de nuevo" className="text-surface-500 hover:text-ink transition-colors">
              <MSym name="close" className="text-[18px]" />
            </button>
          </div>
          {abierto && <div className="mt-2.5 text-sm text-surface-300">{children}</div>}
        </div>
      </div>
    </div>
  );
}
