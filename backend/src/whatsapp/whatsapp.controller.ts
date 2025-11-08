import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Delete,
} from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { GroupSettingsService } from './group-settings.service';
import { UpdateGroupSettingsDto } from './dto/update-group-settings.dto';

@Controller('whatsapp')
export class WhatsappController {
  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly groupSettingsService: GroupSettingsService,
  ) {}

  @Get('qr')
  getQR() {
    const qr = this.whatsappService.getQRCode();
    return { qr };
  }

  @Get('status')
  getStatus() {
    return this.whatsappService.getStatus();
  }

  @Get('groups')
  async getGroups() {
    return this.whatsappService.getGroups();
  }

  @Post('groups/settings')
  async createGroupSettings(@Body() dto: UpdateGroupSettingsDto) {
    const settings =
      await this.groupSettingsService.createOrUpdateGroupSettings(dto);
    return { settings };
  }

  @Get('groups/:groupId/settings')
  async getGroupSettings(@Param('groupId') groupId: string) {
    const settings = await this.groupSettingsService.getGroupSettings(groupId);
    return { settings: settings || null };
  }

  @Put('groups/:groupId/settings')
  async updateGroupSettings(
    @Param('groupId') groupId: string,
    @Body() dto: Omit<UpdateGroupSettingsDto, 'groupId'>,
  ) {
    const settings = await this.groupSettingsService.updateGroupSettings(
      groupId,
      dto,
    );
    return { settings };
  }

  @Delete('groups/:groupId/settings')
  async deleteGroupSettings(@Param('groupId') groupId: string) {
    return await this.groupSettingsService.deleteGroupSettings(groupId);
  }
}
