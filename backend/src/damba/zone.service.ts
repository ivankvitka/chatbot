import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateZoneDto, UpdateZoneDto } from './dto/create-zone.dto';

@Injectable()
export class ZoneService {
  private readonly logger = new Logger(ZoneService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getAllZones() {
    return await this.prisma.zone.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async getZoneById(id: number) {
    const zone = await this.prisma.zone.findUnique({
      where: { id },
    });

    if (!zone) {
      throw new NotFoundException(`Zone with ID ${id} not found`);
    }

    return zone;
  }

  async getZoneByZoneId(zoneId: string) {
    return await this.prisma.zone.findUnique({
      where: { zoneId },
    });
  }

  async createZone(dto: CreateZoneDto) {
    // Check if zone with this zoneId already exists
    const existing = await this.getZoneByZoneId(dto.zoneId);
    if (existing) {
      throw new Error(`Zone with ID ${dto.zoneId} already exists`);
    }

    return await this.prisma.zone.create({
      data: {
        zoneId: dto.zoneId,
        name: dto.name,
      },
    });
  }

  async updateZone(id: number, dto: UpdateZoneDto) {
    await this.getZoneById(id); // Check if exists

    return await this.prisma.zone.update({
      where: { id },
      data: { name: dto.name },
    });
  }

  async deleteZone(id: number) {
    await this.getZoneById(id); // Check if exists

    await this.prisma.zone.delete({
      where: { id },
    });

    return { success: true };
  }
}
