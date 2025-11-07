import { Module } from '@nestjs/common';
import { DambaService } from './damba.service';
import { DambaController } from './damba.controller';

@Module({
  controllers: [DambaController],
  providers: [DambaService],
  exports: [DambaService],
})
export class DambaModule {}
