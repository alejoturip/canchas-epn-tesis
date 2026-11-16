import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Landmark, User, Hash, Phone, Copy, Check, ClipboardCheck } from 'lucide-react';
import { PAGO_CONFIG, generarPayloadQR } from '../config/pago';
import { formatPrecio } from '../utils/formatters';
import { toastExito, toastError } from '../lib/notify';

/**
 * Copia texto al portapapeles. `navigator.clipboard` solo existe en HTTPS/localhost,
 * así que caemos a un <textarea> + execCommand para que funcione siempre.
 */
async function copiarAlPortapapeles(texto) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
    const ta = document.createElement('textarea');
    ta.value = texto;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** Botón de copiar de un dato individual (muestra un ✓ por 2 segundos). */
function BotonCopiar({ valor, etiqueta }) {
  const [copiado, setCopiado] = useState(false);

  const handleCopiar = async () => {
    const ok = await copiarAlPortapapeles(valor);
    if (!ok) return toastError('No se pudo copiar. Copialo a mano.');
    setCopiado(true);
    toastExito(`${etiqueta} copiado`);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopiar}
      aria-label={`Copiar ${etiqueta}`}
      title={`Copiar ${etiqueta}`}
      className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
        copiado ? 'bg-pitch/15 text-pitch' : 'text-surface-400 hover:text-white hover:bg-surface-700'
      }`}
    >
      {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

/**
 * QR de pago + datos de la cuenta para transferencias / billeteras.
 */
export default function QRPago({ monto, referencia }) {
  const payload = generarPayloadQR(monto, referencia);
  // Si la imagen del QR (DeUna) no existe o falla, caemos al QR de texto generado.
  const [imgFallo, setImgFallo] = useState(false);
  const [copiadoTodo, setCopiadoTodo] = useState(false);
  const usarImagen = PAGO_CONFIG.qrImagen && !imgFallo;

  const datos = [
    { icon: Landmark, label: PAGO_CONFIG.banco, valor: PAGO_CONFIG.tipoCuenta, copiar: false },
    { icon: Hash, label: 'Número de cuenta', valor: PAGO_CONFIG.numeroCuenta, copiar: true, corto: 'Número de cuenta' },
    { icon: User, label: 'Beneficiario', valor: PAGO_CONFIG.propietario, copiar: true, corto: 'Beneficiario' },
    { icon: Phone, label: 'Teléfono / DeUna', valor: PAGO_CONFIG.telefono, copiar: true, corto: 'Teléfono' },
  ];

  // Texto completo (el mismo del QR): listo para pegar en el chat del banco.
  const handleCopiarTodo = async () => {
    const ok = await copiarAlPortapapeles(payload);
    if (!ok) return toastError('No se pudo copiar. Copialo a mano.');
    setCopiadoTodo(true);
    toastExito('Datos de pago copiados 📋');
    setTimeout(() => setCopiadoTodo(false), 2500);
  };

  return (
    <div className="space-y-4">
      {/* Monto */}
      <div className="text-center">
        <p className="text-xs text-surface-400">Monto a pagar</p>
        <p className="text-3xl font-display font-bold text-brand-600">{formatPrecio(monto)}</p>
        {referencia && <p className="text-xs text-surface-500 mt-1">Ref: {referencia}</p>}
      </div>

      {/* QR */}
      <div className="flex justify-center">
        <div className="bg-white p-4 rounded-2xl shadow-glow-md">
          {usarImagen ? (
            <img
              src={PAGO_CONFIG.qrImagen}
              alt="QR de pago"
              width={180}
              height={180}
              className="w-[180px] h-[180px] object-contain"
              onError={() => setImgFallo(true)}
            />
          ) : (
            <QRCodeSVG value={payload} size={180} level="M" includeMargin={false} />
          )}
        </div>
      </div>

      {/* Datos de la cuenta */}
      <div className="glass-dark rounded-2xl p-4 space-y-3">
        {datos.map((d) => (
          <div key={d.label} className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand-500/10 flex items-center justify-center flex-shrink-0">
              <d.icon className="w-4 h-4 text-brand-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-surface-500">{d.label}</p>
              <p className="text-sm font-semibold text-ink truncate">{d.valor}</p>
            </div>
            {d.copiar && <BotonCopiar valor={d.valor} etiqueta={d.corto} />}
          </div>
        ))}

        {/* Copiar todo el bloque de datos */}
        <button
          type="button"
          onClick={handleCopiarTodo}
          className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
            copiadoTodo
              ? 'bg-pitch/15 text-pitch'
              : 'bg-surface-850 text-surface-200 hover:bg-surface-700 hover:text-ink'
          }`}
        >
          {copiadoTodo ? <ClipboardCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copiadoTodo ? '¡Copiado!' : 'Copiar todos los datos'}
        </button>
      </div>

      {/* Métodos compatibles */}
      <div className="flex flex-wrap gap-2 justify-center">
        {PAGO_CONFIG.metodos.map((m) => (
          <span key={m} className="badge badge-gray">{m}</span>
        ))}
      </div>

      {/* Instrucciones */}
      <ol className="text-xs text-surface-400 space-y-1.5 list-decimal list-inside">
        {PAGO_CONFIG.instrucciones.map((t, i) => <li key={i}>{t}</li>)}
      </ol>
    </div>
  );
}
