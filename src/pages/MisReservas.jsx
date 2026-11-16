import { useReservas } from '../hooks/useReservas';
import { CalendarX2, Loader2, ArrowLeft, QrCode } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toastExito, toastError } from '../lib/notify';

export default function MisReservas() {
  const { reservas, loading, cancelarReserva } = useReservas();

  // Helper para pintar el estado bonito usando las clases de Tailwind que hicimos
  const BadgeEstado = ({ estado }) => {
    const estilos = {
      'pendiente': 'badge-amber',
      'confirmada': 'badge-green',
      'completada': 'badge-brand',
      'cancelada': 'badge-red',
      'ausente': 'badge-amber'
    };
    return <span className={`uppercase tracking-wider ${estilos[estado] || 'badge-gray'}`}>{estado}</span>;
  };

  const handleCancelar = async (id) => {
    if(window.confirm('¿Estás seguro de cancelar esta reserva, mi pana?')) {
      const { error } = await cancelarReserva(id);
      if (error) toastError('No se pudo cancelar: ' + error.message);
      else toastExito('Reserva cancelada');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Link to="/" className="p-2 bg-surface-800 rounded-full hover:bg-surface-700 transition">
          <ArrowLeft className="w-5 h-5 text-surface-300" />
        </Link>
        <h2 className="section-title">Historial de Reservas</h2>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
      ) : reservas.length === 0 ? (
        <div className="card p-12 text-center flex flex-col items-center justify-center">
          <CalendarX2 className="w-16 h-16 text-surface-500 mb-4" />
          <h3 className="text-xl font-bold text-ink mb-2">No tienes reservas aún</h3>
          <p className="text-surface-400 mb-6">Parece que todavía no has pisado la cancha.</p>
          <Link to="/" className="btn-primary">Explorar Canchas</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {reservas.map(res => (
            <div key={res.id} className="card p-5 flex flex-col md:flex-row md:items-center gap-4 border-l-4" style={{borderLeftColor: res.estado === 'cancelada' ? '#DA1F26' : '#D4A017'}}>
              
              <div className="flex-1">
                <div className="flex justify-between items-start md:items-center mb-2">
                  <h3 className="font-bold text-lg text-ink">{res.canchas?.nombre || 'Cancha eliminada'}</h3>
                  <BadgeEstado estado={res.estado} />
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm text-surface-300 mt-3">
                  <div><span className="text-surface-500 text-xs block">Fecha</span> {res.fecha}</div>
                  <div><span className="text-surface-500 text-xs block">Horario</span> {res.hora_inicio.substring(0,5)} - {res.hora_fin.substring(0,5)}</div>
                </div>

                <Link to={`/reserva/${res.id}`} className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-600 mt-3 font-medium">
                  <QrCode className="w-4 h-4" /> Ver pase de acceso
                </Link>
              </div>

              {/* Solo dejamos cancelar si está pendiente o confirmada */}
              {(res.estado === 'pendiente' || res.estado === 'confirmada') && (
                <div className="mt-4 md:mt-0 md:ml-4 border-t border-line md:border-none pt-4 md:pt-0">
                  <button onClick={() => handleCancelar(res.id)} className="w-full md:w-auto btn-danger">
                    Cancelar
                  </button>
                </div>
              )}

            </div>
          ))}
        </div>
      )}
    </div>
  );
}