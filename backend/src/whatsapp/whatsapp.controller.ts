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
import { SendMessageDto } from './dto/send-message.dto';

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

  @Post('logout')
  async logout() {
    await this.whatsappService.logout();
    return { success: true, message: 'Logged out successfully' };
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

  @Post('send-message')
  async sendMessage(@Body() dto: SendMessageDto) {
    const results: { groupId: string; success: boolean; error?: string }[] = [];
    for (const groupId of dto.groupIds) {
      try {
        await this.whatsappService.sendMessageToGroup(
          groupId,
          dto.message,
          true, // Always include screenshot
        );
        results.push({ groupId, success: true });
      } catch (error) {
        results.push({
          groupId,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return { results };
  }
}
