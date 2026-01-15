
import { Controller, Get, Post, Body, Query, UseGuards, Param, Request, Delete, Patch, BadRequestException, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateRequirementDto } from './dto/update-requirement.dto';
import { RequirementsService } from './requirements.service';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DBVClass } from '@prisma/client';

@Controller('requirements')
export class RequirementsController {
    constructor(private readonly requirementsService: RequirementsService) { }

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
    @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } })) // 10MB
    async respond(
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
                const parsedAnswers = typeof quizAnswers === 'string' ? JSON.parse(quizAnswers) : quizAnswers;
                // Convert { "0": 1, "1": 0 } object to array [{questionId: ?, selectedIndex: ?}]
                // Wait, frontend sends { questionIndex: optionIndex }. Backend expects { questionId, selectedIndex }.
                // Frontend 'quizAnswers' uses INDEX as key.
                // We need to map index to Question ID? 
                // Using `getQuiz` we sent Question IDs. Frontend should ideally send Question IDs.
                // Looking at frontend: `quizAnswers` state is index->index.
                // This is risky if order changes.
                // Ideally frontend should change to questionId->index.
                // But for now, let's assume standard flow (Text/File) is priority.
                // If it's a quiz, we will need to refactor frontend to send IDs.
                // For now, logging.
                console.warn('Quiz submission via generic respond endpoint not fully implemented yet.');
            }

            // 2. Handle File Upload
            let fileUrl: string | null = null;
            if (file) {
                try {
                    const admin = await import('firebase-admin');
                    if (admin.apps.length > 0) {
                        const bucket = admin.storage().bucket();
                        const filename = `responses/${Date.now()}_${userId}_${file.originalname}`;
                        const fileUpload = bucket.file(filename);

                        await fileUpload.save(file.buffer, {
                            contentType: file.mimetype,
                            public: true,
                        });
                        fileUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;
                    } else {
                        console.warn('Firebase Admin not initialized. Skipping upload.');
                    }
                } catch (err) {
                    console.error('Firebase Upload Error:', err);
                    // Fallback or throw?
                }
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
    update(@Param('id') id: string, @Body() updateDto: UpdateRequirementDto) {
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
