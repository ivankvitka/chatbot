import { Controller, Get, Post, Body } from '@nestjs/common';
import { DambaService } from './damba.service';
import { SaveDambaTokenDto } from './dto/save-damba-token.dto';

@Controller('damba')
export class DambaController {
  constructor(private readonly dambaService: DambaService) {}

  @Get('screenshot')
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
}
