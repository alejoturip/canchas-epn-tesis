import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export const usePremios = () => {
  const { user } = useAuth();
  const [premios, setPremios] = useState([]);
  const [puntos, setPuntos] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchDatos = async () => {
      setLoading(true);
      try {
        // Traer progreso de reservas (Puntos)
        const { data: perfil } = await supabase.from('perfiles').select('reservas_completadas').eq('id', user.id).single();
        if (perfil) setPuntos(perfil.reservas_completadas || 0);

        // Traer premios ganados
        const { data: premiosData } = await supabase.from('premios').select('*').eq('perfil_id', user.id).order('created_at', { ascending: false });
        if (premiosData) setPremios(premiosData);
      } catch (error) {
        console.error('Error al cargar premios:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDatos();
  }, [user]);

  return { premios, puntos, loading };
};