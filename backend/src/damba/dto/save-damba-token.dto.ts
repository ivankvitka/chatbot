import { IsString, IsNotEmpty } from 'class-validator';

export class SaveDambaTokenDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}
