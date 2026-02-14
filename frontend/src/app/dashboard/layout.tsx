'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
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
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, token, checkAuth, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (!mounted || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
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
    <div className="min-h-screen flex bg-[var(--color-surface-alt)]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[260px] bg-white border-r border-[var(--color-border)] flex flex-col 
          transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Logo */}
        <div className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-md">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h2 className="font-bold text-base text-gray-900">KERAVEP</h2>
              <p className="text-[10px] text-gray-400 font-medium tracking-wider uppercase">Gestión</p>
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
                <Icon size={18} />
                <span className="flex-1">{item.name}</span>
                {isActive && <ChevronRight size={14} className="text-primary/50" />}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-[var(--color-border)]">
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
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-500 transition-colors w-full px-2 py-1.5 rounded-lg hover:bg-red-50"
          >
            <LogOut size={16} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-[var(--color-border)] px-4 py-3 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-600">
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-bold text-sm">KERAVEP</span>
          </div>
          <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-white text-[10px] font-bold">
            {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
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
