import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      role: null,
      mustChangePassword: false,
      isAuthenticated: false,

      login: ({ token, role, mustChangePassword }) => {
        set({
          token,
          role,
          mustChangePassword: mustChangePassword || false,
          isAuthenticated: true,
        });
      },

      passwordChanged: () => {
        set({ mustChangePassword: false });
      },

      logout: () => {
        set({
          token: null,
          role: null,
          mustChangePassword: false,
          isAuthenticated: false,
        });
      },

      getToken: () => get().token,
    }),
    {
      name: 'gatepass-auth',
    }
  )
);

export default useAuthStore;
