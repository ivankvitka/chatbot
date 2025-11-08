import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DambaService {
  private readonly API_URL: string | undefined;
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.API_URL = this.configService.getOrThrow<string>('API_URL');
  }
  private readonly logger = new Logger(DambaService.name);
  private browser: puppeteer.Browser | null = null;
  private page: puppeteer.Page | null = null;

  async onModuleInit() {
    // Initialize browser on module startup
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    this.page = await this.browser.newPage();

    await this.page.setViewport({
      width: 1920,
      height: 1080,
    });
    await this.page.goto('https://damba.live/', { waitUntil: 'networkidle2' });
    await this.page.evaluate(() => {
      const sessionData = {
        ['refresh-token']:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoicmVmcmVzaCIsInN1YiI6eyJpZCI6IjUxNWNkNGU0LTY3NTUtNDI4Yi1iYzhhLTE0Yzg5YWVkYjUwZCIsInR3b0ZBIjp0cnVlfSwiaWF0IjoxNzYyNTExMDE2LCJleHAiOjE3NjI1OTc0MTZ9.t9SGIwxdOtFn2ReOI9WGnt-7GQrprRKxM3K5-jwAQ68',
        ['refresh-token-expires']: '1762597416',
      };
      Object.entries(sessionData).forEach(([key, value]) => {
        window.sessionStorage.setItem(key, value);
      });
      const settings = JSON.parse(
        window.localStorage.getItem('localUserSettings') || '{}',
      ) as Record<string, unknown>;
      const newSettings = {
        ...settings,
        eRocketTargetsEnabled: true,
        sensitiveInformationMode: false,
        alertAreasMode: false,
        radarsTargetsEnabled: true,
      };
      window.localStorage.setItem(
        'localUserSettings',
        JSON.stringify(newSettings),
      );
      window.localStorage.setItem(
        '515cd4e4-6755-428b-bc8a-14c89aedb50d-map-center-coord',
        '[50.91410065304415,34.39479231834412]',
      );
      document.location.pathname = '/map';
    });
  }

  async onModuleDestroy() {
    // Close browser on module destroy
    if (this.browser) {
      await this.browser.close();
    }
  }

  async takeScreenshot(): Promise<string> {
    if (!this.browser || !this.page) {
      throw new Error('Browser not initialized');
    }

    try {
      // Delete old screenshots before taking new one
      await this.deleteOldScreenshots();

      const screenshotsDir = path.join(process.cwd(), 'screenshots');
      try {
        await fs.access(screenshotsDir);
      } catch {
        await fs.mkdir(screenshotsDir, { recursive: true });
      }

      // Generate unique filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `screenshot-${timestamp}.png`;
      const filepath = path.join(screenshotsDir, filename);

      // Take screenshot
      await this.page.screenshot({
        path: filepath,
        fullPage: true,
      });

      this.logger.log(`Screenshot saved to ${filepath}`);
      return filepath;
    } catch (error) {
      this.logger.error(
        `Error taking screenshot: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  getScreenshotLink(): string {
    return `${this.API_URL}/screenshots/screenshot-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
  }

  async getLastScreenshot(): Promise<{
    filename: string;
    url: string;
    createdAt: string;
  } | null> {
    try {
      const screenshotsDir = path.join(process.cwd(), 'screenshots');
      try {
        await fs.access(screenshotsDir);
      } catch {
        return null;
      }

      const files = await fs.readdir(screenshotsDir);
      const screenshotFiles = files
        .filter(
          (file) => file.startsWith('screenshot-') && file.endsWith('.png'),
        )
        .sort()
        .reverse();

      if (screenshotFiles.length === 0) {
        return null;
      }

      const lastScreenshot = screenshotFiles[0];
      const filepath = path.join(screenshotsDir, lastScreenshot);
      const stats = await fs.stat(filepath);
      const url = `${this.API_URL}/screenshots/${lastScreenshot}`;

      return {
        filename: lastScreenshot,
        url,
        createdAt: stats.mtime.toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `Error getting last screenshot: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  async deleteOldScreenshots(): Promise<void> {
    try {
      const screenshotsDir = path.join(process.cwd(), 'screenshots');
      const files = await fs.readdir(screenshotsDir);

      if (files.length === 0) {
        this.logger.log('No screenshots to delete');
        return;
      }

      for (const file of files) {
        if (file.startsWith('screenshot-') && file.endsWith('.png')) {
          const filepath = path.join(screenshotsDir, file);
          await fs.unlink(filepath);
          this.logger.log(`Screenshot deleted: ${filepath}`);
        }
      }
    } catch (error) {
      this.logger.error(
        `Error deleting screenshots: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async saveToken(userId: number, token: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { dambaToken: token },
      });
      this.logger.log(`Damba token saved for user ${userId}`);
    } catch (error) {
      this.logger.error(
        `Error saving Damba token: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
}
