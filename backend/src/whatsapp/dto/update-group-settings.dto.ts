import { IsString, IsInt, IsBoolean, IsIn, IsOptional } from 'class-validator';

export class UpdateGroupSettingsDto {
  @IsString()
  groupId: string;

  @IsString()
  groupName: string;

  @IsInt()
  @IsIn([1, 5, 10, 15, 30, 60])
  intervalMinutes: number;

  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  @IsString()
  reactOnMessage?: string;
}
