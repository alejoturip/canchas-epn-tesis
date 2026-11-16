import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
  getPerfilCompleto,
  updatePerfil,
  countReservasUsuario,
  countReservasPorEstado,
  countPremiosUsuario,
  countTorneosUsuario,
  getProximaReserva,
} from '../services/supabaseService';
import { FEATURES } from '../config/features';

/**
 * usePerfil — Carga el perfil completo del usuario + sus estadísticas
 * y expone funciones para editar la info y subir el avatar.
 */
export function usePerfil() {
  const { user } = useAuth();
  const [perfil, setPerfil] = useState(null);
  const [stats, setStats] = useState({
    totalReservas: 0,
    completadas: 0,
    premios: 0,
    puntos: 0,
    torneos: 0,
    proximaReserva: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subiendo, setSubiendo] = useState(false);

  const fetchPerfil = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Con los módulos apagados no consultamos sus tablas (en la versión tesis ni
    // siquiera existen en la base). `sinDatos` evita el request y devuelve 0.
    const sinDatos = Promise.resolve({ count: 0 });

    const [perfilRes, totalRes, compRes, premiosRes, torneosRes, proximaRes] = await Promise.all([
      getPerfilCompleto(user.id),
      countReservasUsuario(user.id),
      countReservasPorEstado(user.id, 'completada'),
      FEATURES.FIDELIZACION ? countPremiosUsuario(user.id) : sinDatos,
      FEATURES.TORNEOS      ? countTorneosUsuario(user.id) : sinDatos,
      getProximaReserva(user.id),
    ]);

    const perfilData = perfilRes.data;
    if (perfilData) setPerfil(perfilData);

    setStats({
      totalReservas: totalRes.count || 0,
      completadas: compRes.count || 0,
      premios: premiosRes.count || 0,
      puntos: perfilData?.reservas_completadas ?? 0,
      torneos: torneosRes.count || 0,
      proximaReserva: proximaRes.data || null,
    });

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchPerfil();
  }, [fetchPerfil]);

  /** Actualiza los campos de texto del perfil. */
  const actualizarPerfil = async (campos) => {
    if (!user) return { error: new Error('Sin sesión') };
    setSaving(true);
    const { error } = await updatePerfil(user.id, campos);
    if (!error) {
      // Sincronizamos el nombre en los metadatos de Auth (lo usa el header)
      if (campos.nombre !== undefined) {
        await supabase.auth.updateUser({ data: { nombre: campos.nombre } });
      }
      await fetchPerfil();
    }
    setSaving(false);
    return { error };
  };

  /** Sube un nuevo avatar al bucket `avatars` y lo guarda en el perfil. */
  const subirAvatar = async (file) => {
    if (!user || !file) return { error: new Error('Archivo inválido') };
    setSubiendo(true);
    try {
      const ext = file.name.split('.').pop();
      // Guardamos dentro de la carpeta del usuario (lo exigen las políticas RLS)
      const filePath = `${user.id}/avatar-${Date.now()}.${ext}`;

      const { error: upError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });
      if (upError) throw upError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: dbError } = await updatePerfil(user.id, { avatar_url: publicUrl });
      if (dbError) throw dbError;

      // Sincronizamos el avatar en los metadatos de Auth (lo usa el header)
      await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
      await fetchPerfil();

      return { url: publicUrl };
    } catch (error) {
      return { error };
    } finally {
      setSubiendo(false);
    }
  };

  return {
    perfil,
    stats,
    loading,
    saving,
    subiendo,
    actualizarPerfil,
    subirAvatar,
    refetch: fetchPerfil,
  };
}
