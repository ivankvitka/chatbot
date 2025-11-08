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
        this.logout();
      }
    }
  }

  async login(
    email: string,
    password: string
  ): Promise<{ user: User; token: string }> {
    const response = await authApi.login(email, password);
    const { user, access_token } = response;

    this.user = user;
    localStorage.setItem("token", access_token);
    localStorage.setItem("user", JSON.stringify(user));

    return { user, token: access_token };
  }

  async register(
    name: string,
    email: string,
    password: string
  ): Promise<{ user: User; token: string }> {
    const response = await authApi.register(name, email, password);
    const { user, access_token } = response;

    this.user = user;
    localStorage.setItem("token", access_token);
    localStorage.setItem("user", JSON.stringify(user));

    return { user, token: access_token };
  }

  async logout(): Promise<void> {
    this.user = null;
    localStorage.removeItem("token");
    localStorage.removeItem("user");
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
