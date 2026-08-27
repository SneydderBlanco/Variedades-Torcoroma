import React, { useState, useEffect } from 'react';
import { User, Plus, Edit2, Trash2, KeyRound, ShieldAlert } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function UsuariosPanel({ onShowMessage }) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Forms
  const [newPassword, setNewPassword] = useState('');
  const [newUser, setNewUser] = useState({ username: '', password: '', rol: 'EMPLEADO' });

  const fetchUsuarios = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/usuarios`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsuarios(data);
      } else {
        onShowMessage('Error al cargar usuarios', 'error');
      }
    } catch (error) {
      console.error(error);
      onShowMessage('Error de red', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 4) {
      alert("La contraseña debe tener al menos 4 caracteres.");
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/usuarios/${selectedUser.id_usuario}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword })
      });

      if (res.ok) {
        onShowMessage('Contraseña actualizada correctamente', 'success');
        setShowPasswordModal(false);
        setNewPassword('');
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Error al cambiar contraseña');
      }
    } catch (error) {
      alert('Error de red');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUser.username || !newUser.password) {
      alert("Completa los campos obligatorios.");
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/usuarios`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newUser)
      });

      if (res.ok) {
        onShowMessage('Usuario creado correctamente', 'success');
        setShowCreateModal(false);
        setNewUser({ username: '', password: '', rol: 'EMPLEADO' });
        fetchUsuarios();
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Error al crear usuario');
      }
    } catch (error) {
      alert('Error de red');
    }
  };

  const handleDeleteUser = async (user) => {
    const isCurrentUser = user.username === localStorage.getItem('username'); // Aproximación
    if (isCurrentUser) {
      alert("No puedes eliminar el usuario con el que estás conectado.");
      return;
    }

    if (!window.confirm(`¿Seguro que deseas eliminar al usuario ${user.username}? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/usuarios/${user.id_usuario}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        onShowMessage('Usuario eliminado', 'success');
        fetchUsuarios();
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Error al eliminar usuario');
      }
    } catch (error) {
      alert('Error de red');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500 font-bold">Cargando panel de seguridad...</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black text-torcoroma-dark flex items-center gap-2">
            <ShieldAlert className="text-torcoroma-gold w-7 h-7" />
            CONTROL DE USUARIOS
          </h1>
          <p className="text-sm text-gray-500 mt-1 font-semibold">
            Gestiona accesos y contraseñas del sistema.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-torcoroma-dark hover:bg-black text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition flex items-center gap-2 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          NUEVO USUARIO
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider">ID</th>
              <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider">Usuario</th>
              <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider">Rol</th>
              <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {usuarios.map(user => (
              <tr key={user.id_usuario} className="hover:bg-gray-50 transition-colors">
                <td className="p-4 text-sm font-bold text-gray-400">#{user.id_usuario}</td>
                <td className="p-4 text-sm font-black text-torcoroma-dark">{user.username}</td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${user.rol === 'ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                    {user.rol}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowPasswordModal(true);
                      }}
                      className="p-2 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200 rounded-lg transition"
                      title="Cambiar Contraseña"
                    >
                      <KeyRound className="w-4 h-4" />
                    </button>
                    {user.rol !== 'ADMIN' && (
                      <button
                        onClick={() => handleDeleteUser(user)}
                        className="p-2 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-lg transition"
                        title="Eliminar Usuario"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {usuarios.length === 0 && (
              <tr>
                <td colSpan="4" className="p-8 text-center text-gray-500">No hay usuarios registrados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Cambiar Contraseña */}
      {showPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 relative animate-scale-in">
            <h2 className="text-xl font-black text-torcoroma-dark mb-1">Cambiar Contraseña</h2>
            <p className="text-xs text-gray-500 font-bold mb-5">
              Usuario: <span className="text-torcoroma-gold">{selectedUser.username}</span>
            </p>
            
            <form onSubmit={handleChangePassword}>
              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                  Nueva Contraseña
                </label>
                <input
                  type="password"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-torcoroma-dark focus:ring-2 focus:ring-torcoroma-gold outline-none"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Escribe la nueva clave..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-torcoroma-gold hover:bg-yellow-500 text-yellow-950 font-black rounded-xl transition shadow-md"
                >
                  GUARDAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Crear Usuario */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 relative animate-scale-in">
            <h2 className="text-xl font-black text-torcoroma-dark mb-5 flex items-center gap-2">
              <User className="text-torcoroma-gold" /> Nuevo Usuario
            </h2>
            
            <form onSubmit={handleCreateUser}>
              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                  Nombre de Usuario
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-torcoroma-dark focus:ring-2 focus:ring-torcoroma-gold outline-none uppercase"
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value.toUpperCase()})}
                  placeholder="Ej: JUAN"
                />
              </div>

              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                  Rol del Sistema
                </label>
                <select
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-torcoroma-dark focus:ring-2 focus:ring-torcoroma-gold outline-none bg-white font-bold"
                  value={newUser.rol}
                  onChange={(e) => setNewUser({...newUser, rol: e.target.value})}
                >
                  <option value="EMPLEADO">EMPLEADO (Solo Ventas)</option>
                  <option value="ADMIN">ADMINISTRADOR (Todo)</option>
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                  Contraseña Inicial
                </label>
                <input
                  type="password"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-torcoroma-dark focus:ring-2 focus:ring-torcoroma-gold outline-none"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  placeholder="Ej: 1234"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-torcoroma-dark hover:bg-black text-white font-black rounded-xl transition shadow-md"
                >
                  CREAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
