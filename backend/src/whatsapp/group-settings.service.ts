import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScreenshotSchedulerService } from './screenshot-scheduler.service';
import { UpdateGroupSettingsDto } from './dto/update-group-settings.dto';

@Injectable()
export class GroupSettingsService {
  private readonly logger = new Logger(GroupSettingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly schedulerService: ScreenshotSchedulerService,
  ) {}

  async getGroupSettings(groupId: string) {
    const settings = await this.prisma.groupScreenshotSettings.findUnique({
      where: { groupId },
    });

    return settings;
  }

  async createOrUpdateGroupSettings(dto: UpdateGroupSettingsDto) {
    // Stop existing job if any
    this.schedulerService.stopJob(dto.groupId);

    const settings = await this.prisma.groupScreenshotSettings.upsert({
      where: { groupId: dto.groupId },
      update: {
        groupName: dto.groupName,
        intervalMinutes: dto.intervalMinutes,
        enabled: dto.enabled,
        reactOnMessage: dto.reactOnMessage || null,
      },
      create: {
        groupId: dto.groupId,
        groupName: dto.groupName,
        intervalMinutes: dto.intervalMinutes,
        enabled: dto.enabled,
        reactOnMessage: dto.reactOnMessage || null,
      },
    });

    // Start job if enabled
    if (settings.enabled) {
      await this.schedulerService.startJob(settings.groupId);
      this.logger.log(
        `Started screenshot job for group ${dto.groupId} with interval ${dto.intervalMinutes} minutes`,
      );
    } else {
      this.logger.log(`Screenshot job disabled for group ${dto.groupId}`);
    }

    return settings;
  }

  async updateGroupSettings(
    groupId: string,
    dto: Omit<UpdateGroupSettingsDto, 'groupId'>,
  ) {
    // Stop existing job
    this.schedulerService.stopJob(groupId);

    const settings = await this.prisma.groupScreenshotSettings.update({
      where: { groupId },
      data: {
        groupName: dto.groupName,
        intervalMinutes: dto.intervalMinutes,
        enabled: dto.enabled,
        reactOnMessage: dto.reactOnMessage || null,
      },
    });

    // Start job if enabled
    if (settings.enabled) {
      await this.schedulerService.startJob(settings.groupId);
      this.logger.log(
        `Updated and started screenshot job for group ${groupId} with interval ${dto.intervalMinutes} minutes`,
      );
    } else {
      this.logger.log(`Screenshot job disabled for group ${groupId}`);
    }

    return settings;
  }

  async deleteGroupSettings(groupId: string) {
    // Stop job
    this.schedulerService.stopJob(groupId);

    await this.prisma.groupScreenshotSettings.delete({
      where: { groupId },
    });

    this.logger.log(`Deleted settings and stopped job for group ${groupId}`);

    return { success: true };
  }
}
