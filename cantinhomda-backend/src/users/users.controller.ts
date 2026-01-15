import { Controller, Get, Param, UseGuards, Patch, Body, Post, Req, Delete, Request, Query, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  // ============================================
  // APPROVAL ENDPOINTS (MASTER ONLY)
  // ============================================

  @UseGuards(JwtAuthGuard)
  @Get('pending')
  async findPendingUsers(@Req() req) {
    // Apenas MASTER pode ver pendentes
    if (req.user.role !== 'MASTER' && req.user.email !== 'master@cantinhodbv.com') {
      throw new ForbiddenException('Apenas o Master pode visualizar cadastros pendentes');
    }
    return this.usersService.findPendingUsers();
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/approve')
  async approveUser(@Param('id') id: string, @Req() req) {
    // Apenas MASTER pode aprovar
    if (req.user.role !== 'MASTER' && req.user.email !== 'master@cantinhodbv.com') {
      throw new ForbiddenException('Apenas o Master pode aprovar cadastros');
    }
    return this.usersService.approveUser(id, req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/reject')
  async rejectUser(@Param('id') id: string, @Req() req) {
    // Apenas MASTER pode rejeitar
    if (req.user.role !== 'MASTER' && req.user.email !== 'master@cantinhodbv.com') {
      throw new ForbiddenException('Apenas o Master pode rejeitar cadastros');
    }
    return this.usersService.rejectUser(id, req.user.sub);
  }

  // ============================================
  // EXISTING ENDPOINTS
  // ============================================

  // Mantemos apenas o que existe no Service: Buscar por ID
  // E corrigimos o tipo de id para String (UUID)
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req) {
    return this.usersService.findOne(id, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() body: any) {
    return this.usersService.create(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('ranking/top')
  findRanking(@Req() req: any) {
    return this.usersService.findRanking(req?.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('available-directors')
  findAvailableDirectors() {
    return this.usersService.findAvailableDirectors();
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Req() req: any, @Query('clubId') clubId?: string) {
    console.log('[UsersController] findAll called by:', req.user?.email, 'with clubId:', clubId);
    return this.usersService.findAll(req.user, clubId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')

  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Request() req) {
    console.log('Update User Request:', id, updateUserDto);
    return this.usersService.update(id, updateUserDto, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('family/children/:parentId')
  findChildren(@Param('parentId') parentId: string) {
    return this.usersService.findChildren(parentId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('family/link')
  linkChild(@Body() body: { parentId: string, childEmail: string }) {
    return this.usersService.linkChild(body.parentId, body.childEmail);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    return this.usersService.remove(id, req.user);
  }
  @Get('force/reset-master-password')
  resetMaster() {
    return this.usersService.resetMasterPasswordForce();
  }
}

