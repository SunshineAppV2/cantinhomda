import { IsArray, IsDateString, IsNotEmpty } from 'class-validator';

export class BulkUpdateBillingDateDto {
    @IsArray()
    @IsNotEmpty()
    clubIds: string[];

    @IsDateString()
    @IsNotEmpty()
    nextBillingDate: string;
}
