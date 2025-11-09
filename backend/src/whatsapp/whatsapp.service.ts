import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { Client, LocalAuth, MessageMedia, Message } from 'whatsapp-web.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { DambaService } from '../damba/damba.service';

@Injectable()
export class WhatsappService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsappService.name);
  private client: Client | null = null;
  private qrCode: string | null = null;
  private isReady: boolean = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly dambaService: DambaService,
  ) {}

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

    // Listen for incoming messages
    this.client.on('message', (message: Message) => {
      this.handleIncomingMessage(message).catch((error) => {
        this.logger.error(
          `Error in message handler: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
    });

    this.client.initialize().catch((error) => {
      this.logger.error('Failed to initialize WhatsApp client:', error);
    });
  }

  private async handleIncomingMessage(message: Message) {
    try {
      // Only process messages from groups
      const chat = await message.getChat();
      if (!chat.isGroup) {
        return;
      }

      const groupId = chat.id._serialized;
      const messageBody = message.body?.toLowerCase() || '';

      console.log('messageBody', messageBody);

      // Get group settings
      const settings = await this.prisma.groupScreenshotSettings.findUnique({
        where: { groupId },
        select: { reactOnMessage: true },
      });

      // Check if reactOnMessage is configured and message contains it
      const triggerWord = settings?.reactOnMessage;
      if (triggerWord && typeof triggerWord === 'string') {
        const lowerTrigger = triggerWord.toLowerCase();
        if (messageBody.includes(lowerTrigger)) {
          this.logger.log(
            `Reacting to message "${triggerWord}" in group ${groupId}`,
          );
          await this.sendScreenshotOnMessage(groupId);
        }
      }
    } catch (error) {
      this.logger.error(
        `Error handling incoming message: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async sendScreenshotOnMessage(groupId: string) {
    try {
      // Get screenshot
      const screenshot = await this.dambaService.getScreenshot();
      if (!screenshot) {
        this.logger.warn('Failed to get screenshot for message reaction');
        return;
      }

      // Get screenshot file path
      const screenshotsDir = path.join(process.cwd(), 'screenshots');
      const filename = screenshot.filename;
      const filepath = path.join(screenshotsDir, filename);

      // Check if file exists
      try {
        await fs.access(filepath);
      } catch {
        this.logger.error(`Screenshot file not found: ${filepath}`);
        return;
      }

      // Read file as buffer
      const fileBuffer = await fs.readFile(filepath);

      // Create MessageMedia from buffer
      const media = new MessageMedia(
        'image/png',
        fileBuffer.toString('base64'),
        filename,
      );

      // Send to WhatsApp group
      if (!this.client || !this.isReady) {
        this.logger.error('WhatsApp client is not ready');
        return;
      }

      const chat = await this.client.getChatById(groupId);
      await chat.sendMessage(media);

      this.logger.log(
        `Screenshot sent to group ${groupId} in reaction to message`,
      );
    } catch (error) {
      this.logger.error(
        `Error sending screenshot on message: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
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

  /**
   * Send message with optional screenshot to a group
   * @param groupId - WhatsApp group ID
   * @param message - Optional message text
   * @param includeScreenshot - Whether to include screenshot
   * @returns Promise<void>
   */
  async sendMessageToGroup(
    groupId: string,
    message?: string,
    includeScreenshot: boolean = true,
  ): Promise<void> {
    if (!this.client || !this.isReady) {
      throw new Error('WhatsApp client is not ready');
    }

    try {
      const chat = await this.client.getChatById(groupId);

      // If screenshot should be included, get it from Damba
      if (includeScreenshot) {
        const screenshot = await this.dambaService.getScreenshot();
        if (screenshot) {
          const screenshotsDir = path.join(process.cwd(), 'screenshots');
          const filepath = path.join(screenshotsDir, screenshot.filename);

          // Check if file exists
          try {
            await fs.access(filepath);
            const fileBuffer = await fs.readFile(filepath);

            // Create MessageMedia from buffer
            const media = new MessageMedia(
              'image/png',
              fileBuffer.toString('base64'),
              screenshot.filename,
            );

            // Send screenshot with optional caption
            if (message && message.trim()) {
              await chat.sendMessage(media, { caption: message });
            } else {
              await chat.sendMessage(media);
            }

            this.logger.log(
              `Message with screenshot sent successfully to group ${groupId}`,
            );
            return;
          } catch {
            this.logger.warn(
              `Screenshot file not found: ${filepath}, sending message only`,
            );
          }
        } else {
          this.logger.warn('Screenshot not available, sending message only');
        }
      }

      // Send message only if provided
      if (message && message.trim()) {
        await chat.sendMessage(message);
        this.logger.log(`Message sent successfully to group ${groupId}`);
      } else if (!includeScreenshot) {
        throw new Error('Message is required when screenshot is not included');
      }
    } catch (error) {
      this.logger.error(
        `Error sending message to group ${groupId}: ${error instanceof Error ? error.message : String(error)}`,
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

  async getGroups(): Promise<
    Array<{
      id: string;
      name: string;
      settings?: {
        enabled: boolean;
        intervalMinutes: number;
      } | null;
    }>
  > {
    if (!this.client || !this.isReady) {
      throw new Error('WhatsApp client is not ready');
    }

    try {
      const chats = await this.client.getChats();
      const groups = chats.filter((chat) => chat.isGroup);

      // Get all group settings from database
      const groupIds = groups.map((group) => group.id._serialized);
      const settingsMap = new Map<
        string,
        { enabled: boolean; intervalMinutes: number }
      >();

      if (groupIds.length > 0) {
        const settings = await this.prisma.groupScreenshotSettings.findMany({
          where: {
            groupId: {
              in: groupIds,
            },
          },
          select: {
            groupId: true,
            enabled: true,
            intervalMinutes: true,
          },
        });

        settings.forEach((setting) => {
          settingsMap.set(setting.groupId, {
            enabled: setting.enabled,
            intervalMinutes: setting.intervalMinutes,
          });
        });
      }

      return groups.map((group) => {
        const groupId = group.id._serialized;
        const settings = settingsMap.get(groupId);

        return {
          id: groupId,
          name: group.name,
          settings: settings || null,
        };
      });
    } catch (error) {
      this.logger.error('Failed to get groups:', error);
      throw new Error('Failed to retrieve groups');
    }
  }
}
