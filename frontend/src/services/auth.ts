import { authApi } from "./auth.api";

export interface User {
  id: number;
  email: string;
  name: string;
}

class AuthService {
  private user: User | null = null;

  constructor() {
    this.loadUserFromStorage();
  }

  private loadUserFromStorage() {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (token && userData) {
      try {
        this.user = JSON.parse(userData);
      } catch (error) {
        // Clear invalid data
        this.user = null;
        localStorage.removeItem("token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user");
      }
    }
  }

  getRefreshToken(): string | null {
    return localStorage.getItem("refresh_token");
  }

  async login(
    email: string,
    password: string
  ): Promise<{ user: User; token: string }> {
    const response = await authApi.login(email, password);
    const { user, access_token, refresh_token } = response;

    this.user = user;
    localStorage.setItem("token", access_token);
    localStorage.setItem("refresh_token", refresh_token);
    localStorage.setItem("user", JSON.stringify(user));

    return { user, token: access_token };
  }

  async register(
    name: string,
    email: string,
    password: string
  ): Promise<{ user: User; token: string }> {
    const response = await authApi.register(name, email, password);
    const { user, access_token, refresh_token } = response;

    this.user = user;
    localStorage.setItem("token", access_token);
    localStorage.setItem("refresh_token", refresh_token);
    localStorage.setItem("user", JSON.stringify(user));

    return { user, token: access_token };
  }

  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem("refresh_token");
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch (error) {
        // Ignore errors during logout
        console.error("Logout error:", error);
      }
    }
    this.user = null;
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
  }

  async refreshToken(): Promise<string | null> {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) {
      return null;
    }

    try {
      const response = await authApi.refresh(refreshToken);
      localStorage.setItem("token", response.access_token);
      localStorage.setItem("refresh_token", response.refresh_token);
      return response.access_token;
    } catch (error) {
      // Refresh failed, clear tokens
      this.logout();
      return null;
    }
  }

  getCurrentUser(): User | null {
    return this.user;
  }

  isAuthenticated(): boolean {
    return !!this.user && !!localStorage.getItem("token");
  }

  async getProfile(): Promise<User> {
    const response = await authApi.getProfile();
    return response;
  }

  async refreshProfile(): Promise<User | null> {
    try {
      if (!this.isAuthenticated()) {
        return null;
      }

      const user = await authApi.getProfile();
      this.user = user;
      localStorage.setItem("user", JSON.stringify(user));
      return user;
    } catch (error) {
      this.logout();
      return null;
    }
  }
}

export const authService = new AuthService();
export default authService;
