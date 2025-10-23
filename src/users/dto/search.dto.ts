import { IsOptional, IsString, IsNumber, IsArray, Min, Max } from 'class-validator';

export class SearchFiltersDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  metro?: string;

  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  keywords?: string; // Поиск по ключевым словам

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  minRating?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrdersCompleted?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceTypes?: string[]; // Типы услуг: ["cleaning", "window_cleaning"]

  @IsOptional()
  @IsString()
  availability?: string; // "immediate", "today", "this_week"
}

export class SearchResponseDto {
  users: any[];
  total: number;
  filters: SearchFiltersDto;
}
