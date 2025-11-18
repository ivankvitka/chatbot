import { createApiClient } from "./base.api";

export interface Zone {
  id: number;
  zoneId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

class DambaApi {
  private api = createApiClient();

  async getScreenshot() {
    const response = await this.api.get("/damba/screenshot");
    return response.data;
  }

  async saveToken(token: string) {
    const response = await this.api.post("/damba/token", { token });
    return response.data;
  }

  async getStatus() {
    const response = await this.api.get("/damba/screenshot");
    return { isAuthenticated: response.data.isAuthenticated ?? true };
  }

  // Zone management methods
  async getAllZones() {
    const response = await this.api.get("/damba/zones");
    return response.data.zones as Zone[];
  }

  async createZone(zoneId: string, name: string) {
    const response = await this.api.post("/damba/zones", { zoneId, name });
    return response.data.zone as Zone;
  }

  async updateZone(id: number, name: string) {
    const response = await this.api.put(`/damba/zones/${id}`, { name });
    return response.data.zone as Zone;
  }

  async deleteZone(id: number) {
    const response = await this.api.delete(`/damba/zones/${id}`);
    return response.data;
  }
}

export const dambaApi = new DambaApi();
export default dambaApi;
