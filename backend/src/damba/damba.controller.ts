import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Put,
  Delete,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { DambaService } from './damba.service';
import { SaveDambaTokenDto } from './dto/save-damba-token.dto';
import { DambaAuthGuard } from './guards/damba-auth.guard';
import { ZoneService } from './zone.service';
import { CreateZoneDto, UpdateZoneDto } from './dto/create-zone.dto';

@Controller('damba')
export class DambaController {
  constructor(
    private readonly dambaService: DambaService,
    private readonly zoneService: ZoneService,
  ) {}

  @Get('screenshot')
  @UseGuards(DambaAuthGuard)
  async getScreenshot() {
    const screenshot = await this.dambaService.getScreenshot();
    if (!screenshot) {
      return {
        screenshot: null,
        isAuthenticated: this.dambaService.isAuthenticated,
      };
    }
    return { screenshot };
  }

  @Post('token')
  async saveToken(@Body() saveDambaTokenDto: SaveDambaTokenDto) {
    await this.dambaService.saveToken(saveDambaTokenDto.token);
    return { success: true, message: 'Damba token saved successfully' };
  }

  // Zone management endpoints
  @Get('zones')
  async getAllZones() {
    const zones = await this.zoneService.getAllZones();
    return { zones };
  }

  @Post('zones')
  async createZone(@Body() dto: CreateZoneDto) {
    const zone = await this.zoneService.createZone(dto);
    return { zone };
  }

  @Put('zones/:id')
  async updateZone(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateZoneDto,
  ) {
    const zone = await this.zoneService.updateZone(id, dto);
    return { zone };
  }

  @Delete('zones/:id')
  async deleteZone(@Param('id', ParseIntPipe) id: number) {
    await this.zoneService.deleteZone(id);
    return { success: true };
  }
}
