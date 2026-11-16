import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Headset, Send, CheckCircle, ChevronDown, ChevronUp, MessageCircle, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CONTACTO } from '../config/institucion';

// Contacto de la unidad de deportes. Si están vacíos en config/institucion.js,
// las tarjetas no se muestran y el ticket viaja solo por la base (que es el
// canal real: el admin lo responde desde /admin/soporte).
const WHATSAPP = CONTACTO.whatsapp.replace(/\D/g, '');
const CORREO = CONTACTO.correo;

const FAQS = [
  {
    pregunta: '¿Quién puede usar el sistema?',
    respuesta: 'Solo la comunidad politécnica. La cuenta se crea con tu correo institucional @epn.edu.ec; con cualquier otro correo el registro no se completa.',
  },
  {
    pregunta: '¿Tiene algún costo reservar?',
    respuesta: 'No. Los escenarios deportivos son de la universidad y su uso no se cobra. Reservás, el encargado aprueba y listo.',
  },
  {
    pregunta: '¿Por qué mi reserva dice "pendiente"?',
    respuesta: 'Porque todavía no la aprobó el encargado. Cuando la confirme te llega un aviso y recién ahí se genera tu QR de acceso, que vas a ver en el detalle de la reserva.',
  },
  {
    pregunta: '¿Cómo cancelo una reserva?',
    respuesta: 'Entrá a "Mis Reservas" y cancelá la que necesites. Hacelo con anticipación para que el horario quede libre y otro compañero pueda tomarlo.',
  },
  {
    pregunta: '¿Cómo pido implementos prestados?',
    respuesta: 'Desde la sección Implementos armás tu mochila (balones, conos, redes) y la pedís asociada a una de tus reservas. El encargado te los entrega al inicio de tu horario y los devolvés al terminar. Si algo se pierde o vuelve dañado, respondés por su valor de reposición.',
  },
  {
    pregunta: '¿Qué pasa si no devuelvo los implementos?',
    respuesta: 'El préstamo queda marcado como atrasado y el encargado lo ve en su panel. Hasta regularizarlo no vas a poder pedir prestado de nuevo sobre esa reserva.',
  },
];

export default function Soporte() {
  const { user } = useAuth();
  const [faqAbierto, setFaqAbierto] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [form, setForm] = useState({ asunto: '', mensaje: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.asunto.trim() || !form.mensaje.trim()) return;

    setEnviando(true);

    // 1. Guardar el ticket en Supabase (historial para el admin en /admin/soporte)
    const { error } = await supabase.from('tickets_soporte').insert([{
      user_id: user?.id,
      email: user?.email,
      asunto: form.asunto,
      mensaje: form.mensaje,
      estado: 'abierto',
    }]);
    if (error) console.warn('No se pudo guardar el ticket en la BD:', error.message);

    // 2. Si hay WhatsApp configurado, además se avisa al instante.
    if (WHATSAPP) {
      const texto = encodeURIComponent(
        `🎫 *Nuevo ticket de soporte*\n\nDe: ${user?.email || 'cliente'}\nAsunto: ${form.asunto}\n\n${form.mensaje}`
      );
      window.open(`https://wa.me/${WHATSAPP}?text=${texto}`, '_blank');
    }

    setEnviado(true);
    setForm({ asunto: '', mensaje: '' });
    setEnviando(false);
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto animate-fade-in">

      {/* Header */}
      <div className="flex items-center gap-4 mb-10">
        <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-300 flex items-center justify-center shadow-glow-sm">
          <Headset className="w-7 h-7 text-brand-600" />
        </div>
        <div>
          <h1 className="section-title">Centro de Soporte</h1>
          <p className="text-surface-400 text-sm mt-0.5">Estamos aquí para ayudarte</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Columna izquierda: FAQ + Contacto rápido */}
        <div className="lg:col-span-2 space-y-6">

          {/* Contacto rápido (solo si hay datos cargados en config/institucion.js) */}
          {(WHATSAPP || CORREO) && (
            <div className="card p-5 space-y-3">
              <h3 className="font-bold text-ink text-sm uppercase tracking-wider text-surface-400 mb-4">Contacto Directo</h3>
              {WHATSAPP && (
                <a
                  href={`https://wa.me/${WHATSAPP}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-300 hover:bg-green-500/15 transition-colors group"
                >
                  <MessageCircle className="w-5 h-5 text-green-700 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-ink">WhatsApp</p>
                    <p className="text-xs text-surface-400">Respuesta en minutos</p>
                  </div>
                </a>
              )}
              {CORREO && (
                <a
                  href={`mailto:${CORREO}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/15 transition-colors"
                >
                  <Mail className="w-5 h-5 text-blue-700 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-ink">Correo</p>
                    <p className="text-xs text-surface-400">{CORREO}</p>
                  </div>
                </a>
              )}
            </div>
          )}

          {/* FAQ */}
          <div className="card p-5">
            <h3 className="font-bold text-ink mb-4">Preguntas Frecuentes</h3>
            <div className="space-y-2">
              {FAQS.map((faq, i) => (
                <div key={i} className="border border-line rounded-xl overflow-hidden">
                  <button
                    onClick={() => setFaqAbierto(faqAbierto === i ? null : i)}
                    className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-surface-850 transition-colors"
                  >
                    <span className="text-sm font-medium text-surface-200">{faq.pregunta}</span>
                    {faqAbierto === i
                      ? <ChevronUp className="w-4 h-4 text-brand-600 flex-shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-surface-500 flex-shrink-0" />
                    }
                  </button>
                  <AnimatePresence>
                    {faqAbierto === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <p className="px-4 pb-4 text-sm text-surface-400 leading-relaxed border-t border-line pt-3">
                          {faq.respuesta}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Columna derecha: Formulario */}
        <div className="lg:col-span-3">
          <div className="card p-6">
            <h3 className="font-bold text-ink text-lg mb-1">Enviar un Ticket</h3>
            <p className="text-surface-400 text-sm mb-6">Describe tu problema y te respondemos a la brevedad.</p>

            <AnimatePresence mode="wait">
              {enviado ? (
                <motion.div
                  key="success"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center justify-center py-12 text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-green-500/15 border border-green-300 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(34,197,94,0.2)]">
                    <CheckCircle className="w-8 h-8 text-green-700" />
                  </div>
                  <h4 className="font-bold text-ink text-lg mb-1">¡Ticket enviado!</h4>
                  <p className="text-surface-400 text-sm mb-6">Te contactaremos pronto. Revisa tu correo.</p>
                  <button
                    onClick={() => setEnviado(false)}
                    className="btn-secondary"
                  >
                    Enviar otro mensaje
                  </button>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onSubmit={handleSubmit}
                  className="space-y-4"
                >
                  {user?.email && (
                    <div>
                      <label className="label">Tu correo</label>
                      <input type="text" className="input opacity-60 cursor-not-allowed" value={user.email} readOnly />
                    </div>
                  )}
                  <div>
                    <label className="label">Asunto *</label>
                    <input
                      required
                      type="text"
                      className="input"
                      placeholder="Ej: Problema con mi reserva del sábado"
                      value={form.asunto}
                      onChange={e => setForm({ ...form, asunto: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">Mensaje *</label>
                    <textarea
                      required
                      rows={6}
                      className="input resize-none"
                      placeholder="Cuéntanos qué pasó con todos los detalles posibles..."
                      value={form.mensaje}
                      onChange={e => setForm({ ...form, mensaje: e.target.value })}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={enviando}
                    className="w-full btn-primary justify-center py-3"
                  >
                    {enviando
                      ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Enviando...</>
                      : <><Send className="w-4 h-4" /> Enviar mensaje</>
                    }
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
