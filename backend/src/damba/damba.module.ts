import { Module } from '@nestjs/common';
import { DambaService } from './damba.service';
import { DambaController } from './damba.controller';
import { DambaAuthGuard } from './guards/damba-auth.guard';

@Module({
  controllers: [DambaController],
  providers: [DambaService, DambaAuthGuard],
  exports: [DambaService, DambaAuthGuard],
})
export class DambaModule {}
