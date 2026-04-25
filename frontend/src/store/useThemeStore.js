import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'dark',

      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        set({ theme: next });
      },

      initTheme: () => {
        const t = get().theme;
        document.documentElement.setAttribute('data-theme', t);
      },
    }),
    { name: 'gatepass-theme' }
  )
);

export default useThemeStore;
