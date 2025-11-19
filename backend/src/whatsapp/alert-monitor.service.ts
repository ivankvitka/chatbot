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
  private readonly CHECK_INTERVAL = 60000; // Check every 1 minute

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
        return;
      }
      // Get all groups with shouldAlert enabled
      const groups = await this.prisma.groupScreenshotSettings.findMany({
        where: {
          shouldAlert: true,
        },
      });

      if (groups.length === 0) {
        return;
      }

      // Check if shouldAlert returns true and get alertZoneIds
      const alertResult = await this.dambaService.shouldAlert();
      if (!alertResult.hasAlert) {
        return; // No alert changes detected
      }

      this.logger.log(
        `Alert changes detected with zone IDs: ${alertResult.alertZoneIds.join(', ')}, sending screenshots to matching groups`,
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

      // Send to groups with shouldAlert enabled and matching zoneIds
      for (const group of groups) {
        // If group has zoneIds configured, check if any of them match alertZoneIds
        const groupZoneIds = group.zoneIds || [];
        const shouldSendToGroup =
          groupZoneIds.length > 0 &&
          groupZoneIds.some((zoneId) =>
            alertResult.alertZoneIds.includes(zoneId),
          );

        if (!shouldSendToGroup) {
          this.logger.debug(
            `Skipping group ${group.groupName} (${group.groupId}) - no matching zone IDs`,
          );
          continue;
        }

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
