import axios, { type AxiosInstance } from "axios";

class ApiService {
  private api: AxiosInstance;
  private baseURL = "http://localhost:3000";

  constructor() {
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add request interceptor to include auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem("token");
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor to handle auth errors
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const response = await this.api.post("/auth/login", { email, password });
    return response.data;
  }

  async register(name: string, email: string, password: string) {
    const response = await this.api.post("/auth/register", {
      name,
      email,
      password,
    });
    return response.data;
  }

  async getProfile() {
    const response = await this.api.get("/auth/profile");
    return response.data;
  }

  // Screenshot endpoints
  async captureScreenshot(options?: {
    url?: string;
    width?: number;
    height?: number;
    fullPage?: boolean;
    waitForSelector?: string;
    delay?: number;
  }) {
    const response = await this.api.post("/screenshot/capture", options || {});
    return response.data;
  }

  async downloadScreenshot(filepath: string) {
    const response = await this.api.get("/screenshot/download", {
      params: { filepath },
      responseType: "blob",
    });
    return response.data;
  }

  // WhatsApp endpoints
  async getWhatsAppStatus() {
    const response = await this.api.get("/whatsapp/status");
    return response.data;
  }

  async getWhatsAppQR() {
    const response = await this.api.get("/whatsapp/qr");
    return response.data;
  }

  async getWhatsAppGroups() {
    const response = await this.api.get("/whatsapp/groups");
    return response.data;
  }

  async sendScreenshotToGroup(
    groupId: string,
    screenshotPath?: string,
    message?: string
  ) {
    const response = await this.api.post("/whatsapp/send-screenshot", {
      groupId,
      screenshotPath,
      message,
    });
    return response.data;
  }

  async captureAndSendToGroup(
    groupId: string,
    options?: {
      url?: string;
      message?: string;
      screenshotOptions?: {
        width?: number;
        height?: number;
        fullPage?: boolean;
        waitForSelector?: string;
        delay?: number;
      };
    }
  ) {
    const response = await this.api.post("/whatsapp/capture-and-send", {
      groupId,
      ...options,
    });
    return response.data;
  }

  async sendMessage(chatId: string, message: string) {
    const response = await this.api.post("/whatsapp/send-message", {
      chatId,
      message,
    });
    return response.data;
  }
}

export const apiService = new ApiService();
export default apiService;
