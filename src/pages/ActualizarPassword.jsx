import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Lock, Save } from 'lucide-react';
import { MARCA } from '../config/marca';

export default function ActualizarPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState(null);

  // 👉 Función para guardar la nueva contraseña
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validación básica
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden. Intenta de nuevo.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);

    try {
      // 🧠 MAGIA: Supabase actualiza la clave del usuario que acaba de entrar con el link
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) throw updateError;

      // Mensaje de éxito y lo mandamos al inicio después de 2 segundos
      setMensaje('¡Contraseña actualizada con éxito! Redirigiendo...');
      setTimeout(() => {
        navigate('/');
      }, 2000);
      
    } catch (err) {
      setError('Hubo un error al actualizar la contraseña. Es posible que el enlace haya caducado.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4 bg-hero-mesh">
      <div className="w-full max-w-md animate-slide-up">
        
        {/* Cabecera / Logo */}
        <div className="text-center mb-8">
          <img src={MARCA.logo} alt={MARCA.logoAlt} className="h-32 w-auto object-contain mx-auto mb-3" />
          <p className="text-surface-400">
            Crea tu nueva contraseña segura
          </p>
        </div>

        {/* Tarjeta del Formulario */}
        <div className="card p-8">
          
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-300 rounded-xl text-red-700 text-sm text-center">
              {error}
            </div>
          )}

          {mensaje && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-300 rounded-xl text-green-700 text-sm text-center">
              {mensaje}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Campo Nueva Contraseña */}
            <div>
              <label className="label">Nueva Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 w-5 h-5 text-surface-500" />
                <input 
                  type="password" 
                  required 
                  className="input pl-12" 
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={mensaje !== null}
                />
              </div>
            </div>

            {/* Campo Confirmar Contraseña */}
            <div>
              <label className="label">Confirmar Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 w-5 h-5 text-surface-500" />
                <input 
                  type="password" 
                  required 
                  className="input pl-12" 
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={mensaje !== null}
                />
              </div>
            </div>

            {/* Botón Guardar */}
            <button 
              type="submit" 
              disabled={loading || mensaje !== null}
              className="btn-primary w-full py-3.5 text-base mt-2"
            >
              {loading ? (
                <span className="animate-pulse">Guardando...</span>
              ) : (
                <><Save className="w-5 h-5" /> Guardar Contraseña</>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}