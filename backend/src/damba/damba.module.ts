import { Module } from '@nestjs/common';
import { DambaService } from './damba.service';
import { DambaController } from './damba.controller';
import { DambaAuthGuard } from './guards/damba-auth.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { ZoneService } from './zone.service';

@Module({
  imports: [PrismaModule],
  controllers: [DambaController],
  providers: [DambaService, DambaAuthGuard, ZoneService],
  exports: [DambaService, DambaAuthGuard, ZoneService],
})
export class DambaModule {}
