import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { DambaModule } from './damba/damba.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    WhatsappModule,
    PrismaModule,
    AuthModule,
    DambaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
