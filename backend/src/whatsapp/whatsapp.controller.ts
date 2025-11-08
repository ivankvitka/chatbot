import { Controller, Get } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';

@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get('qr')
  getQR() {
    const qr = this.whatsappService.getQRCode();
    return { qr };
  }

  @Get('status')
  getStatus() {
    return this.whatsappService.getStatus();
  }

  @Get('groups')
  async getGroups() {
    return this.whatsappService.getGroups();
  }
}
