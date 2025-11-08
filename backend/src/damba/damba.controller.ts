import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { DambaService } from './damba.service';
import { SaveDambaTokenDto } from './dto/save-damba-token.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../../generated/prisma';

@Controller('damba')
export class DambaController {
  constructor(private readonly dambaService: DambaService) {}

  @Get('screenshot')
  getScreenshotLink() {
    return this.dambaService.getScreenshotLink();
  }

  @UseGuards(JwtAuthGuard)
  @Post('token')
  async saveToken(
    @Request() req: Request & { user: User },
    @Body() saveDambaTokenDto: SaveDambaTokenDto,
  ) {
    const userId = req.user.id;
    await this.dambaService.saveToken(userId, saveDambaTokenDto.token);
    return { success: true, message: 'Damba token saved successfully' };
  }
}
