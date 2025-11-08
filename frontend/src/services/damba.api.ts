import { createApiClient } from "./base.api";

class DambaApi {
  private api = createApiClient();

  async getScreenshotLink() {
    const response = await this.api.get("/damba/screenshot");
    return response.data;
  }

  async getLastScreenshot() {
    const response = await this.api.get("/damba/last-screenshot");
    return response.data;
  }

  async saveToken(token: string) {
    const response = await this.api.post("/damba/token", { token });
    return response.data;
  }
}

export const dambaApi = new DambaApi();
export default dambaApi;
