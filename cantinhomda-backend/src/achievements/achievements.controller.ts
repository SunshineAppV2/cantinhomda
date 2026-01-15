
import { Controller, Get, Post, Body, Param, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { AchievementsService } from './achievements.service';
import { CreateAchievementDto } from './dto/create-achievement.dto';
import { AssignAchievementDto } from './dto/assign-achievement.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Adjust path
import { Request } from 'express';

@Controller('achievements')
export class AchievementsController {
    constructor(private readonly achievementsService: AchievementsService) { }

    @UseGuards(JwtAuthGuard)
    @Post()
    create(@Body() createAchievementDto: CreateAchievementDto) {
        // Ideally check if user is admin
        return this.achievementsService.create(createAchievementDto);
    }

    @UseGuards(JwtAuthGuard)
    @Get()
    findAll() {
        return this.achievementsService.findAll();
    }

    @UseGuards(JwtAuthGuard)
    @Post('assign')
    assign(@Body() assignAchievementDto: AssignAchievementDto, @Req() req: any) {
        if (req.user.role !== 'MASTER' && req.user.role !== 'OWNER') {
            throw new ForbiddenException('Apenas Master pode atribuir conquistas.');
        }
        return this.achievementsService.assign(assignAchievementDto, req.user.uid || req.user.user_id);
    }

    @UseGuards(JwtAuthGuard)
    @Get('user/:id')
    findByUser(@Param('id') id: string) {
        return this.achievementsService.findByUser(id);
    }

    @UseGuards(JwtAuthGuard)
    @Get('my')
    findMy(@Req() req: any) {
        return this.achievementsService.findByUser(req.user.user_id); // Adjust based on JWT payload
    }
}
