import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';

interface AuthState {
  user: User | null;
  firebaseUid: string | null;
  isAuthenticated: boolean;
  setUser: (user: User | null, uid?: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      firebaseUid: null,
      isAuthenticated: false,
      setUser: (user, uid = null) => 
        set({ user, firebaseUid: uid, isAuthenticated: !!user }),
      logout: () => {
        set({ user: null, firebaseUid: null, isAuthenticated: false });
        try {
          localStorage.removeItem('meditrack-auth-storage');
        } catch (_) {}
      },
    }),
    {
      name: 'meditrack-auth-storage',
    }
  )
);

