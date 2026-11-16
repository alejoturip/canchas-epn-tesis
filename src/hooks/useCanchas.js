import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Este hook se encarga de traer todas las canchas activas de la base de datos
export function useCanchas() {
  const [canchas, setCanchas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCanchas() {
      const { data, error } = await supabase
        .from('canchas')
        .select('*')
        .eq('activa', true) // Solo traemos las que están activas
        .order('created_at', { ascending: false });

      if (!error && data) {
        setCanchas(data);
      }
      setLoading(false);
    }
    fetchCanchas();
  }, []);

  return { canchas, loading };
}