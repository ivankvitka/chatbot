import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  Ip,
  Headers,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { User } from '../../generated/prisma';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Headers('user-agent') userAgent?: string,
    @Ip() ipAddress?: string,
  ) {
    return this.authService.login(loginDto, userAgent, ipAddress);
  }

  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Headers('user-agent') userAgent?: string,
    @Ip() ipAddress?: string,
  ) {
    return this.authService.register(registerDto, userAgent, ipAddress);
  }

  @Post('refresh')
  async refresh(@Body() refreshDto: RefreshDto) {
    return await this.authService.refresh(refreshDto.refresh_token);
  }

  @Post('logout')
  async logout(@Body() refreshDto: RefreshDto) {
    await this.authService.logout(refreshDto.refresh_token);
    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  async logoutAll(@Request() req: Request & { user: User }) {
    await this.authService.logoutAll(req.user.id);
    return { message: 'Logged out from all devices' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  async getSessions(@Request() req: Request & { user: User }) {
    return await this.authService.getUserSessions(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req: Request & { user: User }) {
    console.log(req.user);
    return this.authService.getProfile(req.user.id);
  }
}
