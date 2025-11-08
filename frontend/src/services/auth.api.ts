import { createApiClient } from "./base.api";

class AuthApi {
  private api = createApiClient();

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
}

export const authApi = new AuthApi();
export default authApi;
