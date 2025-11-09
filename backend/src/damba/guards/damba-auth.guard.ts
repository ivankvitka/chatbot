import {
  Injectable,
  CanActivate,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { DambaService } from '../damba.service';

@Injectable()
export class DambaAuthGuard implements CanActivate {
  private readonly logger = new Logger(DambaAuthGuard.name);

  constructor(private readonly dambaService: DambaService) {}

  async canActivate(): Promise<boolean> {
    // Check token expiration before checking authentication status
    await this.dambaService.checkTokenExpiration();

    if (!this.dambaService.isAuthenticated) {
      this.logger.warn('User is not authenticated to Damba');
      throw new UnauthorizedException(
        'User is not authenticated to Damba. Please authenticate first.',
      );
    }

    return true;
  }
}
