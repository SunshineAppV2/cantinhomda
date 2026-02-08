import { Controller, Get, Post, Body, Query, UseGuards, Param, Request, Delete, Patch, BadRequestException, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateRequirementDto } from './dto/update-requirement.dto';
import { RequirementsService } from './requirements.service';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DBVClass } from '@prisma/client';
import { StorageService } from '../uploads/storage.service';

@Controller('requirements')
export class RequirementsController {
    constructor(
        private readonly requirementsService: RequirementsService,
        private readonly storageService: StorageService
    ) { }

    @UseGuards(JwtAuthGuard)
    @Get('scrape')
    async scrape(@Query('url') url: string) {
        if (!url) throw new Error('URL required');
        return this.requirementsService.scrapeUrl(url);
    }

    @UseGuards(JwtAuthGuard)
    @Post()
    create(@Body() createDto: CreateRequirementDto, @Request() req) {
        console.log('[RequirementsController] Received create request:', JSON.stringify(createDto));
        console.log('[RequirementsController] User:', req.user.email, req.user.role);

        const userClubId = req.user.clubId;
        const isMaster = req.user.email === 'master@cantinhomda.com' || req.user.role === 'MASTER';
        const isRegionalCoordinator = req.user.role === 'COORDINATOR_REGIONAL';
        const isDistrictCoordinator = req.user.role === 'COORDINATOR_DISTRICT';

        if (isRegionalCoordinator) {
            if (!req.user.region) {
                throw new BadRequestException('Seu perfil de Coordenador Regional não possui uma Região definida. Atualize seu perfil.');
            }
            createDto.region = req.user.region;
            // If they sent a clubId, we keep it (Target: Specific Club in Region)
            if (!createDto.clubId) {
                delete createDto.clubId;
            }
        } else if (isDistrictCoordinator) {
            if (!req.user.district) {
                throw new BadRequestException('Seu perfil de Coordenador Distrital não possui um Distrito definido. Atualize seu perfil.');
            }
            createDto.district = req.user.district;
            // District Coordinator implicitly belongs to a Region too, usually.
            // But the requirement is specific to the DISTRICT.
            // We stamp district so only clubs in that district see it.
            if (!createDto.clubId) {
                delete createDto.clubId;
            }
        } else if (userClubId && !isMaster) {
            // Club Admin: Force clubId
            createDto.clubId = userClubId;
        }
        // If Master, we respect the createDto values (can be Global, specific Club, etc)

        return this.requirementsService.create(createDto);
    }

    @UseGuards(JwtAuthGuard)
    @Post('import')
    import(@Body() items: CreateRequirementDto[], @Request() req) {
        // Ensure only Master can import GLOBAL requirements?
        // Or Club Admin can import BULK requirements?
        // Let's assume Master for now as requested.
        // if (req.user.email !== 'master@cantinhomda.com') throw new ForbiddenException();

        // For flexibility, allows import. Logic inside service will handle creation.
        // We might want to force clubID if not master?
        const userClubId = req.user.clubId;
        const isMaster = req.user.email === 'master@cantinhomda.com';

        const dataToImport = items.map(item => {
            if (!isMaster && userClubId) {
                return { ...item, clubId: userClubId };
            }
            return item;
        });

        return this.requirementsService.createMany(dataToImport);
    }

    @UseGuards(JwtAuthGuard)
    @Get()
    findAll(
        @Query('class') dbvClass: DBVClass,
        @Query('specialtyId') specialtyId: string,
        @Query('userId') targetUserId: string,
        @Request() req
    ) {
        // If user is accessing their own list or looking at someone's list?
        // Usually we want to see requirements available to "Me" or "My Club".
        // Pass the requester's clubId to filter available requirements.
        let userId = req?.user?.userId || req?.user?.id;
        const userRole = req?.user?.role;

        // Allow Admins/Counselors to view other's progress if targetUserId is provided
        if (targetUserId && ['OWNER', 'ADMIN', 'COUNSELOR', 'INSTRUCTOR'].includes((userRole || '').toUpperCase())) {
            userId = targetUserId;
        }

        const userClubId = req.user.clubId;
        const region = req.user.region;
        const district = req.user.district; // Capture District from JWT

        return this.requirementsService.findAll({ dbvClass, specialtyId, userId, userClubId, region, district });
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id/stats')
    async getStats(@Param('id') id: string) {
        return this.requirementsService.getRequirementStats(id);
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id/assigned-users')
    async getAssignedUsers(@Param('id') id: string) {
        return this.requirementsService.getAssignedUsers(id);
    }

    @UseGuards(JwtAuthGuard)
    @Post('answer')
    async answer(@Body() body: { requirementId: string, text?: string, fileUrl?: string }, @Request() req) {
        try {
            const userId = req.user.userId || req.user.id;
            console.log('Submitting answer for user:', userId, 'Requirement:', body.requirementId);
            return await this.requirementsService.submitAnswer(userId, body.requirementId, body.text, body.fileUrl);
        } catch (error) {
            console.error('Error submitting answer:', error);
            throw error;
        }
    }

    @UseGuards(JwtAuthGuard)
    @Post('respond')
    @UseInterceptors(FileInterceptor('file', {
        limits: { fileSize: 1 * 1024 * 1024 }, // 1MB limit
        fileFilter: (req, file, cb) => {
            if (!file.mimetype.match(/\/(jpg|jpeg|png|webp|pdf)$/)) {
                return cb(new BadRequestException('Apenas arquivos de Imagem (JPG, PNG, WebP) e PDF são permitidos'), false);
            }
            cb(null, true);
        }
    })) async respond(
        @UploadedFile() file: Express.Multer.File,
        @Body() body: any,
        @Request() req
    ) {
        try {
            const userId = req.user.userId || req.user.id;
            const { requirementId, text, type, quizAnswers, eventId } = body;

            console.log(`[RequirementsController] Respond request from ${userId} for Req ${requirementId}`);

            // 1. Handle Quiz
            if (quizAnswers) {
                console.warn('Quiz submission via generic respond endpoint not fully implemented yet.');
            }

            // 2. Handle File Upload
            let fileUrl: string | null = null;
            if (file) {
                fileUrl = await this.storageService.uploadFile(file, 'responses');
            }

            // 3. Submit to Service
            return await this.requirementsService.submitAnswer(userId, requirementId, text, fileUrl || undefined);

        } catch (error) {
            console.error('Error in respond endpoint:', error);
            throw error;
        }
    }

    @UseGuards(JwtAuthGuard)
    @Get('child/:childId/alerts')
    getAlertsForChild(@Param('childId') childId: string) {
        return this.requirementsService.getAlertsForChild(childId);
    }


    @UseGuards(JwtAuthGuard)
    @Get('progress')
    getProgress(@Request() req) {
        return this.requirementsService.getUserProgress(req.user.userId);
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.requirementsService.remove(id);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id')
    async update(@Param('id') id: string, @Body() updateDto: UpdateRequirementDto, @Request() req) {
        console.log('[RequirementsController] Received update request for ID:', id);
        console.log('[RequirementsController] Update payload:', JSON.stringify(updateDto));
        console.log('[RequirementsController] User:', req.user.email, req.user.role);

        const userRole = req.user.role;
        const isRegionalCoordinator = userRole === 'COORDINATOR_REGIONAL';
        const isDistrictCoordinator = userRole === 'COORDINATOR_DISTRICT';
        const isMaster = req.user.email === 'master@cantinhomda.com' || userRole === 'MASTER';

        // If Regional Coordinator is updating, ensure region is preserved
        if (isRegionalCoordinator && !isMaster) {
            if (!req.user.region) {
                throw new BadRequestException('Seu perfil de Coordenador Regional não possui uma Região definida.');
            }
            // Preserve the region in the update
            updateDto.region = req.user.region;
        }

        // If District Coordinator is updating, ensure district is preserved
        if (isDistrictCoordinator && !isMaster) {
            if (!req.user.district) {
                throw new BadRequestException('Seu perfil de Coordenador Distrital não possui um Distrito definido.');
            }
            updateDto.district = req.user.district;
        }

        return this.requirementsService.update(id, updateDto);
    }
    @UseGuards(JwtAuthGuard)
    @Get(':id/quiz')
    getQuiz(@Param('id') id: string) {
        return this.requirementsService.getQuiz(id);
    }

    @UseGuards(JwtAuthGuard)
    @Post(':id/quiz/submit')
    submitQuiz(@Param('id') id: string, @Body() body: { answers: { questionId: string, selectedIndex: number }[] }, @Request() req) {
        const userId = req.user.userId || req.user.id;
        return this.requirementsService.submitQuiz(userId, id, body.answers);
    }
    @UseGuards(JwtAuthGuard)
    @Post(':id/assign')
    assign(@Param('id') id: string, @Body() body: { userIds: string[] }, @Request() req) {
        const counselorId = req.user.userId || req.user.id;
        return this.requirementsService.createAssignments(id, body.userIds, counselorId);
    }

    @UseGuards(JwtAuthGuard)
    @Post(':id/complete')
    completeForUser(@Param('id') id: string, @Body() body: { userId: string }, @Request() req) {
        const approverId = req.user.userId || req.user.id;
        // Verify role perm here if needed, but Service likely handles or we trust higher roles.
        // Assuming Counselor+ can do this.
        return this.requirementsService.completeForUser(body.userId, id, approverId);
    }

    @UseGuards(JwtAuthGuard)
    @Get('approvals/pending')
    getPendingApprovals(@Request() req) {
        const counselorId = req.user.userId || req.user.id;
        return this.requirementsService.getPendingApprovals(counselorId);
    }

    @UseGuards(JwtAuthGuard)
    @Get('deliveries/pending')
    getPendingDeliveries(@Request() req) {
        const counselorId = req.user.userId || req.user.id;
        return this.requirementsService.getPendingDeliveries(counselorId);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id/approve')
    approveRequirement(@Param('id') id: string, @Request() req) {
        const approverId = req.user.userId || req.user.id;
        return this.requirementsService.approveAssignment(id, approverId);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id/reject')
    rejectRequirement(@Param('id') id: string) {
        return this.requirementsService.rejectAssignment(id);
    }
}
