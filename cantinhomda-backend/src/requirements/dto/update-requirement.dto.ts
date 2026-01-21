import { IsString, IsOptional, IsEnum, IsArray, IsInt, IsDateString } from 'class-validator';
import { RequirementType, DBVClass } from '@prisma/client';
import { Type } from 'class-transformer';
import { CreateQuestionDto } from './create-question.dto';
import { CreateRequirementAdaptationDto } from './create-requirement-adaptation.dto';

export class UpdateRequirementDto {
    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    code?: string;

    @IsOptional()
    @IsString()
    area?: string;

    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsInt()
    points?: number;

    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;

    @IsOptional()
    @IsString()
    clubId?: string;

    @IsOptional()
    @IsString()
    region?: string;

    @IsOptional()
    @IsString()
    district?: string;

    @IsOptional()
    @IsString()
    dbvClass?: DBVClass;

    @IsOptional()
    @IsString()
    specialtyId?: string;

    @IsOptional()
    @IsString()
    regionalEventId?: string;

    @IsEnum(RequirementType)
    @IsOptional()
    type?: RequirementType;

    @IsArray()
    @IsOptional()
    @Type(() => CreateQuestionDto)
    questions?: CreateQuestionDto[];

    @IsOptional()
    @IsEnum(['DISCOVERY', 'EXECUTION', 'LEADERSHIP'])
    methodology?: 'DISCOVERY' | 'EXECUTION' | 'LEADERSHIP';

    @IsOptional()
    @IsEnum(['JUNIOR', 'TEEN', 'SENIOR'])
    ageGroup?: 'JUNIOR' | 'TEEN' | 'SENIOR';

    @IsArray()
    @IsOptional()
    @Type(() => CreateRequirementAdaptationDto)
    adaptations?: CreateRequirementAdaptationDto[];
}
