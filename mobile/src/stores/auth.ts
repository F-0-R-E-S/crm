import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { User, Tenant } from '../types';

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

export const useAuthStore = create<AuthState>((set) => ({
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
      const user = userStr ? JSON.parse(userStr) : null;
      const tenant = tenantStr ? JSON.parse(tenantStr) : null;
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
    await Promise.all([
      SecureStore.deleteItemAsync('token'),
      SecureStore.deleteItemAsync('refresh_token'),
      SecureStore.deleteItemAsync('user'),
      SecureStore.deleteItemAsync('tenant'),
    ]);
    set({ token: null, refreshToken: null, user: null, tenant: null, isAuthenticated: false });
  },
}));
