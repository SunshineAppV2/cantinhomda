import { Controller, Get, Post, Body, Param, UseGuards, Patch, Delete, UseInterceptors, UploadedFile, BadRequestException, Request, UnauthorizedException } from '@nestjs/common';
import { TreasuryService } from './treasury.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { SettleTransactionDto } from './dto/settle-transaction.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from '../uploads/storage.service';
import { ClubAccessGuard } from '../auth/club-access.guard';

@Controller('treasury')
@UseGuards(JwtAuthGuard, ClubAccessGuard)
export class TreasuryController {
    constructor(
        private readonly treasuryService: TreasuryService,
        private readonly storageService: StorageService
    ) { }

    @Post()
    create(@Body() createTransactionDto: CreateTransactionDto) {
        return this.treasuryService.create(createTransactionDto);
    }

    @Post('bulk')
    createBulk(@Body() body: any) {
        return this.treasuryService.createBulk(body);
    }

    @Get('club/:clubId')
    findAll(@Param('clubId') clubId: string, @Request() req) {
        // Access check handled by ClubAccessGuard
        return this.treasuryService.findAll(clubId);
    }

    @Get('balance/:clubId')
    getBalance(@Param('clubId') clubId: string, @Request() req) {
        // Access check handled by ClubAccessGuard
        return this.treasuryService.getBalance(clubId);
    }

    @Get('user/:userId')
    findForUser(@Param('userId') userId: string) {
        return this.treasuryService.findForUser(userId);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateTransactionDto: UpdateTransactionDto) {
        return this.treasuryService.update(id, updateTransactionDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Request() req) {
        return this.treasuryService.remove(id, req.user);
    }

    @Post(':id/settle')
    settle(@Param('id') id: string, @Body() settleTransactionDto: SettleTransactionDto) {
        return this.treasuryService.settle(id, settleTransactionDto);
    }

    @Post(':id/approve')
    approve(@Param('id') id: string) {
        return this.treasuryService.approve(id);
    }

    @Post(':id/reject')
    reject(@Param('id') id: string) {
        return this.treasuryService.reject(id);
    }

    @Post(':id/pay')
    @UseInterceptors(FileInterceptor('file', {
        limits: { fileSize: 1 * 1024 * 1024 }, // 1MB limit
        fileFilter: (req, file, cb) => {
            if (!file.mimetype.match(/\/(jpg|jpeg|png|webp|pdf)$/)) {
                return cb(new BadRequestException('Apenas arquivos de Imagem (JPG, PNG, WebP) e PDF são permitidos'), false);
            }
            cb(null, true);
        }
    }))
    async pay(@Param('id') id: string, @UploadedFile() file: Express.Multer.File, @Body('proofUrl') proofUrl?: string) {
        let finalUrl = proofUrl;

        if (file) {
            finalUrl = await this.storageService.uploadFile(file, 'treasury');
        }

        if (!finalUrl) {
            throw new BadRequestException('É necessário enviar um arquivo ou link de comprovante.');
        }

        return this.treasuryService.pay(id, finalUrl);
    }

    @Get('my-finances')
    getMyFinances(@Request() req) {
        return this.treasuryService.findForUser(req.user.id);
    }

    @Patch(':id/submit-proof')
    submitProof(@Param('id') id: string, @Body('proofUrl') proofUrl: string) {
        return this.treasuryService.submitProof(id, proofUrl);
    }
}
