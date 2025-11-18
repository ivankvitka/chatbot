import { IsString, IsNotEmpty } from 'class-validator';

export class CreateZoneDto {
  @IsString()
  @IsNotEmpty()
  zoneId: string;

  @IsString()
  @IsNotEmpty()
  name: string;
}

export class UpdateZoneDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
