import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { apiClient, ApiError } from '../services/apiClient';

export interface AuthUser {
  id: number;
  username: string;
}

interface AuthResponse {
  user: AuthUser;
  token: string;
}

export interface AuthStore {
  currentUser: AuthUser | null;
  token: string | null;
  isLoadingAuth: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (
    username: string,
    password: string,
    passwordConfirmation: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  currentUser: null,
  token: null,
  isLoadingAuth: true,

  login: async (username, password) => {
    const { user, token } = await apiClient.post<AuthResponse>(
      '/auth/login',
      { username, password },
    );
    await AsyncStorage.setItem('auth_token', token);
    await AsyncStorage.setItem('current_user', JSON.stringify(user));
    set({ token, currentUser: user });
  },

  register: async (username, password, passwordConfirmation) => {
    const { user, token } = await apiClient.post<AuthResponse>(
      '/auth/register',
      {
        username,
        password,
        password_confirmation: passwordConfirmation,
      },
    );
    await AsyncStorage.setItem('auth_token', token);
    await AsyncStorage.setItem('current_user', JSON.stringify(user));
    set({ token, currentUser: user });
  },

  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Token may already be invalid; still clear local session.
    }
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('current_user');
    set({ currentUser: null, token: null });
  },

  loadStoredAuth: async () => {
    const token = await AsyncStorage.getItem('auth_token');

    if (!token) {
      set({ isLoadingAuth: false });
      return;
    }

    try {
      const user = await apiClient.get<AuthUser>('/auth/me');
      set({ currentUser: user, token, isLoadingAuth: false });
    } catch (error) {
      if (error instanceof ApiError) {
        await AsyncStorage.removeItem('auth_token');
        await AsyncStorage.removeItem('current_user');
        set({ currentUser: null, token: null, isLoadingAuth: false });
        return;
      }
      throw error;
    }
  },
}));
