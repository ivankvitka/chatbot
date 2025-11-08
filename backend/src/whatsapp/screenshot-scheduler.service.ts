import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from './whatsapp.service';
import { DambaService } from '../damba/damba.service';
import { MessageMedia } from 'whatsapp-web.js';
import * as fs from 'fs/promises';
import * as path from 'path';

interface ScheduledJob {
  timeout: NodeJS.Timeout | null;
  interval: NodeJS.Timeout | null;
  groupId: string;
  intervalMinutes: number;
}

@Injectable()
export class ScreenshotSchedulerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ScreenshotSchedulerService.name);
  private readonly jobs = new Map<string, ScheduledJob>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsappService,
    private readonly dambaService: DambaService,
  ) {}

  async onModuleInit() {
    // Load all enabled settings and start jobs
    await this.loadAndStartAllJobs();
  }

  onModuleDestroy() {
    // Stop all jobs on module destroy
    this.stopAllJobs();
  }

  /**
   * Load all enabled settings from database and start jobs
   */
  async loadAndStartAllJobs() {
    try {
      const settings = await this.prisma.groupScreenshotSettings.findMany({
        where: { enabled: true },
      });

      for (const setting of settings) {
        await this.startJob(setting.groupId);
      }

      this.logger.log(`Loaded and started ${settings.length} screenshot jobs`);
    } catch (error) {
      this.logger.error(
        `Error loading jobs: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Start a job for a specific group
   */
  async startJob(groupId: string) {
    try {
      // Stop existing job if any
      this.stopJob(groupId);

      const setting = await this.prisma.groupScreenshotSettings.findUnique({
        where: { groupId },
      });

      if (!setting || !setting.enabled) {
        this.logger.warn(`Settings not found or disabled for group ${groupId}`);
        return;
      }

      // Calculate next execution time to align with minute intervals
      // For example, if interval is 10 minutes, execute at :10, :20, :30, etc.
      const now = new Date();
      const currentMinutes = now.getMinutes();
      const intervalMinutes = setting.intervalMinutes;

      // Calculate minutes until next interval
      const minutesUntilNext =
        intervalMinutes - (currentMinutes % intervalMinutes);
      const nextExecution = new Date(now);
      nextExecution.setMinutes(now.getMinutes() + minutesUntilNext);
      nextExecution.setSeconds(0);
      nextExecution.setMilliseconds(0);

      const delayUntilNext = nextExecution.getTime() - now.getTime();

      // Schedule first execution
      const timeout = setTimeout(() => {
        // Send immediately
        this.sendScreenshotToGroup(groupId).catch((error) => {
          this.logger.error(
            `Error in scheduled job for group ${groupId}: ${error instanceof Error ? error.message : String(error)}`,
          );
        });

        // Then schedule recurring execution every intervalMinutes
        const interval = setInterval(
          () => {
            this.sendScreenshotToGroup(groupId).catch((error) => {
              this.logger.error(
                `Error in scheduled job for group ${groupId}: ${error instanceof Error ? error.message : String(error)}`,
              );
            });
          },
          intervalMinutes * 60 * 1000,
        );

        // Update job with interval
        const job = this.jobs.get(groupId);
        if (job) {
          job.timeout = null;
          job.interval = interval;
        }
      }, delayUntilNext);

      this.jobs.set(groupId, {
        timeout: timeout,
        interval: null,
        groupId: groupId,
        intervalMinutes: intervalMinutes,
      });

      this.logger.log(
        `Started screenshot job for group ${groupId} (${setting.groupName}) - interval: ${setting.intervalMinutes} minutes`,
      );
    } catch (error) {
      this.logger.error(
        `Error starting job for group ${groupId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Stop a job for a specific group
   */
  stopJob(groupId: string) {
    const job = this.jobs.get(groupId);

    if (job) {
      if (job.timeout) {
        clearTimeout(job.timeout);
      }
      if (job.interval) {
        clearInterval(job.interval);
      }
      this.jobs.delete(groupId);
      this.logger.log(`Stopped screenshot job for group ${groupId}`);
    }
  }

  /**
   * Stop all jobs
   */
  stopAllJobs() {
    for (const [groupId] of this.jobs) {
      this.stopJob(groupId);
    }
  }

  /**
   * Send screenshot to a WhatsApp group
   */
  private async sendScreenshotToGroup(groupId: string) {
    try {
      this.logger.log(`Sending screenshot to group ${groupId}`);

      const client = this.whatsappService.getClient();
      if (!client) {
        this.logger.error('WhatsApp client is not available');
        return;
      }

      // Check if group still exists and settings are still enabled
      const setting = await this.prisma.groupScreenshotSettings.findUnique({
        where: { groupId },
      });

      if (!setting || !setting.enabled) {
        this.logger.warn(
          `Settings disabled or not found for group ${groupId}, stopping job`,
        );
        this.stopJob(groupId);
        return;
      }

      // Get screenshot
      const screenshot = await this.dambaService.getScreenshot();
      if (!screenshot) {
        this.logger.warn('Failed to get screenshot');
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
      const chat = await client.getChatById(groupId);
      await chat.sendMessage(media);

      this.logger.log(
        `Screenshot sent successfully to group ${setting.groupName} (${groupId})`,
      );
    } catch (error) {
      this.logger.error(
        `Error sending screenshot to group ${groupId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
