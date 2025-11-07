import { Controller, Get, Post, Body } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';

@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get('status')
  async getStatus() {
    return this.whatsappService.getStatus();
  }

  @Get('qr')
  async getQRCode() {
    const qr = await this.whatsappService.getQRCode();
    return {
      qr,
      message: qr
        ? 'Scan this QR code with WhatsApp'
        : 'Already authenticated or timeout',
    };
  }

  @Get('groups')
  async getGroups() {
    const groups = await this.whatsappService.getGroups();
    return {
      groups,
      count: groups.length,
    };
  }

  @Post('send-screenshot')
  async sendScreenshot(
    @Body()
    body: {
      groupId: string;
      screenshotPath?: string;
      message?: string;
    },
  ) {
    if (!body.groupId) {
      return {
        success: false,
        error: 'groupId is required',
      };
    }

    return this.whatsappService.sendScreenshotToGroup(
      body.groupId,
      body.screenshotPath,
      body.message,
    );
  }

  @Post('send-message')
  async sendMessage(@Body() body: { chatId: string; message: string }) {
    if (!body.chatId || !body.message) {
      return {
        success: false,
        error: 'chatId and message are required',
      };
    }

    return this.whatsappService.sendTextMessage(body.chatId, body.message);
  }
}
