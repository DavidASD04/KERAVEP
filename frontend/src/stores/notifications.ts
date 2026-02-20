import { create } from 'zustand';
import { notificationsApi, type Notification } from '@/lib/api';

interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  total: number;
  totalPages: number;
  currentPage: number;
  fetchNotifications: (token: string, page?: number, limit?: number, unreadOnly?: boolean) => Promise<void>;
  fetchUnreadCount: (token: string) => Promise<void>;
  markAsRead: (token: string, id: string) => Promise<void>;
  markAllAsRead: (token: string) => Promise<void>;
  deleteNotification: (token: string, id: string) => Promise<void>;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  total: 0,
  totalPages: 1,
  currentPage: 1,

  fetchNotifications: async (token: string, page = 1, limit = 20, unreadOnly = false) => {
    set({ loading: true });
    try {
      const params: Record<string, string> = {
        page: String(page),
        limit: String(limit),
      };
      if (unreadOnly) params.unreadOnly = 'true';
      const res = await notificationsApi.getAll(token, params);
      set({
        notifications: res.data,
        total: res.total,
        totalPages: res.totalPages,
        currentPage: res.page,
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },

  fetchUnreadCount: async (token: string) => {
    try {
      const res = await notificationsApi.getUnreadCount(token);
      set({ unreadCount: res.count });
    } catch {
      // silently fail
    }
  },

  markAsRead: async (token: string, id: string) => {
    try {
      await notificationsApi.markAsRead(token, id);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true } : n,
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch {
      // silently fail
    }
  },

  markAllAsRead: async (token: string) => {
    try {
      await notificationsApi.markAllAsRead(token);
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      }));
    } catch {
      // silently fail
    }
  },

  deleteNotification: async (token: string, id: string) => {
    try {
      await notificationsApi.delete(token, id);
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }));
    } catch {
      // silently fail
    }
  },
}));
