import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useTienda = () => {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProductos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('productos_tienda').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setProductos(data || []);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProductos(); }, []);

  const crearProducto = async (producto, archivoImagen) => {
    try {
      let imagen_url = null;
      if (archivoImagen) {
        const fileExt = archivoImagen.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('productos').upload(fileName, archivoImagen);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('productos').getPublicUrl(fileName);
        imagen_url = publicUrl;
      }
      const { error } = await supabase.from('productos_tienda').insert([{ ...producto, imagen_url }]);
      if (error) throw error;
      await fetchProductos();
      return true;
    } catch (error) {
      console.error('Error al crear producto:', error);
      return false;
    }
  };

  return { productos, loading, fetchProductos, crearProducto };
};