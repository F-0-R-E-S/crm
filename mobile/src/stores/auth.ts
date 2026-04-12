import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { User, Tenant } from '../types';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api';
const BASE_URL = `${API_BASE}/v1`;

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hydrate: () => Promise<void>;
  login: (token: string, refreshToken: string, user: User, tenant?: Tenant | null) => Promise<void>;
  register: (token: string, refreshToken: string, user: User, tenant: Tenant) => Promise<void>;
  setTokens: (token: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  refreshToken: null,
  user: null,
  tenant: null,
  isAuthenticated: false,
  isLoading: true,

  hydrate: async () => {
    try {
      const [token, refreshToken, userStr, tenantStr] = await Promise.all([
        SecureStore.getItemAsync('token'),
        SecureStore.getItemAsync('refresh_token'),
        SecureStore.getItemAsync('user'),
        SecureStore.getItemAsync('tenant'),
      ]);

      let user = userStr ? JSON.parse(userStr) : null;
      const tenant = tenantStr ? JSON.parse(tenantStr) : null;

      if (token) {
        try {
          const res = await fetch(`${BASE_URL}/auth/me`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          });

          if (res.ok) {
            const me = await res.json();
            user = {
              id: me.id,
              email: me.email,
              name: me.name,
              role: me.role,
            } as User;
            await SecureStore.setItemAsync('user', JSON.stringify(user));
          }
        } catch {
          // ignore /auth/me hydration errors and use locally cached user
        }
      }

      set({
        token,
        refreshToken,
        user,
        tenant,
        isAuthenticated: !!token,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  login: async (token, refreshToken, user, tenant = null) => {
    await Promise.all([
      SecureStore.setItemAsync('token', token),
      SecureStore.setItemAsync('refresh_token', refreshToken),
      SecureStore.setItemAsync('user', JSON.stringify(user)),
      tenant ? SecureStore.setItemAsync('tenant', JSON.stringify(tenant)) : Promise.resolve(),
    ]);
    set({ token, refreshToken, user, tenant, isAuthenticated: true });
  },

  register: async (token, refreshToken, user, tenant) => {
    await Promise.all([
      SecureStore.setItemAsync('token', token),
      SecureStore.setItemAsync('refresh_token', refreshToken),
      SecureStore.setItemAsync('user', JSON.stringify(user)),
      SecureStore.setItemAsync('tenant', JSON.stringify(tenant)),
    ]);
    set({ token, refreshToken, user, tenant, isAuthenticated: true });
  },

  setTokens: async (token, refreshToken) => {
    await Promise.all([
      SecureStore.setItemAsync('token', token),
      SecureStore.setItemAsync('refresh_token', refreshToken),
    ]);
    set({ token, refreshToken });
  },

  logout: async () => {
    const refreshToken = get().refreshToken;

    if (refreshToken) {
      try {
        await fetch(`${BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      } catch {
        // ignore remote logout errors on client cleanup
      }
    }

    await Promise.all([
      SecureStore.deleteItemAsync('token'),
      SecureStore.deleteItemAsync('refresh_token'),
      SecureStore.deleteItemAsync('user'),
      SecureStore.deleteItemAsync('tenant'),
    ]);
    set({ token: null, refreshToken: null, user: null, tenant: null, isAuthenticated: false });
  },
}));
