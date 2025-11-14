import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from './whatsapp.service';
import { DambaService } from '../damba/damba.service';

@Injectable()
export class ScreenshotSchedulerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ScreenshotSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsappService,
    private readonly dambaService: DambaService,
    private readonly schedulerRegistry: SchedulerRegistry,
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
      this.logger.error(`Error loading jobs: ${this.getErrorMessage(error)}`);
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

      // Create cron expression: every N minutes
      // Format: */N * * * * means "every N minutes"
      const cronExpression = `*/${setting.intervalMinutes} * * * *`;

      const jobName = `screenshot-${groupId}`;

      // Create cron job for recurring executions
      // Pass cronTime as first parameter (string), then callback, then config object
      const cronJob = new CronJob(
        cronExpression, // cronTime as string
        () => {
          this.sendScreenshotToGroup(groupId).catch((error) => {
            this.logger.error(
              `Error in scheduled job for group ${groupId}: ${this.getErrorMessage(error)}`,
            );
          });
        },
        null, // onComplete callback
        false, // start - Don't start immediately
        undefined, // timezone - use system default
      );

      // Register the cron job
      // Type mismatch between cron library and @nestjs/schedule expected types
      // @ts-expect-error - CronJob from 'cron' is compatible but has different type signature
      this.schedulerRegistry.addCronJob(jobName, cronJob);
      cronJob.start();
    } catch (error) {
      this.logger.error(
        `Error starting job for group ${groupId}: ${this.getErrorMessage(error)}`,
      );
    }
  }

  /**
   * Stop a job for a specific group
   */
  stopJob(groupId: string) {
    const jobName = `screenshot-${groupId}`;
    this.removeJobFromRegistry(jobName);
    this.logger.log(`Stopped screenshot job for group ${groupId}`);
  }

  /**
   * Remove a cron job from the registry if it exists
   * This is a helper method to avoid code duplication
   */
  private removeJobFromRegistry(jobName: string): void {
    if (this.schedulerRegistry.doesExist('cron', jobName)) {
      const cronJob = this.schedulerRegistry.getCronJob(jobName);
      void cronJob.stop();
      this.schedulerRegistry.deleteCronJob(jobName);
    }
  }

  /**
   * Helper method to extract error message from unknown error type
   * This avoids code duplication for error handling
   */
  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  /**
   * Stop all jobs
   */
  stopAllJobs() {
    const cronJobs = this.schedulerRegistry.getCronJobs();
    cronJobs.forEach((job, jobName) => {
      // Extract groupId from job name: "screenshot-{groupId}"
      if (jobName.startsWith('screenshot-')) {
        const groupId = jobName.replace('screenshot-', '');
        this.stopJob(groupId);
      }
    });
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

      // Check if user is authenticated to Damba before getting screenshot
      const isAuthenticated = await this.dambaService.isUserAuthenticated();
      if (!isAuthenticated) {
        return;
      }

      // Get screenshot
      const screenshot = await this.dambaService.getScreenshot();
      if (!screenshot) {
        this.logger.warn('Failed to get screenshot');
        return;
      }

      await this.whatsappService.sendScreenshotToGroup(
        groupId,
        screenshot.filepath,
        screenshot.filename,
      );
    } catch (error) {
      this.logger.error(
        `Error sending screenshot to group ${groupId}: ${this.getErrorMessage(error)}`,
      );
    }
  }
}
