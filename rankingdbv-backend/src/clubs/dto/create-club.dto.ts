import { IsString, IsOptional } from 'class-validator';

export class CreateClubDto {
    @IsString()
    name: string;

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
    mission?: string;

    @IsString()
    @IsOptional()
    union?: string;

    @IsString()
    @IsOptional()
    phoneNumber?: string;

    @IsOptional()
    settings?: any;

    @IsOptional()
    participatesInRanking?: boolean;
}
