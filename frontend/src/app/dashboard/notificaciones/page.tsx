'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useNotificationsStore } from '@/stores/notifications';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  Package,
  AlertTriangle,
  ShoppingCart,
  XCircle,
  UserPlus,
  DollarSign,
  CalendarCheck,
  LogOut as LogOutIcon,
  UserX,
  ArrowLeftRight,
  Monitor,
  Clock,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import type { Notification, NotificationType } from '@/lib/api';

const typeConfig: Record<NotificationType, { icon: typeof Bell; color: string; bg: string }> = {
  STOCK_BAJO: { icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
  STOCK_AGOTADO: { icon: Package, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
  NUEVA_VENTA: { icon: ShoppingCart, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
  VENTA_CANCELADA: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
  NUEVO_CLIENTE: { icon: UserPlus, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  PAGO_RECIBIDO: { icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  CUENTA_VENCIDA: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  CIERRE_CAJA: { icon: CalendarCheck, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  SESION_CERRADA: { icon: LogOutIcon, color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-800/50' },
  USUARIO_DESACTIVADO: { icon: UserX, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
  TRANSFERENCIA: { icon: ArrowLeftRight, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
  SISTEMA: { icon: Monitor, color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-800/50' },
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Hace un momento';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Hace ${days}d`;
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export default function NotificacionesPage() {
  const { token } = useAuthStore();
  const {
    notifications,
    unreadCount,
    total,
    loading,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotificationsStore();

  const [page, setPage] = useState(1);
  const [filterUnread, setFilterUnread] = useState(false);
  const limit = 15;

  useEffect(() => {
    if (token) {
      fetchNotifications(token, page, limit, filterUnread);
    }
  }, [token, page, filterUnread, fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    if (token) {
      await markAsRead(token, id);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (token) {
      await markAllAsRead(token);
      await fetchNotifications(token, page, limit, filterUnread);
    }
  };

  const handleDelete = async (id: string) => {
    if (token) {
      await deleteNotification(token, id);
      fetchNotifications(token, page, limit, filterUnread);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notificaciones</h1>
          <p className="text-sm text-gray-500 mt-1">
            {unreadCount > 0
              ? `Tienes ${unreadCount} notificación${unreadCount > 1 ? 'es' : ''} sin leer`
              : 'Todas las notificaciones leídas'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setFilterUnread(!filterUnread);
              setPage(1);
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
              filterUnread
                ? 'bg-[#D4A03C] text-white'
                : 'bg-white dark:bg-[#1a1a2e] border border-[var(--color-border)] dark:border-[#2a2a40] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#252540]'
            }`}
          >
            <Filter size={16} />
            {filterUnread ? 'Solo no leídas' : 'Todas'}
          </button>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-white dark:bg-[#1a1a2e] border border-[var(--color-border)] dark:border-[#2a2a40] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#252540] transition-colors"
            >
              <CheckCheck size={16} />
              Marcar todas como leídas
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-[#D4A03C]/30 border-t-[#D4A03C] rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <BellOff size={48} className="mb-4 opacity-50" />
            <p className="text-lg font-medium">No hay notificaciones</p>
            <p className="text-sm mt-1">
              {filterUnread ? 'No tienes notificaciones sin leer' : 'Aún no tienes notificaciones'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)] dark:divide-[#2a2a40]">
            {notifications.map((notification: Notification) => {
              const config = typeConfig[notification.type] || typeConfig.SISTEMA;
              const Icon = config.icon;

              return (
                <div
                  key={notification.id}
                  className={`flex items-start gap-4 p-4 transition-colors hover:bg-gray-50/50 dark:hover:bg-[#252540]/50 ${
                    !notification.isRead ? 'bg-[#D4A03C]/5 dark:bg-[#D4A03C]/5' : ''
                  }`}
                >
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={18} className={config.color} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={`text-sm font-medium ${!notification.isRead ? 'text-gray-900' : 'text-gray-600 dark:text-gray-400'}`}>
                          {notification.title}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-500 mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <span className="w-2.5 h-2.5 bg-[#D4A03C] rounded-full flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-gray-400">{timeAgo(notification.createdAt)}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${config.bg} ${config.color}`}>
                        {notification.type.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!notification.isRead && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                        title="Marcar como leída"
                      >
                        <Check size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notification.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--color-border)] dark:border-[#2a2a40]">
            <p className="text-sm text-gray-500">{total} notificaciones en total</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-[var(--color-border)] dark:border-[#2a2a40] text-gray-500 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-[#252540] transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400 px-2">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-[var(--color-border)] dark:border-[#2a2a40] text-gray-500 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-[#252540] transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
