import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { SystemSettingsService } from './system-settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('system-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SystemSettingsController {
    constructor(private readonly systemSettingsService: SystemSettingsService) { }

    @Get()
    findAll() {
        // Permitir que todos usuários autenticados leiam as configurações? 
        // Sim, pois o frontend precisa saber se exibe os menus.
        // Mas talvez filtrar quais keys podem ser vistas? Por enquanto aberto.
        return this.systemSettingsService.findAll();
    }

    @Put(':key')
    @Roles(Role.MASTER)
    update(@Param('key') key: string, @Body('value') value: string) {
        return this.systemSettingsService.update(key, value);
    }
}
