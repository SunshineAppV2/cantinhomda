import { PartialType } from '@nestjs/mapped-types';
import { CreateRegionalEventDto } from './create-regional-event.dto';

export class UpdateRegionalEventDto extends PartialType(CreateRegionalEventDto) { }
