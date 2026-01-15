import { IsString, IsOptional, IsDateString, IsArray } from 'class-validator';

export class CreateRegionalEventDto {
    @IsString()
    title: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsDateString()
    startDate: string;

    @IsDateString()
    @IsOptional()
    endDate?: string;

    @IsString()
    @IsOptional()
    region?: string;

    @IsString()
    @IsOptional()
    district?: string;

    @IsString()
    @IsOptional()
    association?: string;

    @IsString()
    @IsOptional()
    union?: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    clubIds?: string[];
}
