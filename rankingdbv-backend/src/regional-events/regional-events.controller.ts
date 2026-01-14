import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { RegionalEventsService } from './regional-events.service';
import { CreateRegionalEventDto } from './dto/create-regional-event.dto';
import { UpdateRegionalEventDto } from './dto/update-regional-event.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('regional-events')
export class RegionalEventsController {
    constructor(private readonly regionalEventsService: RegionalEventsService) { }

    @UseGuards(JwtAuthGuard)
    @Post()
    create(@Body() createDto: CreateRegionalEventDto, @Request() req) {
        const user = req.user;

        console.log(`[RegionalEvents] Create Event Request by: ${user.email}, Role: ${user.role}, Region: ${user.region}, District: ${user.district}`);

        // Auto-fill hierarchy based on Creator Role
        if (user.role === 'COORDINATOR_REGIONAL') {
            createDto.region = user.region;
        } else if (user.role === 'COORDINATOR_DISTRICT') {
            createDto.district = user.district;
            createDto.region = user.region;
        } else if (user.role === 'COORDINATOR_AREA') {
            createDto.association = user.association;
        } else if (user.role === 'DIRECTOR') {
            const name = (user.name || '').toUpperCase();
            if (name.includes('REGIONAL') || name.includes('ASSOCIAÇÃO') || name.includes('MISSÃO') || name.includes('UNIÃO') || name.includes('COORDENAÇÃO')) {
                console.log(`[RegionalEvents] allowing DIRECTOR ${user.email} (Special Account) to create event.`);
                // For these special accounts, we assume they want to target their Region/Association.
                // We try to infer from user.region or user.association/mission
                createDto.region = user.region;
                createDto.association = user.association || user.mission;
                // We rely on service logic to handle what happens if both are present or null.
            } else {
                console.error(`[RegionalEvents] Access Denied for DIRECTOR: ${user.email}`);
                throw new ForbiddenException('Diretores de clubes comuns não podem criar eventos regionais.');
            }
        } else if (user.role !== 'MASTER') {
            console.error(`[RegionalEvents] Access Denied for role: ${user.role}`);
            throw new ForbiddenException('Apenas Coordenadores e Master podem criar eventos regionais. Seu perfil atual não possui permissão.');
        }

        return this.regionalEventsService.create(createDto, user.userId || user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Get()
    findAll(@Request() req) {
        return this.regionalEventsService.findAll(req.user);
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.regionalEventsService.findOne(id);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id')
    update(@Param('id') id: string, @Body() updateDto: UpdateRegionalEventDto, @Request() req) {
        // Add check ownership logic if needed
        return this.regionalEventsService.update(id, updateDto);
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    remove(@Param('id') id: string, @Request() req) {
        // Add check ownership logic if needed
        return this.regionalEventsService.remove(id);
    }
}
