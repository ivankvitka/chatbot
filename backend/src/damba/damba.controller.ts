import { Controller, Get, Query } from '@nestjs/common';
import { DambaService } from './damba.service';

@Controller('damba')
export class DambaController {
  constructor(private readonly dambaService: DambaService) {}

  @Get('screenshot/take')
  async getScreenshot() {
    return this.dambaService.takeScreenshot();
  }

  @Get('screenshot/download')
  async downloadScreenshot(@Query('filepath') filepath: string) {
    return this.dambaService.getScreenshotBuffer(filepath);
  }
}
