import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class WhatsappService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsappService.name);
  private client: Client | null = null;
  private qrCode: string | null = null;
  private isReady: boolean = false;

  onModuleInit() {
    this.initializeClient();
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.destroy();
      this.logger.log('WhatsApp client destroyed');
    }
  }

  private initializeClient() {
    const sessionPath = path.join(process.cwd(), 'whatsapp-session');

    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: sessionPath,
      }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    });

    this.client.on('qr', (qr) => {
      this.logger.log('QR code received');
      this.qrCode = qr;
      this.isReady = false;
    });

    this.client.on('ready', () => {
      this.logger.log('WhatsApp client is ready!');
      this.isReady = true;
      this.qrCode = null;
    });

    this.client.on('authenticated', () => {
      this.logger.log('WhatsApp client authenticated');
      this.qrCode = null;
    });

    this.client.on('auth_failure', (msg) => {
      this.logger.error('WhatsApp authentication failure:', msg);
      this.isReady = false;
      this.qrCode = null;
    });

    this.client.on('disconnected', (reason) => {
      this.logger.warn('WhatsApp client disconnected:', reason);
      this.isReady = false;
      this.qrCode = null;
    });

    this.client.on('loading_screen', (percent, message) => {
      this.logger.log(`Loading: ${percent}% - ${message}`);
    });

    this.client.initialize().catch((error) => {
      this.logger.error('Failed to initialize WhatsApp client:', error);
    });
  }

  async sendScreenshotToGroup(
    groupId: string,
    screenshotPath: string,
    filename: string,
  ): Promise<void> {
    if (!this.client || !this.isReady) {
      throw new Error('WhatsApp client is not ready');
    }

    try {
      // Check if file exists
      try {
        await fs.access(screenshotPath);
      } catch {
        this.logger.error(`Screenshot file not found: ${screenshotPath}`);
        throw new Error(`Screenshot file not found: ${screenshotPath}`);
      }

      // Read file as buffer
      const fileBuffer = await fs.readFile(screenshotPath);

      // Create MessageMedia from buffer
      const media = new MessageMedia(
        'image/png',
        fileBuffer.toString('base64'),
        filename,
      );

      // Send to WhatsApp group
      const chat = await this.client.getChatById(groupId);
      await chat.sendMessage(media);

      this.logger.log(`Screenshot sent successfully to group ${groupId}`);
    } catch (error) {
      this.logger.error(
        `Error sending screenshot to group ${groupId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  getQRCode(): string | null {
    return this.qrCode;
  }

  getStatus(): { isReady: boolean } {
    return { isReady: this.isReady };
  }

  getClient(): Client | null {
    return this.client;
  }

  async getGroups(): Promise<Array<{ id: string; name: string }>> {
    if (!this.client || !this.isReady) {
      throw new Error('WhatsApp client is not ready');
    }

    try {
      const chats = await this.client.getChats();
      const groups = chats.filter((chat) => chat.isGroup);

      return groups.map((group) => ({
        id: group.id._serialized,
        name: group.name,
      }));
    } catch (error) {
      this.logger.error('Failed to get groups:', error);
      throw new Error('Failed to retrieve groups');
    }
  }
}
