'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';
import { useNotificationsStore } from '@/stores/notifications';
import { authApi } from '@/lib/api';
import Link from 'next/link';
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  Warehouse,
  CreditCard,
  TrendingUp,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Lock,
  Bell,
  Sun,
  Moon,
  Settings,
  User,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Ventas', href: '/dashboard/ventas', icon: ShoppingCart },
  { name: 'Clientes', href: '/dashboard/clientes', icon: Users },
  { name: 'Almacén', href: '/dashboard/almacen', icon: Warehouse },
  { name: 'Productos', href: '/dashboard/productos', icon: Package },
  { name: 'Cuentas por Cobrar', href: '/dashboard/cuentas', icon: CreditCard },
  { name: 'Vendedores', href: '/dashboard/vendedores', icon: TrendingUp },
  { name: 'Cierre de Caja', href: '/dashboard/cierres', icon: Lock },
  { name: 'Notificaciones', href: '/dashboard/notificaciones', icon: Bell },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, token, checkAuth, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { unreadCount, fetchUnreadCount } = useNotificationsStore();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    // Aplicar tema al montar
    const savedTheme = localStorage.getItem('keravep_theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      const storedToken = localStorage.getItem('keravep_token');
      if (!storedToken) {
        router.push('/');
        return;
      }
      if (!user) {
        checkAuth();
      }
    }
  }, [mounted, user, checkAuth, router]);

  // Polling de notificaciones no leídas
  useEffect(() => {
    if (!token) return;
    fetchUnreadCount(token);
    const interval = setInterval(() => fetchUnreadCount(token), 30000);
    return () => clearInterval(interval);
  }, [token, fetchUnreadCount]);

  // Cerrar menú de perfil al hacer click fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    if (token) {
      try {
        await authApi.logout(token);
      } catch {
        // continuar con logout local
      }
    }
    logout();
    router.push('/');
  };

  if (!mounted || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#D4A03C]/30 border-t-[#D4A03C] rounded-full animate-spin" />
      </div>
    );
  }

  const roleLabels: Record<string, string> = {
    ADMIN: 'Administrador',
    VENDEDOR: 'Vendedor',
    ALMACENERO: 'Almacenero',
  };

  const roleBadgeColors: Record<string, string> = {
    ADMIN: 'badge-purple',
    VENDEDOR: 'badge-success',
    ALMACENERO: 'badge-info',
  };

  return (
    <div className="min-h-screen flex bg-[var(--color-surface-alt)] transition-colors duration-300">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[260px] bg-white dark:bg-[#1a1a2e] border-r border-[var(--color-border)] dark:border-[#2a2a40] flex flex-col 
          transform transition-all duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Logo */}
        <div className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full border-2 border-[#D4A03C] bg-[#0f0f1a] flex items-center justify-center shadow-md">
              <span className="text-[#D4A03C] font-bold text-[10px] tracking-wider">KV</span>
            </div>
            <div>
              <h2 className="font-bold text-base text-gray-900">KERAVEN</h2>
              <p className="text-[10px] text-gray-400 font-medium tracking-wider uppercase">Profesional</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
              >
                <div className="relative">
                  <Icon size={18} />
                  {item.name === 'Notificaciones' && unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
                <span className="flex-1">{item.name}</span>
                {isActive && <ChevronRight size={14} className="text-[#D4A03C]/50" />}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-[var(--color-border)] dark:border-[#2a2a40]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold">
              {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <span className={`badge ${roleBadgeColors[user?.role || 'ADMIN']} text-[10px]`}>
                {roleLabels[user?.role || 'ADMIN']}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-500 transition-colors w-full px-2 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <LogOut size={16} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top header bar */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-[#1a1a2e]/80 backdrop-blur-md border-b border-[var(--color-border)] dark:border-[#2a2a40] px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-600 dark:text-gray-400">
              <Menu size={22} />
            </button>
            <div className="hidden lg:flex items-center gap-2">
              <h1 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {navigation.find((n) => n.href === pathname || (n.href !== '/dashboard' && pathname.startsWith(n.href)))?.name || 'Dashboard'}
              </h1>
            </div>
            <div className="lg:hidden flex items-center gap-2">
              <div className="w-7 h-7 rounded-full border border-[#D4A03C] bg-[#0f0f1a] flex items-center justify-center">
                <span className="text-[#D4A03C] font-bold text-[8px]">KV</span>
              </div>
              <span className="font-bold text-sm text-gray-900">KERAVEN</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#252540] transition-colors"
              title={theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} className="text-[#E8C468]" />}
            </button>

            {/* Notifications Bell */}
            <Link
              href="/dashboard/notificaciones"
              className="relative w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#252540] transition-colors"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center pulse-glow">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            {/* Profile Dropdown */}
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-white text-[11px] font-bold hover:opacity-90 transition-opacity ring-2 ring-transparent hover:ring-[#D4A03C]/30"
              >
                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
              </button>

              {/* Dropdown Menu */}
              {profileMenuOpen && (
                <div className="absolute right-0 top-12 w-64 rounded-xl glass-card shadow-xl border border-[var(--color-border)] dark:border-[#2a2a40] py-2 animate-fade-in z-50">
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-[var(--color-border)] dark:border-[#2a2a40]">
                    <p className="text-sm font-semibold text-gray-900">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                    <span className={`badge ${roleBadgeColors[user?.role || 'ADMIN']} text-[10px] mt-1`}>
                      {roleLabels[user?.role || 'ADMIN']}
                    </span>
                  </div>

                  {/* Menu items */}
                  <div className="py-1">
                    <Link
                      href="/dashboard/perfil"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#252540] transition-colors"
                    >
                      <Settings size={16} className="text-gray-400" />
                      Configuración de perfil
                    </Link>
                    <Link
                      href="/dashboard/notificaciones"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#252540] transition-colors"
                    >
                      <Bell size={16} className="text-gray-400" />
                      <span className="flex-1">Notificaciones</span>
                      {unreadCount > 0 && (
                        <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </Link>
                  </div>

                  {/* Separator & Logout */}
                  <div className="border-t border-[var(--color-border)] dark:border-[#2a2a40] pt-1">
                    <button
                      onClick={() => {
                        setProfileMenuOpen(false);
                        handleLogout();
                      }}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors w-full"
                    >
                      <LogOut size={16} />
                      Cerrar Sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
