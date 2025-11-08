import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authService, type User } from "../services/auth";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearAuthData: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      loading: true, // Start with loading true to prevent flash
      error: null,

      login: async (email: string, password: string) => {
        try {
          set({ loading: true, error: null });
          const { user } = await authService.login(email, password);
          set({
            user,
            isAuthenticated: true,
            loading: false,
            error: null,
          });
        } catch (error: unknown) {
          const errorMessage =
            error && typeof error === "object" && "response" in error
              ? (error as { response?: { data?: { message?: string } } })
                  .response?.data?.message
              : undefined;
          set({
            loading: false,
            error: errorMessage || "Login failed",
            isAuthenticated: false,
            user: null,
          });
          throw error;
        }
      },

      register: async (name: string, email: string, password: string) => {
        try {
          set({ loading: true, error: null });
          const { user } = await authService.register(name, email, password);
          set({
            user,
            isAuthenticated: true,
            loading: false,
            error: null,
          });
        } catch (error: unknown) {
          const errorMessage =
            error && typeof error === "object" && "response" in error
              ? (error as { response?: { data?: { message?: string } } })
                  .response?.data?.message
              : undefined;
          set({
            loading: false,
            error: errorMessage || "Registration failed",
            isAuthenticated: false,
            user: null,
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          await authService.logout();
        } catch (error) {
          console.error("Logout error:", error);
        } finally {
          set({
            user: null,
            isAuthenticated: false,
            error: null,
          });
        }
      },

      checkAuth: async () => {
        try {
          set({ loading: true });
          const token = localStorage.getItem("token");

          // If we have persisted state and token, verify token is still valid
          if (token) {
            try {
              const user = await authService.getProfile();
              // Token is valid, update user if needed
              set({
                user,
                isAuthenticated: true,
                loading: false,
              });
            } catch {
              // Token is invalid, try to refresh
              try {
                const newToken = await authService.refreshToken();
                if (newToken) {
                  // Refresh successful, get user profile
                  const user = await authService.getProfile();
                  set({
                    user,
                    isAuthenticated: true,
                    loading: false,
                  });
                } else {
                  // Refresh failed, clear all auth data
                  set({
                    user: null,
                    isAuthenticated: false,
                    loading: false,
                  });
                  localStorage.removeItem("token");
                  localStorage.removeItem("refresh_token");
                  localStorage.removeItem("user");
                }
              } catch {
                // Refresh also failed, clear all auth data
                set({
                  user: null,
                  isAuthenticated: false,
                  loading: false,
                });
                localStorage.removeItem("token");
                localStorage.removeItem("refresh_token");
                localStorage.removeItem("user");
              }
            }
          } else {
            // No token, clear state but keep persisted data if exists
            const persistedState = localStorage.getItem("auth-storage");
            if (
              !persistedState ||
              persistedState === '{"state":{},"version":0}'
            ) {
              // No persisted state, clear everything
              set({
                user: null,
                isAuthenticated: false,
                loading: false,
              });
            } else {
              // We have persisted state but no token - this shouldn't happen
              // Clear everything to be safe
              set({
                user: null,
                isAuthenticated: false,
                loading: false,
              });
              localStorage.removeItem("token");
              localStorage.removeItem("refresh_token");
              localStorage.removeItem("user");
            }
          }
        } catch (error) {
          // Unexpected error - don't clear if we have valid persisted state
          console.error("Auth check error:", error);
          const token = localStorage.getItem("token");
          if (!token) {
            set({
              user: null,
              isAuthenticated: false,
              loading: false,
            });
            localStorage.removeItem("token");
            localStorage.removeItem("refresh_token");
            localStorage.removeItem("user");
          } else {
            // We have token but error occurred - set loading to false
            // Let the user stay authenticated based on persisted state
            set({ loading: false });
          }
        }
      },

      clearAuthData: () => {
        localStorage.removeItem("token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user");
        set({
          user: null,
          isAuthenticated: false,
          loading: false,
        });
      },

      refreshProfile: async () => {
        try {
          const user = await authService.refreshProfile();
          if (user) {
            set({ user, isAuthenticated: true });
          } else {
            set({ user: null, isAuthenticated: false });
          }
        } catch {
          set({ user: null, isAuthenticated: false });
        }
      },

      setLoading: (loading: boolean) => set({ loading }),
      setError: (error: string | null) => set({ error }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // After rehydration, set loading to true so checkAuth can verify token
        // This prevents showing unauthenticated state before verification
        if (state) {
          state.loading = true;
        }
      },
    }
  )
);
