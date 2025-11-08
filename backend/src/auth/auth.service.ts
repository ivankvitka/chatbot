import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { User } from './interfaces/user.interface';
import { Session } from '../../generated/prisma';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (
      user &&
      user.password &&
      (await bcrypt.compare(password, user.password))
    ) {
      const { password, ...result } = user;
      return result as User;
    }
    return null;
  }

  async login(
    loginDto: LoginDto,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<{ access_token: string; refresh_token: string; user: User }> {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { email: user.email, sub: user.id };
    const access_token = this.jwtService.sign(payload);
    const refresh_token = await this.generateRefreshToken(
      user.id,
      userAgent,
      ipAddress,
    );

    return {
      access_token,
      refresh_token,
      user,
    };
  }

  async register(
    registerDto: RegisterDto,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<{ access_token: string; refresh_token: string; user: User }> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new UnauthorizedException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        password: hashedPassword,
        name: registerDto.name,
      },
    });

    const { password, ...result } = user;

    const payload = { email: user.email, sub: user.id };
    const access_token = this.jwtService.sign(payload);
    const refresh_token = await this.generateRefreshToken(
      user.id,
      userAgent,
      ipAddress,
    );

    return {
      access_token,
      refresh_token,
      user: result as User,
    };
  }

  async getProfile(id: number): Promise<User> {
    const foundUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!foundUser) {
      throw new UnauthorizedException('User not found');
    }

    const { password, ...result } = foundUser;
    return result as User;
  }

  /**
   * Generates a refresh token for a user
   */
  private async generateRefreshToken(
    userId: number,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<string> {
    const refreshToken = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 днів

    await this.prisma.session.create({
      data: {
        refreshToken,
        userId,
        userAgent,
        ipAddress,
        expiresAt,
      },
    });

    return refreshToken;
  }

  /**
   * Updates the access token using the refresh token
   */
  async refresh(refreshToken: string): Promise<{
    access_token: string;
    refresh_token: string;
  }> {
    const session = await this.prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      // Видаляємо застарілу сесію
      if (session) {
        await this.prisma.session.delete({
          where: { id: session.id },
        });
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = session.user;
    const payload = { email: user.email, sub: user.id };
    const access_token = this.jwtService.sign(payload);

    // Генеруємо новий refresh token (rotation)
    const newRefreshToken = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Оновлюємо сесію
    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        refreshToken: newRefreshToken,
        expiresAt,
        updatedAt: new Date(),
      },
    });

    return {
      access_token,
      refresh_token: newRefreshToken,
    };
  }

  /**
   * Deletes the session (logout)
   */
  async logout(refreshToken: string): Promise<void> {
    await this.prisma.session.deleteMany({
      where: { refreshToken },
    });
  }

  /**
   * Deletes all sessions of the user
   */
  async logoutAll(userId: number): Promise<void> {
    await this.prisma.session.deleteMany({
      where: { userId },
    });
  }

  /**
   * Cleans up expired sessions (can be called through cron)
   */
  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.prisma.session.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
    return result.count;
  }

  /**
   * Gets all active sessions of the user
   */
  async getUserSessions(userId: number) {
    const sessions = await this.prisma.session.findMany({
      where: {
        userId,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    if (!sessions) {
      throw new UnauthorizedException('No active sessions found');
    }

    return sessions as Session[];
  }
}
