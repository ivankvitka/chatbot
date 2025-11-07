import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import * as fs from 'fs';
import { DambaService } from '../damba/damba.service';

@Injectable()
export class WhatsappService implements OnModuleInit {
  private readonly logger = new Logger(WhatsappService.name);
  private client: Client;
  private isReady = false;

  constructor(private readonly dambaService: DambaService) {
    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'chatbot-client',
      }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    });

    this.setupEventHandlers();
  }

  async onModuleInit() {
    await this.initializeClient();
  }

  private setupEventHandlers() {
    this.client.on('qr', (qr) => {
      this.logger.log('QR Code received, scan it with WhatsApp');
      // In a real application, you'd return this QR code to the frontend
      // For now, we'll just log it
    });

    this.client.on('ready', () => {
      this.logger.log('WhatsApp client is ready!');
      this.isReady = true;
    });

    this.client.on('authenticated', () => {
      this.logger.log('WhatsApp authenticated!');
    });

    this.client.on('auth_failure', (msg) => {
      this.logger.error('WhatsApp authentication failed:', msg);
    });

    this.client.on('disconnected', (reason) => {
      this.logger.warn('WhatsApp disconnected:', reason);
      this.isReady = false;
    });
  }

  private async initializeClient() {
    try {
      await this.client.initialize();
    } catch (error) {
      this.logger.error('Failed to initialize WhatsApp client:', error);
    }
  }

  async getQRCode(): Promise<string | null> {
    return new Promise((resolve) => {
      if (this.isReady) {
        resolve(null); // Already authenticated
        return;
      }

      const timeout = setTimeout(() => {
        resolve(null); // Timeout after 30 seconds
      }, 30000);

      this.client.once('qr', (qr) => {
        clearTimeout(timeout);
        resolve(qr);
      });
    });
  }

  async getStatus(): Promise<{
    isReady: boolean;
    info?: any;
  }> {
    const info = this.isReady ? await this.client.info : null;
    return {
      isReady: this.isReady,
      info,
    };
  }

  async sendScreenshotToGroup(
    groupId: string,
    screenshotPath?: string,
    message?: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.isReady) {
        throw new Error('WhatsApp client is not ready');
      }

      // Take screenshot if path not provided
      let filepath = screenshotPath;
      if (!filepath) {
        filepath = await this.dambaService.takeScreenshot();
      }

      if (!filepath || !fs.existsSync(filepath)) {
        throw new Error('Screenshot file not found');
      }

      // Create media from screenshot
      const media = MessageMedia.fromFilePath(filepath);

      // Send message with media
      const chat = await this.client.getChatById(groupId);
      const sentMessage = await chat.sendMessage(media, {
        caption: message || 'Screenshot from damba.live',
      });

      this.logger.log(`Screenshot sent to group ${groupId}`);
      return {
        success: true,
        messageId: sentMessage.id.id,
      };
    } catch (error) {
      this.logger.error(`Error sending screenshot to group: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getGroups(): Promise<
    Array<{ id: string; name: string; isGroup: boolean }>
  > {
    try {
      if (!this.isReady) {
        throw new Error('WhatsApp client is not ready');
      }

      const chats = await this.client.getChats();
      return chats
        .filter((chat) => chat.isGroup)
        .map((chat) => ({
          id: chat.id._serialized,
          name: chat.name,
          isGroup: chat.isGroup,
        }));
    } catch (error) {
      this.logger.error(`Error getting groups: ${error.message}`);
      throw error;
    }
  }

  async sendTextMessage(
    chatId: string,
    message: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.isReady) {
        throw new Error('WhatsApp client is not ready');
      }

      const chat = await this.client.getChatById(chatId);
      const sentMessage = await chat.sendMessage(message);

      this.logger.log(`Text message sent to ${chatId}`);
      return {
        success: true,
        messageId: sentMessage.id.id,
      };
    } catch (error) {
      this.logger.error(`Error sending text message: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
