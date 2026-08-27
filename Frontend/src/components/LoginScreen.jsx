import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Lock, AlertCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export default function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Por favor, ingresa tu usuario y contraseña.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const result = await login(username.trim(), password);
      if (!result.success) {
        setError(result.error || 'Credenciales incorrectas.');
      }
    } catch (err) {
      setError('Ocurrió un error inesperado al iniciar sesión.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-torcoroma-dark relative overflow-hidden select-none font-sans">
      {/* Luces y brillos de fondo decorativos */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#F5C227]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[55%] h-[55%] bg-[#F5C227]/5 rounded-full blur-[130px] pointer-events-none" />

      {/* Tarjeta de Login */}
      <div className="w-full max-w-md p-8 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl relative z-10 mx-4 transition-all duration-300 hover:border-[#F5C227]/20">
        
        {/* Contenedor del Logotipo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-[#F5C227]/30 shadow-lg shadow-yellow-500/5 hover:scale-[1.03] transition duration-300 p-1 bg-white mb-4">
            <img 
              src="/logo.jpg" 
              alt="Variedades Torcoroma" 
              className="w-full h-full object-contain rounded-xl"
            />
          </div>
          <h1 className="text-xl font-extrabold text-white tracking-wider font-sans uppercase">
            Variedades Torcoroma
          </h1>
          <p className="text-xs text-gray-400 mt-1 font-medium tracking-wide">
            ERP de Administración Interna
          </p>
        </div>

        {/* Mensaje de Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-200 rounded-2xl text-xs font-semibold flex items-center gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Campo Usuario */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block ml-1">
              Usuario de Acceso
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Admin"
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm font-semibold text-white placeholder-gray-500 focus:outline-none focus:border-[#F5C227] focus:ring-2 focus:ring-[#F5C227]/20 transition-all"
              />
            </div>
          </div>

          {/* Campo Contraseña */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block ml-1">
              Contraseña
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-11 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm font-semibold text-white placeholder-gray-500 focus:outline-none focus:border-[#F5C227] focus:ring-2 focus:ring-[#F5C227]/20 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Botón de Ingresar */}
          <button
            type="submit"
            disabled={isSubmitting}
            style={{ backgroundColor: '#F5C227' }}
            className="w-full py-3.5 mt-2 rounded-2xl text-xs font-black text-torcoroma-dark uppercase tracking-widest cursor-pointer select-none border border-transparent shadow-lg shadow-yellow-500/10 hover:shadow-yellow-500/20 hover:scale-[1.01] active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <span className="inline-block w-4 h-4 border-2 border-torcoroma-dark border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                <span>Iniciar Sesión</span>
              </>
            )}
          </button>
        </form>

        {/* Footer Informativo */}
        <div className="mt-8 text-center border-t border-white/5 pt-4 text-[10px] text-gray-500 font-medium">
          Acceso restringido para personal autorizado de Torcoroma Cúcuta.
        </div>
      </div>
    </div>
  );
}
