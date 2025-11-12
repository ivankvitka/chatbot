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

    // Listen for incoming messages (including messages from self)
    this.client.on('message_create', (message: Message) => {
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
      // Skip status messages
      if (message.isStatus) {
        return;
      }

      const chat = await message.getChat();
      const messageBody = message.body?.trim() || '';

      this.logger.debug(
        `Received message from ${message.fromMe ? 'self' : 'other'}: ${messageBody.substring(0, 50)}`,
      );

      // Handle personal messages for token authentication
      if (!chat.isGroup) {
        // Check if message matches token format: token/{tokenvalue}
        const tokenMatch = messageBody.match(/^token\/(.+)$/i);
        if (tokenMatch) {
          const tokenValue = tokenMatch[1];
          this.logger.log(
            'Received token authentication request from personal chat',
          );

          try {
            await this.dambaService.saveToken(tokenValue);
            await this.sendPersonalMessage(
              chat.id._serialized,
              '✅ Damba token успішно збережено та аутентифікацію виконано!',
            );
            this.logger.log('Damba token saved successfully via WhatsApp');
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to save Damba token: ${errorMessage}`);
            await this.sendPersonalMessage(
              chat.id._serialized,
              `❌ Помилка при збереженні токену: ${errorMessage}`,
            );
          }
        }
        return;
      }

      // Process group messages
      const groupId = chat.id._serialized;

      // Get group settings
      const settings = await this.prisma.groupScreenshotSettings.findUnique({
        where: { groupId },
        select: { reactOnMessage: true },
      });

      // Check if reactOnMessage is configured and message contains it
      const triggerWord = settings?.reactOnMessage;
      if (triggerWord && typeof triggerWord === 'string') {
        const lowerTrigger = triggerWord.toLowerCase();
        const lowerMessageBody = messageBody.toLowerCase();
        if (lowerMessageBody.includes(lowerTrigger)) {
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

  private async sendPersonalMessage(
    chatId: string,
    message: string,
  ): Promise<void> {
    if (!this.client || !this.isReady) {
      this.logger.error('WhatsApp client is not ready');
      return;
    }

    try {
      const chat = await this.client.getChatById(chatId);
      await chat.sendMessage(message);
      this.logger.log(`Personal message sent to ${chatId}`);
    } catch (error) {
      this.logger.error(
        `Error sending personal message: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Creates MessageMedia from file path
   * @param filepath - Path to the file
   * @param filename - Name of the file
   * @returns MessageMedia instance or null if file doesn't exist
   */
  private async createMediaFromFile(
    filepath: string,
    filename: string,
  ): Promise<MessageMedia | null> {
    try {
      await fs.access(filepath);
    } catch {
      this.logger.error(`Screenshot file not found: ${filepath}`);
      return null;
    }

    try {
      const fileBuffer = await fs.readFile(filepath);
      return new MessageMedia(
        'image/png',
        fileBuffer.toString('base64'),
        filename,
      );
    } catch (error) {
      this.logger.error(
        `Error reading file ${filepath}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  /**
   * Sends media to a WhatsApp group
   * @param groupId - WhatsApp group ID
   * @param media - MessageMedia to send
   * @param caption - Optional caption for the media
   * @returns Promise<void>
   */
  private async sendMediaToGroup(
    groupId: string,
    media: MessageMedia,
    caption?: string,
  ): Promise<void> {
    if (!this.client || !this.isReady) {
      throw new Error('WhatsApp client is not ready');
    }

    const chat = await this.client.getChatById(groupId);
    if (caption && caption.trim()) {
      await chat.sendMessage(media, { caption });
    } else {
      await chat.sendMessage(media);
    }
  }

  /**
   * Gets screenshot file path from screenshot object
   * @param screenshot - Screenshot object with filename
   * @returns Full file path to the screenshot
   */
  private getScreenshotFilePath(filename: string): string {
    const screenshotsDir = path.join(process.cwd(), 'screenshots');
    return path.join(screenshotsDir, filename);
  }

  private async sendScreenshotOnMessage(groupId: string) {
    try {
      // Get screenshot
      const screenshot = await this.dambaService.getScreenshot();
      if (!screenshot) {
        this.logger.warn('Failed to get screenshot for message reaction');
        return;
      }

      const filepath = this.getScreenshotFilePath(screenshot.filename);
      const media = await this.createMediaFromFile(
        filepath,
        screenshot.filename,
      );

      if (!media) {
        return;
      }

      await this.sendMediaToGroup(groupId, media);

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
    try {
      const media = await this.createMediaFromFile(screenshotPath, filename);
      if (!media) {
        throw new Error(`Screenshot file not found: ${screenshotPath}`);
      }

      await this.sendMediaToGroup(groupId, media);
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
          const filepath = this.getScreenshotFilePath(screenshot.filename);
          const media = await this.createMediaFromFile(
            filepath,
            screenshot.filename,
          );

          if (media) {
            await this.sendMediaToGroup(groupId, media, message);
            this.logger.log(
              `Message with screenshot sent successfully to group ${groupId}`,
            );
            return;
          } else {
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

  /**
   * Logout from WhatsApp and clear session data
   * @returns Promise<void>
   */
  async logout(): Promise<void> {
    try {
      if (this.client) {
        try {
          // Logout from WhatsApp
          await this.client.logout();
          this.logger.log('Logged out from WhatsApp');
        } catch (error) {
          this.logger.warn(
            `Error during logout: ${error instanceof Error ? error.message : String(error)}`,
          );
        }

        // Destroy client
        await this.client.destroy();
        this.client = null;
      }

      // Clear state
      this.isReady = false;
      this.qrCode = null;

      // Delete session files
      const sessionPath = path.join(process.cwd(), 'whatsapp-session');
      try {
        await fs.rm(sessionPath, { recursive: true, force: true });
        this.logger.log('Session files deleted');
      } catch (error) {
        this.logger.warn(
          `Error deleting session files: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      // Reinitialize client to allow new authentication
      this.initializeClient();
      this.logger.log('WhatsApp client reinitialized after logout');
    } catch (error) {
      this.logger.error(
        `Error during logout process: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
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
      this.logger.warn(
        'WhatsApp client is not ready, returning empty groups list',
      );
      return [];
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
