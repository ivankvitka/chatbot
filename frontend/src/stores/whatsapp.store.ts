import { create } from "zustand";
import { AxiosError } from "axios";
import { whatsappApi } from "../services/whatsapp.api";

interface WhatsAppStatus {
  isReady: boolean;
}

interface WhatsAppGroup {
  id: string;
  name: string;
}

interface WhatsAppState {
  status: WhatsAppStatus | null;
  qrCode: string | null;
  groups: WhatsAppGroup[];
  loading: boolean;
  error: string | null;

  // Actions
  checkStatus: () => Promise<void>;
  loadQR: () => Promise<void>;
  getGroups: () => Promise<void>;
  sendScreenshot: (
    groupId: string,
    screenshotPath?: string,
    message?: string
  ) => Promise<void>;
  sendMessage: (chatId: string, message: string) => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearQR: () => void;
}

export const useWhatsAppStore = create<WhatsAppState>((set) => ({
  status: null,
  qrCode: null,
  groups: [],
  loading: false,
  error: null,

  checkStatus: async () => {
    try {
      const status = await whatsappApi.getStatus();
      set({ status, error: null });
    } catch (error: unknown) {
      console.error("Failed to load WhatsApp status:", error);
      const errorMessage =
        error instanceof AxiosError
          ? error.response?.data?.message || "Failed to load WhatsApp status"
          : "Failed to load WhatsApp status";
      set({
        error: errorMessage,
        status: null,
      });
    }
  },

  loadQR: async () => {
    try {
      set({ loading: true, error: null });
      const response = await whatsappApi.getQR();
      if (response.qr) {
        set({
          qrCode: response.qr,
          loading: false,
          error: null,
        });
      } else {
        set({
          qrCode: null,
          loading: false,
          error:
            "QR код не доступний. Можливо, WhatsApp вже підключено або виникла помилка.",
        });
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof AxiosError
          ? error.response?.data?.message || "Помилка завантаження QR коду"
          : "Помилка завантаження QR коду";
      set({
        loading: false,
        error: errorMessage,
        qrCode: null,
      });
    }
  },

  getGroups: async () => {
    try {
      set({ loading: true, error: null });
      const groups = await whatsappApi.getGroups();
      set({
        groups: Array.isArray(groups) ? groups : [],
        loading: false,
        error: null,
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof AxiosError
          ? error.response?.data?.message || "Failed to load groups"
          : "Failed to load groups";
      set({
        loading: false,
        error: errorMessage,
        groups: [],
      });
    }
  },

  sendScreenshot: async (
    groupId: string,
    screenshotPath?: string,
    message?: string
  ) => {
    try {
      set({ loading: true, error: null });
      await whatsappApi.sendScreenshot(groupId, screenshotPath, message);
      set({ loading: false, error: null });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof AxiosError
          ? error.response?.data?.message || "Failed to send screenshot"
          : "Failed to send screenshot";
      set({
        loading: false,
        error: errorMessage,
      });
      throw error;
    }
  },

  sendMessage: async (chatId: string, message: string) => {
    try {
      set({ loading: true, error: null });
      await whatsappApi.sendMessage(chatId, message);
      set({ loading: false, error: null });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof AxiosError
          ? error.response?.data?.message || "Failed to send message"
          : "Failed to send message";
      set({
        loading: false,
        error: errorMessage,
      });
      throw error;
    }
  },

  setLoading: (loading: boolean) => set({ loading }),
  setError: (error: string | null) => set({ error }),
  clearQR: () => set({ qrCode: null }),
}));
