/**
 * pago.js — Configuración de los datos de cobro.
 * ---------------------------------------------------------------------------
 * ⛔ MÓDULO APAGADO EN LA TESIS (`FEATURES.PAGOS = false`).
 *
 * En la versión universitaria **no se cobra**: los escenarios son de la EPN y la
 * reserva la aprueba el encargado sin comprobante ni transferencia. Nada de este
 * archivo se está usando hoy; queda por la regla del proyecto (acá no se borra,
 * se apaga) y porque `Tienda.jsx` ya no lo importa.
 *
 * 🔴 SE VACIARON LOS DATOS A PROPÓSITO. Antes había acá una cuenta bancaria real
 * y personal (banco, número de cuenta, titular y teléfono) heredada de "La Fija",
 * la app comercial. Eso no puede viajar en el repo de una tesis que se entrega y
 * se sube a GitHub. El QR de DeUna asociado (`public/qr-pago.png`) también se
 * quitó; si lo necesitás, sigue estando en `Desktop\canchas-app-final\public\`.
 *
 * ¿Volvés a prender PAGOS? Completá estos campos con los datos institucionales
 * que corresponda y volvé a poner una imagen en `public/qr-pago.png`.
 */
export const PAGO_CONFIG = {
  banco: '',
  tipoCuenta: '',
  numeroCuenta: '',
  propietario: '',
  // Se usaba para el checkout por WhatsApp de la tienda comercial, que ya no existe.
  telefono: '',
  // Si es null, `QRPago` genera un QR de texto con los datos de arriba.
  qrImagen: null,
  metodos: ['Transferencia bancaria', 'Efectivo'],
  instrucciones: [
    'Transferí por el monto exacto.',
    'Usá la referencia indicada para identificar tu reserva.',
    'Subí una foto clara del comprobante.',
    'Esperá la validación del administrador (te notificaremos).',
  ],
};

/**
 * Genera el texto que se codifica en el QR de pago (fallback si no hay imagen).
 * Muchas billeteras de Ecuador leen un texto plano con los datos de la cuenta.
 */
export const generarPayloadQR = (monto, referencia) =>
  [
    'PAGO RESERVA',
    `Beneficiario: ${PAGO_CONFIG.propietario}`,
    `${PAGO_CONFIG.banco} - ${PAGO_CONFIG.tipoCuenta}`,
    `Cuenta: ${PAGO_CONFIG.numeroCuenta}`,
    `Monto: $${Number(monto || 0).toFixed(2)}`,
    `Referencia: ${referencia || '-'}`,
  ].join('\n');
