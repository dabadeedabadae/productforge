import { IsOptional, IsString } from 'class-validator';

export class SearchKbDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() tag?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() domain?: string;
}
