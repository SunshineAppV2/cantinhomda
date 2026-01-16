import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { SystemService } from './system.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('system')
@UseGuards(JwtAuthGuard)
export class SystemController {
    constructor(private readonly systemService: SystemService) { }

    @Get('config')
    getConfig() {
        return this.systemService.getConfig();
    }

    @Patch('config')
    updateConfig(@Body() data: any) {
        return this.systemService.updateConfig(data);
    }
}
