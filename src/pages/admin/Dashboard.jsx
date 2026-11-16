import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  DollarSign, TrendingUp, Trophy, Clock, UserPlus, Users,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts';
import MSym from '../../components/MSym';
import AyudaBox from '../../components/AyudaBox';
import ActivarNotificaciones from '../../components/ActivarNotificaciones';
import { DashboardSkeleton } from '../../components/Skeletons';
import { formatPrecio } from '../../utils/formatters';
import { FEATURES } from '../../config/features';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const COLORS = ['#DA1F26', '#19C37D', '#E9B949', '#4aa3ff', '#b78cff', '#fb7185'];
const ymd = (d) => d.toISOString().split('T')[0];

// Tooltip oscuro reutilizable
function TooltipBox({ active, payload, label, money }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-800 border border-line rounded-lg px-3 py-2 text-xs shadow-card">
      <p className="text-surface-300 mb-0.5">{label}</p>
      <p className="text-ink font-semibold">{money ? formatPrecio(payload[0].value) : payload[0].value}</p>
    </div>
  );
}

const ejeX = { tick: { fill: '#94a8c4', fontSize: 11 }, axisLine: false, tickLine: false };
const ejeY = { tick: { fill: '#94a8c4', fontSize: 11 }, axisLine: false, tickLine: false, allowDecimals: false, width: 30 };

// Tarjeta de métrica (chip de ícono + número gigante en Anton)
function Tarjeta({ c }) {
  return (
    <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }} className="card p-5 hover-glow">
      <span className={`icon-chip ${c.chip} mb-4`}>
        <MSym name={c.icon} className="text-[24px]" />
      </span>
      <h3 className={`font-display text-4xl leading-none truncate ${c.valorColor || 'text-ink'}`}>{c.valor}</h3>
      <p className="text-xs text-surface-400 font-medium mt-2">{c.titulo}</p>
    </motion.div>
  );
}

// Contenedor de gráfico (título + acción opcional)
function ChartCard({ titulo, icon: Icon, children, accion, span }) {
  return (
    <div className={`card p-5 ${span ? 'lg:col-span-2' : ''}`}>
      <div className="flex items-center justify-between gap-2 mb-4">
        <h3 className="font-bold text-ink flex items-center gap-2 text-sm">
          {Icon && <Icon className="w-4 h-4 text-brand-600" />} {titulo}
        </h3>
        {accion}
      </div>
      {children}
    </div>
  );
}

export default function Dashboard() {
  const [d, setD] = useState({ reservas: [], pagos: [], perfiles: [], canchas: [], prestamos: [] });
  const [loading, setLoading] = useState(true);
  const [rango, setRango] = useState('dia'); // dia | semana | mes

  useEffect(() => {
    async function cargar() {
      const [resReservas, resPagos, resPerfiles, resCanchas, resPrestamos] = await Promise.all([
        supabase.from('reservas').select('fecha, hora_inicio, cancha_id, perfil_id, estado, canchas(nombre)'),
        // Con PAGOS apagado no hay nada que traer: la tabla queda vacía para siempre.
        FEATURES.PAGOS
          ? supabase.from('pagos').select('monto, created_at, estado')
          : Promise.resolve({ data: [] }),
        supabase.from('perfiles').select('id, nombre, created_at, facultad'),
        supabase.from('canchas').select('id', { count: 'exact', head: false }),
        FEATURES.TIENDA
          ? supabase.from('prestamos').select('estado')
          : Promise.resolve({ data: [] }),
      ]);
      setD({
        reservas: resReservas.data || [],
        pagos: resPagos.data || [],
        perfiles: resPerfiles.data || [],
        canchas: resCanchas.data || [],
        prestamos: resPrestamos.data || [],
      });
      setLoading(false);
    }
    cargar();

    const canal = supabase
      .channel(`rt_dashboard_${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservas' }, cargar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'perfiles' }, cargar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pagos' }, cargar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prestamos' }, cargar)
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, []);

  // ── Métricas y series ──────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const { reservas, pagos, perfiles } = d;
    const hoy = ymd(new Date());
    const inicioMes = new Date(); inicioMes.setDate(1);
    const inicioMesStr = ymd(inicioMes);

    const pagosOk = pagos.filter((p) => p.estado === 'aprobado');
    let ingresosDia = 0, ingresosMes = 0;
    pagosOk.forEach((p) => {
      const f = (p.created_at || '').split('T')[0];
      const monto = Number(p.monto) || 0;
      if (f === hoy) ingresosDia += monto;
      if (f >= inicioMesStr) ingresosMes += monto;
    });

    // Reservas por día (14), semana (8) y mes (6)
    const serieDias = (() => {
      const b = {};
      for (let i = 13; i >= 0; i--) { const x = new Date(); x.setDate(x.getDate() - i); b[ymd(x)] = 0; }
      reservas.forEach((r) => { if (r.fecha in b) b[r.fecha]++; });
      return Object.entries(b).map(([k, v]) => ({ label: k.slice(5), value: v }));
    })();

    const weekKey = (s) => { const x = new Date(s + 'T00:00:00'); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); return ymd(x); };
    const serieSemanas = (() => {
      const base = new Date(); const day = (base.getDay() + 6) % 7; base.setDate(base.getDate() - day);
      const b = {};
      for (let i = 7; i >= 0; i--) { const x = new Date(base); x.setDate(x.getDate() - i * 7); b[ymd(x)] = 0; }
      reservas.forEach((r) => { if (!r.fecha) return; const k = weekKey(r.fecha); if (k in b) b[k]++; });
      return Object.entries(b).map(([k, v]) => ({ label: k.slice(5), value: v }));
    })();

    const bucketsMes = (n) => {
      const base = new Date(); base.setDate(1); const arr = [];
      for (let i = n - 1; i >= 0; i--) { const x = new Date(base.getFullYear(), base.getMonth() - i, 1); arr.push({ key: `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`, label: MESES[x.getMonth()] }); }
      return arr;
    };
    const mes6 = bucketsMes(6);
    const serieMeses = mes6.map((m) => ({ label: m.label, value: reservas.filter((r) => (r.fecha || '').startsWith(m.key)).length }));
    const serieIngresos = mes6.map((m) => ({ label: m.label, value: pagosOk.filter((p) => (p.created_at || '').startsWith(m.key)).reduce((s, p) => s + (Number(p.monto) || 0), 0) }));
    const serieNuevos = mes6.map((m) => ({ label: m.label, value: perfiles.filter((p) => (p.created_at || '').startsWith(m.key)).length }));

    // Canchas más reservadas (top 6)
    const cc = {};
    reservas.forEach((r) => { const n = r.canchas?.nombre || 'Sin nombre'; cc[n] = (cc[n] || 0) + 1; });
    const topCanchas = Object.entries(cc).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 6);

    // Horarios más usados
    const hh = {};
    reservas.forEach((r) => { const h = (r.hora_inicio || '').slice(0, 5); if (h) hh[h] = (hh[h] || 0) + 1; });
    const serieHoras = Object.entries(hh).map(([label, value]) => ({ label, value })).sort((a, b) => a.label.localeCompare(b.label));

    // Clientes frecuentes (top 5)
    const nombreById = Object.fromEntries(perfiles.map((p) => [p.id, p.nombre || 'Estudiante']));
    const pc = {};
    reservas.forEach((r) => { if (r.perfil_id) pc[r.perfil_id] = (pc[r.perfil_id] || 0) + 1; });
    const topClientes = Object.entries(pc).map(([id, value]) => ({ nombre: nombreById[id] || 'Estudiante', value })).sort((a, b) => b.value - a.value).slice(0, 5);

    return {
      usuarios: perfiles.length,
      reservasTotal: reservas.length,
      canchas: d.canchas.length,
      reservasConfirmadas: reservas.filter((r) => r.estado === 'confirmada').length,
      ausencias: reservas.filter((r) => r.estado === 'ausente').length,
      // Uso por facultad: la métrica que le sirve a la unidad de deportes para
      // repartir horarios. Sale de cruzar reservas con perfiles.facultad.
      porFacultad: (() => {
        const facultadPorId = Object.fromEntries(perfiles.map((p) => [p.id, p.facultad || 'Sin declarar']));
        const acc = {};
        reservas.forEach((r) => {
          const f = facultadPorId[r.perfil_id] || 'Sin declarar';
          acc[f] = (acc[f] || 0) + 1;
        });
        return Object.entries(acc)
          .map(([nombre, value]) => ({ nombre, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 8);
      })(),
      prestamosSolicitados: d.prestamos.filter((p) => p.estado === 'solicitado').length,
      prestamosEnCalle: d.prestamos.filter((p) => p.estado === 'prestado').length,
      pagosPendientes: pagos.filter((p) => p.estado === 'pendiente').length,
      pagosAprobados: pagosOk.length,
      ingresosDia, ingresosMes,
      serieDias, serieSemanas, serieMeses, serieIngresos, serieNuevos,
      topCanchas, serieHoras, topClientes,
    };
  }, [d]);

  const serieReservas = rango === 'dia' ? stats.serieDias : rango === 'semana' ? stats.serieSemanas : stats.serieMeses;

  const generales = [
    { titulo: 'Estudiantes', valor: stats.usuarios, icon: 'group', chip: 'bg-cat-blue/15 text-cat-blue' },
    { titulo: 'Reservas Totales', valor: stats.reservasTotal, icon: 'event_available', chip: 'bg-pitch/15 text-pitch' },
    { titulo: 'Espacios Deportivos', valor: stats.canchas, icon: 'stadium', chip: 'bg-brand-500/15 text-brand-600' },
    { titulo: 'Reservas Confirmadas', valor: stats.reservasConfirmadas, icon: 'task_alt', chip: 'bg-cat-teal/15 text-cat-teal' },
    // Horas de cancha desperdiciadas: reservas confirmadas a las que nadie fue.
    { titulo: 'Ausencias', valor: stats.ausencias, icon: 'person_off', chip: 'bg-amber-500/15 text-amber-700', valorColor: 'text-amber-700' },
    // Préstamos: reemplazan a las tarjetas de ingresos, que con PAGOS apagado
    // quedarían en cero para siempre.
    ...(FEATURES.TIENDA ? [
      { titulo: 'Solicitudes Pendientes', valor: stats.prestamosSolicitados, icon: 'pending_actions', chip: 'bg-gold/15 text-gold', valorColor: 'text-gold' },
      { titulo: 'Implementos Prestados', valor: stats.prestamosEnCalle, icon: 'backpack', chip: 'bg-cat-violet/15 text-cat-violet' },
    ] : []),
  ];
  const finanzas = [
    { titulo: 'Ingresos de Hoy', valor: formatPrecio(stats.ingresosDia), icon: 'today', chip: 'bg-pitch/15 text-pitch', valorColor: 'text-pitch' },
    { titulo: 'Ingresos del Mes', valor: formatPrecio(stats.ingresosMes), icon: 'calendar_month', chip: 'bg-pitch/15 text-pitch', valorColor: 'text-pitch' },
    { titulo: 'Pagos Pendientes', valor: stats.pagosPendientes, icon: 'pending', chip: 'bg-gold/15 text-gold', valorColor: 'text-gold' },
    { titulo: 'Pagos Aprobados', valor: stats.pagosAprobados, icon: 'verified', chip: 'bg-cat-blue/15 text-cat-blue', valorColor: 'text-cat-blue' },
  ];

  return (
    <div className="animate-fade-in space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="display-title text-3xl text-ink">Panel de Gestión Deportiva</h2>
          <p className="text-surface-400 text-sm">Escuela Politécnica Nacional · métricas en tiempo real.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()} className="btn-secondary btn-sm">
            <MSym name="download" className="text-[18px]" /> Exportar
          </button>
          <Link to="/admin/canchas" className="btn-primary btn-sm">
            <MSym name="add" className="text-[18px]" /> Nueva cancha
          </Link>
        </div>
      </div>

      {/* Guía rápida del panel (sutil y descartable) */}
      <AyudaBox id="dashboard" titulo="¿Cómo manejar tu panel?" icon="map">
        <p className="mb-2.5 text-surface-400">Esto es lo que hacés en cada sección (tocá para ir):</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {[
            { to: '/admin/pagos',       icon: 'payments',        t: 'Pagos',       d: 'Aprobá los comprobantes. 1 click confirma la reserva y genera el QR.', flag: 'PAGOS' },
            { to: '/admin/reservas',    icon: 'event_available', t: 'Reservas',    d: 'Confirmá las reservas (ahí se genera el QR), cancelá o marcá jugada.' },
            { to: '/admin/prestamos',   icon: 'backpack',        t: 'Préstamos',   d: 'Aprobá, entregá y registrá la devolución de los implementos.', flag: 'TIENDA' },
            { to: '/admin/validar',     icon: 'qr_code_scanner', t: 'Validar QR',  d: 'En la puerta: escaneás el QR y registra el ingreso solo.' },
            { to: '/admin/canchas',     icon: 'stadium',         t: 'Espacios',    d: 'Agregá o editá los escenarios deportivos, fotos y horarios.' },
            { to: '/admin/torneos',     icon: 'trophy',          t: 'Torneos',     d: 'Creá ligas y relámpagos, generá el fixture y cargá resultados.', flag: 'TORNEOS' },
            { to: '/admin/promociones', icon: 'sell',            t: 'Promociones', d: 'Banners del inicio (marcá "mostrar en inicio" para el carrusel).' },
          ].filter((s) => !s.flag || FEATURES[s.flag]).map((s) => (
            <Link key={s.to} to={s.to} className="flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-surface-850 transition-colors">
              <MSym name={s.icon} className="text-cat-blue text-[20px] mt-0.5 flex-shrink-0" />
              <span><b className="text-ink">{s.t}.</b> <span className="text-surface-400">{s.d}</span></span>
            </Link>
          ))}
        </div>
      </AyudaBox>

      {/* Avisos push al celular del dueño (nueva reserva / comprobante subido) */}
      {FEATURES.PUSH && <ActivarNotificaciones admin />}

      {loading ? (
        <><DashboardSkeleton /><DashboardSkeleton /></>
      ) : (
        <>
          {/* Banner de acción pendiente (solo si hay pagos por revisar) */}
          {stats.pagosPendientes > 0 && (
            <Link to="/admin/pagos"
              className="flex items-center gap-4 rounded-2xl border border-gold/30 bg-gold/10 p-4 md:p-5 hover:bg-gold/15 transition-colors">
              <span className="icon-chip bg-gold/15 text-gold">
                <MSym name="pending_actions" className="text-[24px]" />
              </span>
              <div className="min-w-0">
                <p className="font-bold text-ink">
                  Tenés {stats.pagosPendientes} pago{stats.pagosPendientes !== 1 ? 's' : ''} pendiente{stats.pagosPendientes !== 1 ? 's' : ''} por revisar
                </p>
                <p className="text-sm text-surface-300 hidden sm:block">Aprobá o rechazá los comprobantes para confirmar las reservas.</p>
              </div>
              <span className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-gold text-ink font-semibold px-3 py-2 text-sm whitespace-nowrap">
                Revisar pagos <MSym name="arrow_forward" className="text-[16px]" />
              </span>
            </Link>
          )}

          {/* Tarjetas generales */}
          <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {generales.map((c) => <Tarjeta key={c.titulo} c={c} />)}
          </motion.div>

          {/* Tarjetas de finanzas (solo si se cobra) */}
          {FEATURES.PAGOS && <div>
            <h3 className="display-title text-xl text-ink mb-4 flex items-center gap-2">
              <MSym name="payments" className="text-pitch text-[22px]" /> Pagos e Ingresos
            </h3>
            <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {finanzas.map((c) => <Tarjeta key={c.titulo} c={c} />)}
            </motion.div>
          </div>}

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Reservas con toggle */}
            <ChartCard
              titulo="Reservas"
              icon={TrendingUp}
              span
              accion={
                <div className="flex gap-1 bg-surface-900 rounded-lg p-1">
                  {[['dia', 'Día'], ['semana', 'Semana'], ['mes', 'Mes']].map(([k, lbl]) => (
                    <button key={k} onClick={() => setRango(k)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition ${rango === k ? 'bg-brand-500 text-white' : 'text-surface-400 hover:text-white'}`}>
                      {lbl}
                    </button>
                  ))}
                </div>
              }
            >
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={serieReservas} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gRes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#DA1F26" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#DA1F26" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff12" vertical={false} />
                  <XAxis dataKey="label" {...ejeX} />
                  <YAxis {...ejeY} />
                  <Tooltip content={<TooltipBox />} cursor={{ fill: '#ffffff08' }} />
                  <Area type="monotone" dataKey="value" stroke="#DA1F26" strokeWidth={2} fill="url(#gRes)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Ingresos por mes */}
            <ChartCard titulo="Ingresos por mes" icon={DollarSign}>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={stats.serieIngresos} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gIng" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#19C37D" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#19C37D" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff12" vertical={false} />
                  <XAxis dataKey="label" {...ejeX} />
                  <YAxis {...ejeY} width={40} />
                  <Tooltip content={<TooltipBox money />} cursor={{ fill: '#ffffff08' }} />
                  <Area type="monotone" dataKey="value" stroke="#19C37D" strokeWidth={2} fill="url(#gIng)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Nuevos clientes */}
            <ChartCard titulo="Estudiantes nuevos por mes" icon={UserPlus}>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={stats.serieNuevos} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff12" vertical={false} />
                  <XAxis dataKey="label" {...ejeX} />
                  <YAxis {...ejeY} />
                  <Tooltip content={<TooltipBox />} cursor={{ stroke: '#ffffff20' }} />
                  <Line type="monotone" dataKey="value" stroke="#4aa3ff" strokeWidth={2.5} dot={{ r: 3, fill: '#4aa3ff' }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Canchas más reservadas */}
            <ChartCard titulo="Canchas más reservadas" icon={Trophy}>
              {stats.topCanchas.length === 0 ? (
                <p className="text-surface-500 text-sm py-10 text-center">Sin datos todavía.</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={stats.topCanchas} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff12" horizontal={false} />
                    <XAxis type="number" {...ejeX} allowDecimals={false} />
                    <YAxis type="category" dataKey="label" {...ejeY} width={90} />
                    <Tooltip content={<TooltipBox />} cursor={{ fill: '#ffffff08' }} />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                      {stats.topCanchas.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Horarios más usados */}
            <ChartCard titulo="Horarios más solicitados" icon={Clock}>
              {stats.serieHoras.length === 0 ? (
                <p className="text-surface-500 text-sm py-10 text-center">Sin datos todavía.</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={stats.serieHoras} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff12" vertical={false} />
                    <XAxis dataKey="label" {...ejeX} />
                    <YAxis {...ejeY} />
                    <Tooltip content={<TooltipBox />} cursor={{ fill: '#ffffff08' }} />
                    <Bar dataKey="value" fill="#b78cff" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Uso por facultad */}
            <ChartCard titulo="Uso por facultad" icon={Users} span>
              {stats.porFacultad.length === 0 ? (
                <p className="text-surface-500 text-sm py-10 text-center">
                  Todavía no hay reservas. Los estudiantes declaran su facultad en Mi Perfil.
                </p>
              ) : (
                <div className="space-y-3 py-2">
                  {stats.porFacultad.map((f) => (
                    <div key={f.nombre} className="flex items-center gap-3">
                      <span className="text-sm text-surface-300 w-52 truncate" title={f.nombre}>{f.nombre}</span>
                      <div className="flex-1 h-2.5 rounded-full bg-surface-700 overflow-hidden">
                        <div className="h-full rounded-full bg-cat-blue"
                          style={{ width: `${(f.value / stats.porFacultad[0].value) * 100}%` }} />
                      </div>
                      <span className="text-sm text-surface-300 font-semibold w-16 text-right flex-shrink-0">
                        {f.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </ChartCard>

            {/* Clientes frecuentes */}
            <ChartCard titulo="Estudiantes más activos" icon={Users} span>
              {stats.topClientes.length === 0 ? (
                <p className="text-surface-500 text-sm py-6 text-center">Sin datos todavía.</p>
              ) : (
                <div className="space-y-2">
                  {stats.topClientes.map((c, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-brand-500/15 text-brand-600 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                      <span className="text-sm text-ink flex-1 truncate">{c.nombre}</span>
                      <div className="flex-1 hidden sm:block">
                        <div className="h-2 rounded-full bg-surface-900 overflow-hidden">
                          <div className="h-full rounded-full bg-brand-500" style={{ width: `${(c.value / stats.topClientes[0].value) * 100}%` }} />
                        </div>
                      </div>
                      <span className="text-sm text-surface-300 font-semibold flex-shrink-0">{c.value} reservas</span>
                    </div>
                  ))}
                </div>
              )}
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}
