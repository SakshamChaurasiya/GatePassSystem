import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      role: null,
      isAuthenticated: false,
      mustChangePassword: false,

      login: ({ token, role, mustChangePassword }) =>
        set({
          token,
          role,
          isAuthenticated: true,
          mustChangePassword: mustChangePassword || false,
        }),

      passwordChanged: () =>
        set({ mustChangePassword: false }),

      logout: () =>
        set({
          token: null,
          role: null,
          isAuthenticated: false,
          mustChangePassword: false,
        }),
    }),
    {
      name: 'auth-storage',
    }
  )
);

export default useAuthStore;