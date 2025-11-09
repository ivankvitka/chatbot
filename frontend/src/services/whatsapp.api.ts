import { createApiClient } from "./base.api";

class WhatsappApi {
  private api = createApiClient();

  async getStatus() {
    const response = await this.api.get("/whatsapp/status");
    return response.data;
  }

  async getQR() {
    const response = await this.api.get("/whatsapp/qr");
    return response.data;
  }

  async getGroups() {
    const response = await this.api.get("/whatsapp/groups");
    return response.data;
  }

  async sendScreenshot(
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

  async sendMessage(chatId: string, message: string) {
    const response = await this.api.post("/whatsapp/send-message", {
      chatId,
      message,
    });
    return response.data;
  }

  async getGroupSettings(groupId: string) {
    const response = await this.api.get(`/whatsapp/groups/${groupId}/settings`);
    return response.data;
  }

  async updateGroupSettings(
    groupId: string,
    groupName: string,
    intervalMinutes: number,
    enabled: boolean,
    reactOnMessage?: string
  ) {
    const response = await this.api.post("/whatsapp/groups/settings", {
      groupId,
      groupName,
      intervalMinutes,
      enabled,
      reactOnMessage,
    });
    return response.data;
  }

  async deleteGroupSettings(groupId: string) {
    const response = await this.api.delete(
      `/whatsapp/groups/${groupId}/settings`
    );
    return response.data;
  }

  async sendMessageToGroups(groupIds: string[], message?: string) {
    const response = await this.api.post("/whatsapp/send-message", {
      groupIds,
      message,
    });
    return response.data;
  }
}

export const whatsappApi = new WhatsappApi();
export default whatsappApi;
