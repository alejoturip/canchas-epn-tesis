import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// Este hook maneja el historial del usuario y la cancelación
export function useReservas() {
  const { user } = useAuth();
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMisReservas = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('reservas')
      .select('*, canchas(nombre, imagen_url)') // Traemos también el nombre de la cancha
      .eq('perfil_id', user.id)
      .order('fecha', { ascending: false })
      .order('hora_inicio', { ascending: false });

    if (!error && data) {
      setReservas(data);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchMisReservas();

    // 🔴 Realtime: refresca las reservas del usuario ante cualquier cambio
    const canal = supabase
      .channel(`rt_reservas_${user.id}_${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservas', filter: `perfil_id=eq.${user.id}` },
        () => fetchMisReservas()
      )
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [user, fetchMisReservas]);

  // Función para cancelar una reserva
  const cancelarReserva = async (reservaId) => {
    const { error } = await supabase
      .from('reservas')
      .update({ estado: 'cancelada' })
      .eq('id', reservaId);
      
    if (!error) {
      fetchMisReservas(); // Recargamos la lista si fue exitoso
    }
    return { error };
  };

  return { reservas, loading, cancelarReserva, refetch: fetchMisReservas };
}