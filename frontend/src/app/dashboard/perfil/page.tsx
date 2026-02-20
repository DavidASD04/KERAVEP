'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';
import { authApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  User,
  Mail,
  Phone,
  Shield,
  Sun,
  Moon,
  Save,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function PerfilPage() {
  const { user, token, checkAuth } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!token) return;
    setSaving(true);
    try {
      await authApi.updateProfile(token, { firstName, lastName, phone });
      toast.success('Perfil actualizado correctamente');
      checkAuth();
    } catch {
      toast.error('Error al actualizar el perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!token) return;
    if (newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    setChangingPassword(true);
    try {
      await authApi.updateProfile(token, { currentPassword, newPassword });
      toast.success('Contraseña actualizada correctamente');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      toast.error('Error al cambiar la contraseña. Verifica tu contraseña actual.');
    } finally {
      setChangingPassword(false);
    }
  };

  const roleLabels: Record<string, string> = {
    ADMIN: 'Administrador',
    VENDEDOR: 'Vendedor',
    ALMACENERO: 'Almacenero',
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración de Perfil</h1>
        <p className="text-sm text-gray-500 mt-1">Administra tu información personal y preferencias</p>
      </div>

      {/* Profile Card */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center text-white text-xl font-bold">
            {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{user?.firstName} {user?.lastName}</h2>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <span className="inline-flex items-center gap-1 text-xs bg-[#D4A03C]/10 text-[#D4A03C] px-2 py-0.5 rounded-full font-medium mt-1">
              <Shield size={12} />
              {roleLabels[user?.role || 'ADMIN']}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                <User size={14} className="inline mr-1.5" />Nombre
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="input"
                placeholder="Tu nombre"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                <User size={14} className="inline mr-1.5" />Apellido
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="input"
                placeholder="Tu apellido"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                <Mail size={14} className="inline mr-1.5" />Email
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="input opacity-60 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                <Phone size={14} className="inline mr-1.5" />Teléfono
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input"
                placeholder="Tu teléfono"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="btn-primary flex items-center gap-2"
            >
              <Save size={16} />
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Lock size={18} />
          Cambiar Contraseña
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Contraseña actual
            </label>
            <div className="relative">
              <input
                type={showCurrentPw ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="input pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPw(!showCurrentPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Nueva contraseña
              </label>
              <div className="relative">
                <input
                  type={showNewPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Confirmar contraseña
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleChangePassword}
              disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              <Lock size={16} />
              {changingPassword ? 'Cambiando...' : 'Cambiar Contraseña'}
            </button>
          </div>
        </div>
      </div>

      {/* Theme Preferences */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Preferencia de Tema</h3>
        <div className="flex items-center gap-4">
          <button
            onClick={() => theme !== 'light' && toggleTheme()}
            className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
              theme === 'light'
                ? 'border-[#D4A03C] bg-[#D4A03C]/5'
                : 'border-[var(--color-border)] dark:border-[#2a2a40] hover:border-gray-300 dark:hover:border-[#3a3a50]'
            }`}
          >
            <Sun size={24} className={theme === 'light' ? 'text-[#D4A03C]' : 'text-gray-400'} />
            <div className="text-left">
              <p className={`text-sm font-semibold ${theme === 'light' ? 'text-[#D4A03C]' : 'text-gray-500 dark:text-gray-400'}`}>
                Modo Claro
              </p>
              <p className="text-xs text-gray-400">Fondo blanco, texto oscuro</p>
            </div>
          </button>
          <button
            onClick={() => theme !== 'dark' && toggleTheme()}
            className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
              theme === 'dark'
                ? 'border-[#D4A03C] bg-[#D4A03C]/5'
                : 'border-[var(--color-border)] dark:border-[#2a2a40] hover:border-gray-300 dark:hover:border-[#3a3a50]'
            }`}
          >
            <Moon size={24} className={theme === 'dark' ? 'text-[#E8C468]' : 'text-gray-400'} />
            <div className="text-left">
              <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-[#E8C468]' : 'text-gray-500 dark:text-gray-400'}`}>
                Modo Oscuro
              </p>
              <p className="text-xs text-gray-400">Fondo oscuro, texto claro</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
