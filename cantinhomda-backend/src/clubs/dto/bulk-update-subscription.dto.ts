import { IsArray, IsDateString, IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';

export class BulkUpdateBillingDateDto {
    @IsArray()
    @IsNotEmpty()
    clubIds: string[];

    @IsDateString()
    @IsNotEmpty()
    nextBillingDate: string;

    @IsNotEmpty()
    gracePeriodDays: number;

    @IsOptional()
    @IsString()
    subscriptionPlan?: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';

    @IsOptional()
    @IsNumber()
    memberLimit?: number;

    @IsOptional()
    @IsString()
    status?: 'ACTIVE' | 'TRIAL' | 'SUSPENDED';
}
