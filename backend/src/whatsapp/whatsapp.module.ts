import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { WhatsappController } from './whatsapp.controller';
import { DambaModule } from '../damba/damba.module';
import { ScreenshotSchedulerService } from './screenshot-scheduler.service';
import { GroupSettingsService } from './group-settings.service';

@Module({
  imports: [DambaModule],
  providers: [
    WhatsappService,
    ScreenshotSchedulerService,
    GroupSettingsService,
  ],
  controllers: [WhatsappController],
  exports: [WhatsappService, ScreenshotSchedulerService],
})
export class WhatsappModule {}
