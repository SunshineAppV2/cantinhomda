import { IsString } from 'class-validator';

export class CreateUnitDto {
    @IsString()
    name: string;

    @IsString()
    clubId: string;

    @IsString()
    type?: 'MASCULINA' | 'FEMININA' | 'MISTA';

    members?: string[];
}
