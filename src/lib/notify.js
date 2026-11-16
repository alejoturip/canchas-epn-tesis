/**
 * notify.js — Helpers de notificaciones tipo "toast" (react-hot-toast).
 * El estilo oscuro global se configura en el <Toaster /> dentro de App.jsx.
 */
import toast from 'react-hot-toast';

export const toastExito = (msg) => toast.success(msg);
export const toastError = (msg) => toast.error(msg);
export const toastInfo = (msg, icon) => toast(msg, icon ? { icon } : {});
export const toastPremio = (msg) =>
  toast(msg, { icon: '🎁', style: { border: '1px solid rgba(245,158,11,0.45)' } });

export { default as toast } from 'react-hot-toast';
