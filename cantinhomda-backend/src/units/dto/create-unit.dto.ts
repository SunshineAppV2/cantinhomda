import { IsArray, IsOptional, IsString, IsIn } from 'class-validator';

export class CreateUnitDto {
    @IsString()
    name: string;

    @IsString()
    clubId: string;

    @IsOptional()
    @IsString()
    @IsIn(['MASCULINA', 'FEMININA', 'MISTA'])
    type?: 'MASCULINA' | 'FEMININA' | 'MISTA';

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    members?: string[];
}
