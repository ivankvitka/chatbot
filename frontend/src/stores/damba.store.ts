import { create } from "zustand";
import { AxiosError } from "axios";
import { dambaApi } from "../services/damba.api";

interface DambaState {
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;

  // Actions
  checkStatus: () => Promise<void>;
  saveToken: (token: string) => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useDambaStore = create<DambaState>((set) => ({
  isAuthenticated: false,
  loading: false,
  error: null,

  checkStatus: async () => {
    try {
      const response = await dambaApi.getStatus();
      set({ isAuthenticated: response.isAuthenticated, error: null });
    } catch (error: unknown) {
      console.error("Failed to load Damba status:", error);
      const errorMessage =
        error instanceof AxiosError
          ? error.response?.data?.message || "Failed to load Damba status"
          : "Failed to load Damba status";
      set({
        error: errorMessage,
        isAuthenticated: false,
      });
    }
  },

  saveToken: async (token: string) => {
    try {
      set({ loading: true, error: null });
      await dambaApi.saveToken(token);
      // Refresh status after saving token
      const response = await dambaApi.getStatus();
      set({
        isAuthenticated: response.isAuthenticated,
        loading: false,
        error: null,
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof AxiosError
          ? error.response?.data?.message || "Failed to save token"
          : "Failed to save token";
      set({
        loading: false,
        error: errorMessage,
      });
      throw error;
    }
  },

  setLoading: (loading: boolean) => set({ loading }),
  setError: (error: string | null) => set({ error }),
}));
