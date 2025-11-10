import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from './whatsapp.service';
import { DambaService } from '../damba/damba.service';
import * as path from 'path';

@Injectable()
export class AlertMonitorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AlertMonitorService.name);
  private interval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 5000; // Check every 60 seconds

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsappService,
    private readonly dambaService: DambaService,
  ) {}

  onModuleInit() {
    // Start periodic check
    this.startMonitoring();
  }

  onModuleDestroy() {
    this.stopMonitoring();
  }

  private startMonitoring() {
    this.logger.log('Starting alert monitoring service');

    // Run immediately on start
    this.checkAlerts().catch((error) => {
      this.logger.error(
        `Error in initial alert check: ${error instanceof Error ? error.message : String(error)}`,
      );
    });

    // Then run periodically
    this.interval = setInterval(() => {
      this.checkAlerts().catch((error) => {
        this.logger.error(
          `Error in periodic alert check: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
    }, this.CHECK_INTERVAL);
  }

  private stopMonitoring() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      this.logger.log('Stopped alert monitoring service');
    }
  }

  private async checkAlerts() {
    try {
      // Check if user is authenticated
      const isAuthenticated = await this.dambaService.isUserAuthenticated();
      if (!isAuthenticated) {
        this.logger.warn(
          'User is not authenticated to Damba, skipping alert check',
        );
        return;
      }
      // Get all groups with shouldAlert enabled
      const groups = await this.prisma.groupScreenshotSettings.findMany({
        where: {
          shouldAlert: true,
        },
      });

      if (groups.length === 0) {
        this.logger.log('No groups with shouldAlert enabled found');
        return;
      }

      // Check if shouldAlert returns true
      const shouldAlert = await this.dambaService.shouldAlert();
      if (!shouldAlert) {
        return; // No alert changes detected
      }

      this.logger.log(
        'Alert changes detected, sending screenshots to groups with shouldAlert enabled',
      );

      // Get screenshot using DambaService
      const screenshot = await this.dambaService.getScreenshot();
      if (!screenshot) {
        this.logger.warn('Failed to get screenshot for alert');
        return;
      }

      // Get screenshot file path
      const screenshotsDir = path.join(process.cwd(), 'screenshots');
      const filepath = path.join(screenshotsDir, screenshot.filename);

      // Send to all groups with shouldAlert enabled using WhatsappService
      for (const group of groups) {
        try {
          await this.whatsappService.sendScreenshotToGroup(
            group.groupId,
            filepath,
            screenshot.filename,
          );
          this.logger.log(
            `Alert screenshot sent successfully to group ${group.groupName} (${group.groupId})`,
          );
        } catch (error) {
          this.logger.error(
            `Error sending alert screenshot to group ${group.groupId}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error checking alerts: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
