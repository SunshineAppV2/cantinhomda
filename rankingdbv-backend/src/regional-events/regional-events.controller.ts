import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { RegionalEventsService } from './regional-events.service';
import { CreateRegionalEventDto } from './dto/create-regional-event.dto';
import { UpdateRegionalEventDto } from './dto/update-regional-event.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('regional-events')
export class RegionalEventsController {
    constructor(
        private readonly regionalEventsService: RegionalEventsService
    ) { }

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
    findOne(@Param('id') id: string, @Request() req) {
        const userId = req.user?.userId || req.user?.id;
        return this.regionalEventsService.findOne(id, userId);
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

    @UseGuards(JwtAuthGuard)
    @Post(':id/subscribe')
    subscribe(@Param('id') id: string, @Request() req) {
        const clubId = req.user.clubId;
        if (!clubId) throw new ForbiddenException('Apenas diretores de clube podem se inscrever.');
        return this.regionalEventsService.subscribe(id, clubId);
    }

    @UseGuards(JwtAuthGuard)
    @Post(':id/unsubscribe')
    unsubscribe(@Param('id') id: string, @Request() req) {
        const clubId = req.user.clubId;
        if (!clubId) throw new ForbiddenException('Apenas diretores de clube podem cancelar inscrição.');
        return this.regionalEventsService.unsubscribe(id, clubId);
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id/pending-responses')
    getPendingResponses(@Param('id') id: string, @Request() req) {
        return this.regionalEventsService.getPendingResponses(id, req.user);
    }

    @UseGuards(JwtAuthGuard)
    @Post(':id/requirements/:reqId/response')
    async submitResponse(
        @Param('id') eventId: string,
        @Param('reqId') reqId: string,
        @Body() body: { text?: string, file?: string },
        @Request() req
    ) {
        const clubId = req.user.clubId;
        const userId = req.user.userId || req.user.id;
        if (!clubId) throw new ForbiddenException('Apenas membros de clube podem responder.');

        return this.regionalEventsService.submitResponse(eventId, reqId, clubId, userId, body);
    }

    @UseGuards(JwtAuthGuard)
    @Post(':id/responses/:respId/approve')
    approveResponse(@Param('respId') respId: string, @Request() req) {
        return this.regionalEventsService.approveResponse(respId, req.user.userId || req.user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Post(':id/responses/:respId/reject')
    rejectResponse(@Param('respId') respId: string, @Body() body: any, @Request() req) {
        return this.regionalEventsService.rejectResponse(respId, req.user.userId || req.user.id, body.reason);
    }
}
