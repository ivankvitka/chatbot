import { IsString, IsArray, IsOptional, IsNotEmpty } from 'class-validator';

export class SendMessageDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  groupIds: string[];

  @IsString()
  @IsOptional()
  message?: string;
}
