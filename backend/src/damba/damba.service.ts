import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Alerts,
  AlertsData,
  DambaSettings,
} from './interfaces/DambaSettings.interface';

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
  private browser: Browser | null = null;
  private page: Page | null = null;

  /**
   * Decodes JWT token and returns the payload
   * @param token - JWT token string
   * @returns Decoded payload with expiration or null if decoding fails
   */
  private decodeToken(token: string): { exp?: number } | null {
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
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

  /**
   * Check if user is authenticated to Damba
   * Updates authentication status before checking
   * @returns true if authenticated, false otherwise
   */
  async isUserAuthenticated(): Promise<boolean> {
    await this.checkTokenExpiration();
    return this.isAuthenticated;
  }

  async launchBrowser() {
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    this.page = await this.browser.newPage();
  }

  async authenticate() {
    if (!this.browser || !this.page) {
      throw new Error('Browser not initialized');
    }
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

    await this.page.setViewportSize({
      width: 1920,
      height: 1080,
    });
    await this.page.goto('https://damba.live/');
    await this.page.evaluate(
      ({ refreshToken, tokenExpires }) => {
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
      {
        refreshToken: token || '',
        tokenExpires: expiresAt?.toString() || '',
      },
    );
    // Wait for navigation to /map page to complete
    await this.page.waitForURL('**/map');

    const dambaSettings = await this.page.evaluate(() => {
      return JSON.stringify(window.localStorage);
    });
    await this.prisma.appConfig.upsert({
      where: { id: 1 },
      update: { dambaSettings },
      create: { id: 1, dambaSettings },
    });
  }

  async onModuleInit() {
    await this.launchBrowser();
    await this.authenticate();
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async onModuleDestroy() {
    await this.closeBrowser();
  }

  shouldAlert = async (): Promise<{
    hasAlert: boolean;
    alertZoneIds: string[];
  }> => {
    if (!this.page) {
      throw new Error('Page not initialized');
    }
    const result = await this.prisma.appConfig.findUnique({
      where: { id: 1 },
      select: { dambaSettings: true },
    });
    const { dambaFilteredAlertsLength, newDambaSettings, dambaFilteredAlerts } =
      await this.page.evaluate(() => {
        const pageAlerts = window.localStorage.getItem('alerts') as string;
        const dambaAlerts = (JSON.parse(pageAlerts) as Alerts).alerts;

        return {
          dambaFilteredAlertsLength: dambaAlerts.filter(
            (alert) => alert.alertZoneIds.length > 0,
          ).length,
          newDambaSettings: JSON.stringify(window.localStorage),
          dambaFilteredAlerts: dambaAlerts.filter(
            (alert) => alert.alertZoneIds.length > 0,
          ),
        };
      });

    if (!result?.dambaSettings) {
      return { hasAlert: false, alertZoneIds: [] };
    }
    const settings = JSON.parse(result.dambaSettings) as DambaSettings;

    if (!settings.alerts) {
      await this.prisma.appConfig.upsert({
        where: { id: 1 },
        update: { dambaSettings: newDambaSettings },
        create: { id: 1, dambaSettings: newDambaSettings },
      });
      return { hasAlert: false, alertZoneIds: [] };
    }
    // Parse the alerts JSON string
    const alertsData = JSON.parse(settings.alerts) as AlertsData;
    const settingsAlerts = alertsData.alerts;
    const settingsFilteredAlertsLength = settingsAlerts.filter(
      (alert) => alert.alertZoneIds.length > 0,
    ).length;

    await this.prisma.appConfig.upsert({
      where: { id: 1 },
      update: { dambaSettings: newDambaSettings },
      create: { id: 1, dambaSettings: newDambaSettings },
    });

    const hasAlert =
      dambaFilteredAlertsLength > 0 &&
      settingsFilteredAlertsLength > 0 &&
      dambaFilteredAlertsLength !== settingsFilteredAlertsLength;

    const lastAlert = dambaFilteredAlerts[dambaFilteredAlerts.length - 1];

    // Extract zone IDs from the last alert only
    const alertZoneIds =
      hasAlert && dambaFilteredAlerts.length > 0 ? lastAlert.alertZoneIds : [];

    return { hasAlert, alertZoneIds };
  };

  async takeScreenshot(): Promise<string> {
    if (!this.browser || !this.page) {
      throw new Error('Browser not initialized');
    }

    try {
      // Wait for page to be fully loaded using Playwright's better waiting
      await this.page.waitForLoadState('domcontentloaded');

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
    filepath: string;
    url: string;
    createdAt: string;
    isAuthenticated: boolean;
  } | null> {
    // Check token expiration before taking screenshot
    await this.checkTokenExpiration();

    if (!this.isAuthenticated) {
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
        filepath,
        url,
        createdAt: stats.mtime.toISOString(),
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
      await this.closeBrowser();
      await this.launchBrowser();
      await this.authenticate();
      this.logger.log('Damba token saved in app config');
    } catch (error) {
      this.logger.error(
        `Error saving Damba token: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
}
