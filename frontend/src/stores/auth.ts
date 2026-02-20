import { create } from 'zustand';
import { authApi, type User } from '@/lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('keravep_token') : null,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authApi.login(email, password);
      localStorage.setItem('keravep_token', res.access_token);
      set({ user: res.user, token: res.access_token, isLoading: false });
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error de conexión';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  logout: async () => {
    const token = get().token;
    if (token) {
      try {
        await authApi.logout(token);
      } catch {
        // continuar con logout local aunque falle la API
      }
    }
    localStorage.removeItem('keravep_token');
    set({ user: null, token: null });
  },

  checkAuth: async () => {
    const token = get().token;
    if (!token) return;
    try {
      const user = await authApi.getProfile(token);
      set({ user });
    } catch {
      localStorage.removeItem('keravep_token');
      set({ user: null, token: null });
    }
  },

  clearError: () => set({ error: null }),
}));
