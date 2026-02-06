// lib/stores/user-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type UserRole = 'OWNER' | 'MANAGER' | 'CASHIER';

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
}

interface Shift {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  openingCash: number;
  closingCash?: number;
}

interface UserStore {
  // State
  users: User[];
  user: User | null;
  currentShift: Shift | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUsers: (products: User[]) => void;
  addUser: (product: User) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  setUser: (user: User | null) => void;
  login: (user: User) => void;
  logout: () => void;
  startShift: (openingCash: number) => void;
  endShift: (closingCash: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Computed
  canAccessPOS: () => boolean;
  canManageInventory: () => boolean;
  canViewReports: () => boolean;
  canManageUsers: () => boolean;
  isShiftActive: () => boolean;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      users: [],
      user: null,
      currentShift: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      setUsers: (users) => set({ users }),

      addUser: (product) =>
        set(state => ({
          users: [...state.users, product]
        })),

      updateUser: (id, updates) =>
        set(state => ({
          users: state.users.map(p =>
            p.id === id ? { ...p, ...updates } : p
          )
        })),

      deleteUser: (id) =>
        set(state => ({
          users: state.users.filter(p => p.id !== id)
        })),

      setUser: (user) => set({
        user,
        isAuthenticated: !!user
      }),

      login: (user) => set({
        user,
        isAuthenticated: true
      }),

      logout: () => set({
        user: null,
        currentShift: null,
        isAuthenticated: false
      }),

      startShift: (openingCash) => {
        const { user } = get();
        if (!user) return;

        const shift: Shift = {
          id: `shift-${Date.now()}`,
          userId: user.id,
          startTime: new Date(),
          openingCash
        };

        set({ currentShift: shift });
      },
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      endShift: (closingCash) => {
        const { currentShift } = get();
        if (!currentShift) return;

        set({
          currentShift: {
            ...currentShift,
            endTime: new Date(),
            closingCash
          }
        });

        // In real app, save shift to database
        // Then clear currentShift after saving
        setTimeout(() => {
          set({ currentShift: null });
        }, 1000);
      },

      // Permission checks
      canAccessPOS: () => {
        const { user } = get();
        return user !== null; // All authenticated users can access POS
      },

      canManageInventory: () => {
        const { user } = get();
        return user?.role === 'OWNER' || user?.role === 'MANAGER';
      },

      canViewReports: () => {
        const { user } = get();
        return user?.role === 'OWNER' || user?.role === 'MANAGER';
      },

      canManageUsers: () => {
        const { user } = get();
        return user?.role === 'OWNER';
      },

      isShiftActive: () => {
        const { currentShift } = get();
        return currentShift !== null && !currentShift.endTime;
      }
    }),
    {
      name: 'user-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        currentShift: state.currentShift
      })
    }
  )
);