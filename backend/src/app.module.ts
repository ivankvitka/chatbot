import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { DambaModule } from './damba/damba.module';

@Module({
  imports: [PrismaModule, AuthModule, WhatsappModule, DambaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
