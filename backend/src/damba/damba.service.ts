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
  isAuthenticated: boolean = false;
  private expiresAt: number | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.API_URL = this.configService.getOrThrow<string>('API_URL');
  }
  private readonly logger = new Logger(DambaService.name);
  private browser: puppeteer.Browser | null = null;
  private page: puppeteer.Page | null = null;

  /**
   * Decodes JWT token and returns the payload
   * @param token - JWT token string
   * @returns Decoded payload with expiration or null if decoding fails
   */
  private decodeToken(token: string): { exp?: number } | null {
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        this.logger.warn('Invalid token format');
        return null;
      }

      // Decode payload (second part of JWT)
      const payload = JSON.parse(
        Buffer.from(tokenParts[1], 'base64url').toString('utf-8'),
      ) as { exp?: number };
      this.expiresAt = payload.exp || null;

      return payload;
    } catch (error) {
      this.logger.error(
        `Error decoding token: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  async getToken(): Promise<string | undefined> {
    // Get app config (singleton pattern - always id = 1)
    const config = await this.prisma.appConfig.findUnique({
      where: { id: 1 },
    });

    if (!config || !config.dambaToken) {
      this.isAuthenticated = false;
      this.logger.warn('No dambaToken found in app config');
      return;
    }

    return config.dambaToken;
  }

  async checkTokenExpiration(paramToken?: string): Promise<void> {
    try {
      const token = paramToken || (await this.getToken());

      // Decode JWT token to check expiration
      const payload = this.decodeToken(token || '');
      if (!payload) {
        this.isAuthenticated = false;
        return;
      }

      // Check if token has expiration
      if (payload.exp) {
        const expirationTime = payload.exp * 1000; // Convert to milliseconds
        const currentTime = Date.now();

        if (currentTime >= expirationTime) {
          this.isAuthenticated = false;
          this.logger.warn(
            `Damba token expired. Expired at: ${new Date(expirationTime).toISOString()}`,
          );
        } else {
          this.isAuthenticated = true;
          this.logger.log(
            `Damba token is valid. Expires at: ${new Date(expirationTime).toISOString()}`,
          );
        }
      } else {
        // If no expiration field, consider token as valid
        this.isAuthenticated = true;
        this.logger.log('Damba token found (no expiration field)');
      }
    } catch (error) {
      this.isAuthenticated = false;
      this.logger.error(
        `Error checking token expiration: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async onModuleInit() {
    // Check token expiration before initializing browser
    const token = await this.getToken();
    await this.checkTokenExpiration(token);

    // Get expiration time from token if available
    let expiresAt: number | null = null;
    if (token) {
      const payload = this.decodeToken(token);
      if (payload?.exp) {
        expiresAt = payload.exp;
      }
    }

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
    await this.page.evaluate(
      (refreshToken: string, tokenExpires: string) => {
        const sessionData = {
          ['refresh-token']: refreshToken,
          ['refresh-token-expires']: tokenExpires,
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
      },
      token || '',
      expiresAt?.toString() || '',
    );
    // Wait for navigation to /map page to complete
    await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
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
      // Wait for page to be fully loaded before taking screenshot
      // Check that page is on /map route and document is ready
      await this.page.waitForFunction(
        () =>
          window.location.pathname === '/map' &&
          document.readyState === 'complete',
        { timeout: 10000 },
      );

      // Wait for all images and resources to load
      await this.page
        .evaluate(() => {
          return Promise.all(
            Array.from(document.images)
              .filter((img) => !img.complete)
              .map(
                (img) =>
                  new Promise<void>((resolve) => {
                    img.onload = () => resolve();
                    img.onerror = () => resolve(); // Resolve even on error to not block
                    setTimeout(resolve, 5000); // Timeout after 5 seconds
                  }),
              ),
          );
        })
        .catch(() => {
          // Continue even if image loading check fails
          this.logger.warn('Image loading check failed, continuing anyway');
        });

      // Wait for network to be idle - check performance API for recent activity
      let networkIdle = false;
      let attempts = 0;
      const maxAttempts = 30; // 3 seconds total (30 * 100ms)

      while (!networkIdle && attempts < maxAttempts) {
        networkIdle = await this.page.evaluate(() => {
          // Check performance API for recent network activity
          const resources = performance.getEntriesByType(
            'resource',
          ) as PerformanceResourceTiming[];
          const now = Date.now();
          const recentResources = resources.filter((r) => {
            // responseEnd is relative to navigationStart, convert to absolute time
            const navigationStart = performance.timing.navigationStart;
            const responseEndTime = navigationStart + r.responseEnd;
            return now - responseEndTime < 500;
          });

          return recentResources.length === 0;
        });

        if (!networkIdle) {
          // Wait 100ms before next check
          await new Promise((resolve) => setTimeout(resolve, 100));
          attempts++;
        }
      }

      // Additional wait to ensure all content is rendered
      await new Promise((resolve) => setTimeout(resolve, 1500));

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

  async getScreenshot(): Promise<{
    filename: string;
    url: string;
    createdAt: string;
    isAuthenticated: boolean;
  } | null> {
    // Check token expiration before taking screenshot
    await this.checkTokenExpiration();

    if (!this.isAuthenticated) {
      this.logger.warn(
        'User is not authenticated to Damba, cannot take screenshot',
      );
      return null;
    }

    const screenshotFile = await this.takeScreenshot();
    if (!screenshotFile) {
      return null;
    }

    try {
      const screenshotsDir = path.join(process.cwd(), 'screenshots');
      try {
        await fs.access(screenshotsDir);
      } catch {
        return null;
      }

      const files = await fs.readdir(screenshotsDir);
      const screenshotFile = files.find(
        (file) => file.startsWith('screenshot-') && file.endsWith('.png'),
      );

      if (!screenshotFile) {
        return null;
      }

      const filepath = path.join(screenshotsDir, screenshotFile);
      const stats = await fs.stat(filepath);
      const url = `${this.API_URL}/screenshots/${screenshotFile}`;

      return {
        filename: screenshotFile,
        url,
        createdAt: stats.mtime.toISOString(), //Here should be seconds
        isAuthenticated: this.isAuthenticated,
      };
    } catch (error) {
      this.logger.error(
        `Error getting screenshot: ${error instanceof Error ? error.message : String(error)}`,
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

  async saveToken(token: string): Promise<void> {
    try {
      // Upsert app config (create if doesn't exist, update if exists)
      await this.prisma.appConfig.upsert({
        where: { id: 1 },
        update: { dambaToken: token },
        create: { id: 1, dambaToken: token },
      });
      this.logger.log('Damba token saved in app config');
    } catch (error) {
      this.logger.error(
        `Error saving Damba token: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
}
