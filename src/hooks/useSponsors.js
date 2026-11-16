import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * useSponsors — Carga los sponsors (orden de creación).
 * Compartido por el banner, el carrusel y la página de sponsors.
 */
export function useSponsors() {
  const [sponsors, setSponsors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let activo = true;
    supabase
      .from('sponsors')
      .select('*')
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (activo) {
          setSponsors(data || []);
          setLoading(false);
        }
      });
    return () => { activo = false; };
  }, []);

  return { sponsors, loading };
}
