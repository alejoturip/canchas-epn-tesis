import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { toastPremio, toastInfo } from '../lib/notify';

/**
 * useNotificaciones — Carga las notificaciones del usuario y se suscribe
 * a cambios en tiempo real (Supabase Realtime) sobre la tabla notificaciones.
 */
export function useNotificaciones() {
  const { user } = useAuth();
  const [notificaciones, setNotificaciones] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotificaciones = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notificaciones')
      .select('*')
      .eq('usuario_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setNotificaciones(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchNotificaciones();

    const canal = supabase
      .channel(`notificaciones_${user.id}_${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificaciones', filter: `usuario_id=eq.${user.id}` },
        (payload) => {
          setNotificaciones((prev) => [payload.new, ...prev]);
          // Toast en vivo para eventos que el usuario no disparó en esta sesión
          const n = payload.new;
          if (n.tipo === 'premio') toastPremio(n.titulo);
          else if (n.tipo === 'promocion') toastInfo(n.mensaje || n.titulo, '📢');
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notificaciones', filter: `usuario_id=eq.${user.id}` },
        (payload) => setNotificaciones((prev) => prev.map((n) => (n.id === payload.new.id ? payload.new : n)))
      )
      .subscribe();

    return () => { supabase.removeChannel(canal); };
  }, [user, fetchNotificaciones]);

  const noLeidas = notificaciones.filter((n) => !n.leida).length;

  const marcarLeida = async (id) => {
    setNotificaciones((prev) => prev.map((n) => (n.id === id ? { ...n, leida: true } : n)));
    await supabase.from('notificaciones').update({ leida: true }).eq('id', id);
  };

  const marcarTodasLeidas = async () => {
    if (!user) return;
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
    await supabase
      .from('notificaciones')
      .update({ leida: true })
      .eq('usuario_id', user.id)
      .eq('leida', false);
  };

  return { notificaciones, noLeidas, loading, marcarLeida, marcarTodasLeidas, refetch: fetchNotificaciones };
}
