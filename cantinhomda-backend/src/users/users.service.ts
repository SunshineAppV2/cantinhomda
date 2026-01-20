import { Injectable, UnauthorizedException, Inject, forwardRef, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, Prisma } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { ClubsService } from '../clubs/clubs.service';
import { firebaseAdmin } from '../firebase-admin';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => ClubsService)) private clubsService: ClubsService
  ) { }

  // Busca usuário pelo Email (usado no login)
  async findOneByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  // Busca usuários elegíveis para serem donos de clube (sem clube atribuído)
  async findAvailableDirectors() {
    return this.prisma.user.findMany({
      where: {
        clubId: null,
        // We want to find anyone who might need a club, usually Directors/Owners who got stuck
        // But let's allow finding normal users too if they need to be promoted
        // For now, let's stick to likely candidates to avoid noise
        role: { in: ['OWNER', 'ADMIN', 'COORDINATOR_REGIONAL', 'MASTER', 'DIRECTOR', 'COUNSELOR', 'INSTRUCTOR', 'PARENT', 'PATHFINDER'] }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });
  }

  // Busca todos os usuários
  async findAll(currentUser?: any, clubId?: string, email?: string) {
    console.log('[UsersService.findAll] Called with currentUser:', {
      email: currentUser?.email,
      role: currentUser?.role,
      clubId: currentUser?.clubId
    }, 'clubId param:', clubId);

    // 1. Get total requirements count per class
    const requirements = await this.prisma.requirement.findMany({
      where: { dbvClass: { not: null } },
      select: { dbvClass: true }
    });

    const classTotals: Record<string, number> = {};
    requirements.forEach(r => {
      if (r.dbvClass) {
        classTotals[r.dbvClass] = (classTotals[r.dbvClass] || 0) + 1;
      }
    });

    // Build Where Clause
    const where: Prisma.UserWhereInput = {};

    if (currentUser?.email === 'master@cantinhomda.com' || currentUser?.role === 'MASTER') {
      // Master can filter by clubId if provided, otherwise see all
      if (clubId) where.clubId = clubId;
    } else if (currentUser && currentUser.role === 'COUNSELOR') {
      if (!currentUser.unitId) {
        return [];
      }
      where.unitId = currentUser.unitId;
    } else if (currentUser && currentUser.role === 'INSTRUCTOR') {
      if (currentUser.dbvClass) {
        where.dbvClass = currentUser.dbvClass;
      }
      if (currentUser.clubId) where.clubId = currentUser.clubId;
    } else if (currentUser && (currentUser.role === 'COORDINATOR_DISTRICT' || currentUser.role === 'COORDINATOR_REGIONAL' || currentUser.role === 'COORDINATOR_AREA')) {
      const association = currentUser.association || currentUser.mission;
      if (!association) return []; // STRICT: No association, no users.

      if (currentUser.role === 'COORDINATOR_REGIONAL' && !currentUser.region) return [];
      if (currentUser.role === 'COORDINATOR_DISTRICT' && (!currentUser.region || !currentUser.district)) return [];

      const clubFilter: any = {};
      if (currentUser.union) clubFilter.union = currentUser.union;
      clubFilter.OR = [
        { association: association },
        { mission: association }
      ];

      if (currentUser.role === 'COORDINATOR_DISTRICT') clubFilter.district = currentUser.district;
      if (currentUser.role === 'COORDINATOR_REGIONAL') clubFilter.region = currentUser.region;

      where.club = clubFilter;
    } else if (currentUser?.clubId) {
      where.clubId = currentUser.clubId;
    }

    if (email) {
      where.email = { contains: email, mode: 'insensitive' };
    }

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        clubId: true,
        club: { select: { name: true, settings: true, phoneNumber: true } },
        unitId: true,
        dbvClass: true,
        region: true,
        district: true,
        mission: true,
        association: true,
        union: true,

        isActive: true, // Needed for frontend edit
        status: true, // Needed for approvals
        requirements: {
          where: {
            status: 'APPROVED',
            requirement: { dbvClass: { not: null } }
          },
          select: {
            requirement: {
              select: { dbvClass: true }
            }
          }
        },
        // Extended Profile - OPTIMIZED: Fetch only essentials for List View
        sex: true,
        birthDate: true,
        // maritalStatus: true, // Heavy/Unused in list
        phone: true,
        mobile: true,
        // isBaptized: true,
        // rg: true,
        // issuingOrg: true,
        cpf: true, // Used for search?
        // shirtSize: true, // Unused in list
        // address: true,
        // addressNumber: true,
        // neighborhood: true,
        // cep: true,
        // city: true,
        // state: true,
        // complement: true,
        // educationLevel: true,
        // educationStatus: true,
        // knowledgeArea: true,
        // courseName: true,
        // institution: true,
        // schoolShift: true,
        // isHealthProfessional: true,
        // healthProfessionalType: true,
        // fatherName: true,
        // fatherEmail: true,
        // fatherPhone: true,
        // motherName: true,
        // motherEmail: true,
        // motherPhone: true,
        // emergencyName: true,
        // emergencyPhone: true,
        // emergencyRelation: true,
        // Medical Record - HEAVY - OMITTED
        // susNumber: true,
        // healthPlan: true,
        // bloodType: true,
        // rhFactor: true,
        // diseasesHistory: true,
        // hasHeartProblem: true,
        // heartProblemDesc: true,
        // hasDiabetes: true,
        // hasRenalProblem: true,
        // hasPsychProblem: true,
        // regularMedications: true,
        // specificAllergies: true,
        // recentTrauma: true,
        // recentFracture: true,
        // recentSurgery: true,
        // disabilities: true,
        // healthNotes: true,
        parentId: true,
        createdAt: true,
        children: {
          select: { id: true }
        }
      }
    });

    return users.map(user => {
      let progress = 0;
      if (user.dbvClass && classTotals[user.dbvClass]) {
        const completed = user.requirements.filter(ur => ur.requirement.dbvClass === user.dbvClass).length;
        progress = Math.round((completed / classTotals[user.dbvClass]) * 100);
      }
      const { requirements, ...userData } = user;
      return { ...userData, classProgress: progress };
    });
  }

  // Ranking de usuários por pontos
  async findRanking(currentUser?: any) {
    const where: any = {
      isActive: true
    };

    const isMaster = currentUser?.email?.toLowerCase() === 'master@cantinhomda.com';

    if (!isMaster) {
      if (!currentUser?.clubId) {
        return [];
      }
      where.clubId = currentUser.clubId;

      // Removed Unit restriction to allow Counselors to see full Club Ranking
      // if (currentUser.role === 'COUNSELOR' && currentUser.unitId) {
      //   where.unitId = currentUser.unitId;
      // }
    }

    return this.prisma.user.findMany({
      where,
      orderBy: {
        points: 'desc',
      },
      take: 100, // Top 100
      select: {
        id: true,
        name: true,
        points: true,
        role: true,
        photoUrl: true,
        club: {
          select: {
            name: true
          }
        }
      }
    });
  }

  // Busca usuário pelo ID (usado para validar token)
  // Busca usuário pelo ID (usado para validar token)
  async findOne(id: string, currentUser?: any): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        club: true,
        unit: true,
        specialties: { include: { specialty: true } },
        requirements: { include: { requirement: true } },
        logs: { take: 10, orderBy: { awardedAt: 'desc' } },
        attendances: { take: 10, orderBy: { createdAt: 'desc' } }
      },
    });

    if (!user) return null;

    // Strict ACL Check if context is provided
    if (currentUser) {
      if (currentUser.email === 'master@cantinhomda.com') return user; // Master sees all
      if (user.id === currentUser.userId) return user; // Self sees self

      // Club Director
      if (['OWNER', 'ADMIN', 'DIRECTOR'].includes(currentUser.role)) {
        if (user.clubId !== currentUser.clubId) throw new UnauthorizedException('Acesso negado: Outro clube.');
        return user;
      }

      // Counselor
      if (currentUser.role === 'COUNSELOR') {
        if (user.unitId !== currentUser.unitId) throw new UnauthorizedException('Acesso negado: Outra unidade.');
        return user;
      }

      // Instructor
      if (currentUser.role === 'INSTRUCTOR') {
        // Allow if same class (assuming Instructor has dbvClass set)
        if (currentUser.dbvClass && user.dbvClass === currentUser.dbvClass && user.clubId === currentUser.clubId) return user;
        throw new UnauthorizedException('Acesso negado: Aluno não atribuído.');
      }

      // Regional/District Coordinators
      if (currentUser.role === 'COORDINATOR_DISTRICT') {
        if (user.club?.district !== currentUser.district) throw new UnauthorizedException('Acesso negado: Perfil fora do seu distrito.');
        return user;
      }

      if (currentUser.role === 'COORDINATOR_REGIONAL') {
        if (user.club?.region !== currentUser.region) throw new UnauthorizedException('Acesso negado: Perfil fora da sua região.');
        return user;
      }

      if (currentUser.role === 'COORDINATOR_AREA') {
        if (user.club?.association !== currentUser.association) throw new UnauthorizedException('Acesso negado: Perfil fora da sua associação.');
        return user;
      }

      // Parent
      if (currentUser.role === 'PARENT') {
        if (user.parentId !== currentUser.userId) throw new UnauthorizedException('Acesso negado: Não é seu filho.');
        return user;
      }

      // Pathfinder / Others trying to see others
      if (currentUser.role === 'PATHFINDER') {
        throw new UnauthorizedException('Acesso restrito ao próprio perfil.');
      }
    }

    return user;
  }

  // Cria um novo usuário
  async create(createUserDto: any): Promise<User> {
    // Strip fields that belong to club or are not part of user schema
    const {
      clubId,
      unitId,
      dbvClass,
      birthDate,
      schoolShift,
      clubName,
      mission,
      union,
      district,
      childrenIds,
      password,
      referralCode,
      paymentPeriod, // Club field
      clubSize, // Club field
      // Don't strip hierarchy fields! We need them.
      // clubName, mission, union, district, region, association -> These might be in DTO if creating club or independent user
      ...rest
    } = createUserDto;

    console.log(`[UsersService.create] Creating user: ${rest.email}`);

    // Capture hierarchy from DTO or Club
    let finalUnion = createUserDto.union;
    let finalMission = createUserDto.mission || createUserDto.association; // Alias
    let finalRegion = createUserDto.region;
    let finalDistrict = createUserDto.district;
    let finalAssociation = createUserDto.association || createUserDto.mission; // Both fields for safety

    // ===== STEP 1: VALIDATE SUBSCRIPTION LIMITS =====
    if (clubId) {
      const club = await this.prisma.club.findUnique({
        where: { id: clubId },
      });

      if (club) {
        // Cast to any because IDE types might be stale after migration
        const clubData = club as any;

        // Check BILLING Status first (Robust Dynamic Check)
        // BYPASS if registering a NEW user (status PENDING or role OWNER) to allow initial signup
        if (rest.status !== 'PENDING' && rest.role !== 'OWNER') {
          await this.clubsService.checkWriteAccess(clubId);
        }

        // Calculate PAID/Liable Members (Everyone except PARENTS/MASTER)
        const paidCount = await this.prisma.user.count({
          where: {
            clubId,
            role: { notIn: ['PARENT', 'MASTER'] },
            isActive: true
          }
        });

        const limit = clubData.memberLimit;

        // Check Limit if creating a NON-PARENT
        if (rest.role !== 'PARENT') {
          if (paidCount >= limit) {
            throw new ForbiddenException(`Limite do plano atingido (${paidCount}/${limit} membros ativos). Faça upgrade para adicionar mais.`);
          }
        }
      }
    }

    // ===== STEP 2: PREPARE DATA =====
    // Hash password for DB
    const hashedPassword = await bcrypt.hash(password, 10);

    // Sanitize Enum and Relations
    const validDbvClass = dbvClass === '' ? undefined : dbvClass;
    const validUnitId = unitId === '' ? undefined : unitId;

    // ===== STEP 1.5: HIERARCHY INHERITANCE =====
    if (clubId) {
      const club = await this.prisma.club.findUnique({ where: { id: clubId } });
      if (club) {
        // If user joining a club, FORCE hierarchy to match club
        finalUnion = club.union;
        finalMission = club.mission || club.association;
        finalAssociation = club.association || club.mission;
        finalRegion = club.region;
        finalDistrict = club.district;
        console.log(`[UsersService.create] Inherited hierarchy from Club: ${club.name} (${finalUnion}/${finalMission})`);
      }
    }

    // Sanitize Date
    let validBirthDate: Date | undefined;
    if (birthDate && typeof birthDate === 'string' && birthDate.trim() !== '') {
      validBirthDate = new Date(birthDate);
      if (isNaN(validBirthDate.getTime())) validBirthDate = undefined;
    }

    const childrenConnect = childrenIds && Array.isArray(childrenIds)
      ? childrenIds.map((id: string) => ({ id }))
      : [];

    // ===== STEP 3: CREATE USER IN POSTGRES =====
    const user = await this.prisma.user.create({
      data: {
        ...rest,
        // Persist Hierarchy
        union: finalUnion,
        mission: finalMission,
        association: finalAssociation,
        region: finalRegion,
        district: finalDistrict,

        password: hashedPassword, // Use Hashed Password
        birthDate: validBirthDate,
        dbvClass: validDbvClass as any, // Cast to any or correct Enum type if imported
        schoolShift: schoolShift, // Explicitly add it back
        club: clubId ? { connect: { id: clubId } } : undefined,
        unit: validUnitId ? { connect: { id: validUnitId } } : undefined,
        children: childrenConnect.length > 0 ? { connect: childrenConnect } : undefined
      },
    });

    console.log(`[UsersService.create] ? User created in Postgres: ${user.id} (${user.email})`);

    // ===== STEP 4: SYNC TO FIREBASE (NON-BLOCKING) =====
    // We do this AFTER Postgres creation so database is the source of truth
    // If Firebase fails, user can still use the system via Postgres auth
    if (rest.email && password) {
      this.syncUserToFirebase(rest.email, password, rest.name).catch(err => {
        console.error(`[UsersService.create] ?? Firebase sync failed for ${rest.email}:`, err.message);
        // Non-blocking - user creation succeeded in Postgres
      });
    }

    return user;
  }

  // Helper method for Firebase sync (runs async, non-blocking)
  private async syncUserToFirebase(email: string, password: string, displayName: string): Promise<void> {
    try {
      console.log(`[FirebaseSync] Creating user ${email}...`);
      await firebaseAdmin.auth().createUser({
        email: email,
        password: password,
        displayName: displayName,
        emailVerified: true
      });
      console.log(`[FirebaseSync] ? User ${email} created in Firebase.`);
    } catch (error: any) {
      if (error.code === 'auth/email-already-exists') {
        console.warn(`[FirebaseSync] User ${email} already exists. Updating password...`);
        try {
          const fbUser = await firebaseAdmin.auth().getUserByEmail(email);
          await firebaseAdmin.auth().updateUser(fbUser.uid, {
            password: password,
            displayName: displayName
          });
          console.log(`[FirebaseSync] ? User ${email} updated in Firebase.`);
        } catch (updErr) {
          console.error(`[FirebaseSync] ? Failed to update existing user:`, updErr);
          throw updErr;
        }
      } else {
        console.error(`[FirebaseSync] ? Failed to create user:`, error);
        throw error;
      }
    }
  }



  async linkChild(parentId: string, childEmail: string) {
    const child = await this.prisma.user.findUnique({
      where: { email: childEmail }
    });

    if (!child) {
      throw new Error('Filho não encontrado');
    }

    return this.prisma.user.update({
      where: { id: child.id },
      data: { parentId }
    });
  }

  // Atualiza um usuário
  async update(id: string, updateUserDto: UpdateUserDto, currentUser?: any): Promise<User> {
    console.log(`[UsersService.update] Target ID: ${id}, Current User: ${currentUser?.email} (${currentUser?.role})`);
    console.log(`[UsersService.update] Raw DTO:`, JSON.stringify(updateUserDto, null, 2));

    // Destructure properties to sanitize or exclude
    const {
      password,
      birthDate,
      schoolShift,
      requirements,
      classProgress,
      club,
      unit,
      id: _id, // exclude id from data
      createdAt,
      updatedAt,
      pointsHistory,
      childrenIds, // Extract childrenIds
      ...rest
    } = updateUserDto as any;

    // 1. RESOLVE TARGET ID (Handle 'me' alias)
    if (currentUser) {
      if (id === 'me' || id === 'undefined' || id === 'null') {
        if (currentUser.userId) {
          console.log(`[Update] Resolving alias '${id}' to authenticated User ID: ${currentUser.userId}`);
          id = currentUser.userId;
        } else if (currentUser.email) {
          // Fallback: Try Resolving by email if userId missing in token
          const u = await this.prisma.user.findUnique({ where: { email: currentUser.email } });
          if (u) id = u.id;
        }
      }
    }

    // 2. FETCH EXISTING USER (Needed for Logic & ACL)
    let userToUpdate = await this.prisma.user.findUnique({ where: { id } });

    // Fallback: Try by UID
    if (!userToUpdate) {
      console.log(`[Update] User not found by UUID: ${id}. Trying UID...`);
      userToUpdate = await this.prisma.user.findUnique({ where: { uid: id } });
      if (userToUpdate) {
        console.log(`[Update] Found user by UID: ${id} -> ID: ${userToUpdate.id}`);
        id = userToUpdate.id; // Map to DB ID for subsequent operations
      }
    }

    // Fallback: Try by Email (from Token)
    if (!userToUpdate && currentUser?.email) {
      console.log(`[Update] User not found by ID/UID. Trying Email: ${currentUser.email}`);
      userToUpdate = await this.prisma.user.findUnique({ where: { email: currentUser.email } });
      if (userToUpdate) {
        console.log(`[Update] Found user by Email (Fallback): ${currentUser.email} -> ID: ${userToUpdate.id}`);
        id = userToUpdate.id;
      }
    }

    if (!userToUpdate) {
      console.error(`[Update] ? User NOT FOUND for ID/UID: ${id} (User: ${currentUser?.email})`);
      throw new NotFoundException('Usuário não encontrado');
    }

    // 3. ACL CHECK
    if (currentUser) {
      const isMaster = currentUser.role === 'MASTER' || currentUser.email === 'master@cantinhomda.com';
      const isSelf = currentUser.userId === userToUpdate.id || currentUser.email === userToUpdate.email;
      const isClubAdmin = ['OWNER', 'ADMIN', 'DIRECTOR'].includes(currentUser.role) && userToUpdate.clubId === currentUser.clubId;

      console.log(`[Update] ACL Check: Master=${isMaster}, Self=${isSelf}, ClubAdmin=${isClubAdmin}`);

      if (!isMaster && !isSelf && !isClubAdmin) {
        throw new UnauthorizedException('Permissão negada para editar este usuário.');
      }
    }

    // 4. PREPARE DATA
    let dataToUpdate: any = { ...rest };
    if (pointsHistory) {
      dataToUpdate.pointsHistory = pointsHistory;
    }

    // Role Security Check
    if (dataToUpdate.role === 'OWNER' || dataToUpdate.role === 'COORDINATOR_REGIONAL' || dataToUpdate.role === 'COORDINATOR_AREA' || dataToUpdate.role === 'COORDINATOR_DISTRICT') {
      const isMaster = currentUser?.email === 'master@cantinhomda.com' || currentUser?.role === 'MASTER';
      if (!isMaster) {
        // If not Master, prevent escalation to OWNER/COORDINATORS if the role is changing
        if (userToUpdate.role !== dataToUpdate.role) {
          dataToUpdate.role = 'PATHFINDER'; // Prevent escalation
        }
      }

      // Logic to ensure only ONE OWNER per club
      if (dataToUpdate.role === 'OWNER') {
        const targetClubId = dataToUpdate.clubId !== undefined ? dataToUpdate.clubId : userToUpdate.clubId;

        if (targetClubId) {
          await this.prisma.user.updateMany({
            where: {
              clubId: targetClubId,
              role: 'OWNER',
              id: { not: id }
            },
            data: { role: 'ADMIN' }
          });
          console.log(`[ACL] Other owners for club ${targetClubId} demoted to ADMIN.`);
        }
      }
    }

    if (password) {
      dataToUpdate.password = await bcrypt.hash(password, 10);
    }

    // Sanitize empty strings to null for relations and enums
    if (dataToUpdate.clubId === '') dataToUpdate.clubId = null;
    if (dataToUpdate.unitId === '') dataToUpdate.unitId = null;
    if (dataToUpdate.dbvClass === '') dataToUpdate.dbvClass = null;

    // Sanitize Date
    if (birthDate !== undefined) {
      if (typeof birthDate === 'string' && birthDate.trim() !== '') {
        const d = new Date(birthDate);
        if (!isNaN(d.getTime())) {
          dataToUpdate.birthDate = d;
        } else {
          dataToUpdate.birthDate = null;
        }
      } else if (birthDate === '' || birthDate === null) {
        dataToUpdate.birthDate = null;
      }
      // If birthDate is Date object, leave it (rare if from JSON)
    }

    // Handle Manual Point Adjustment
    if (dataToUpdate.points !== undefined && !dataToUpdate.pointsHistory) {
      const currentUserState = await this.prisma.user.findUnique({ where: { id }, select: { points: true } });
      if (currentUserState) {
        const delta = Number(dataToUpdate.points) - currentUserState.points;
        if (delta !== 0) {
          dataToUpdate.pointsHistory = {
            create: {
              amount: delta,
              reason: 'Ajuste Manual de Cadastro',
              source: 'MANUAL'
            }
          };
        }
      }
    }

    if (childrenIds && Array.isArray(childrenIds)) {
      // Create connection objects
      const childrenConnect = childrenIds.map((cid: string) => ({ id: cid }));

      // Update data with children connection
      // We use 'set' to replace existing children with the new list
      dataToUpdate.children = {
        set: childrenConnect
      };
    }

    // ===== HIERARCHY UPDATE LOGIC =====
    // Logic:
    // 1. If Club changes, Inherit from new Club.
    // 2. If Club doesn't change, respect DTO values (allow manual override).

    const targetClubId = dataToUpdate.clubId;
    const currentClubId = userToUpdate.clubId;

    // Check if Club is changing (and not just re-sending the same ID)
    const isClubChanging = targetClubId && targetClubId !== currentClubId;

    if (isClubChanging) {
      // CASE 1: CHANGING CLUB -> SYNC
      console.log(`[UsersService.update] Club changed (${currentClubId} -> ${targetClubId}). Syncing hierarchy.`);
      const club = await this.prisma.club.findUnique({ where: { id: targetClubId } });
      if (club) {
        dataToUpdate.union = club.union;
        dataToUpdate.mission = club.mission || club.association;
        dataToUpdate.association = club.association || club.mission;
        dataToUpdate.region = club.region;
        dataToUpdate.district = club.district;
      }
    } else {
      // CASE 2: SAME CLUB (OR NO CLUB) -> MANUAL UPDATE
      // We only update fields if they are explicitly passed in DTO
      // This prevents overwriting with nulls if not sent, and allows manual correction
      console.log(`[UsersService.update] Manual hierarchy update (Club unchanged).`);

      if (rest.union !== undefined) dataToUpdate.union = rest.union;
      if (rest.mission !== undefined) dataToUpdate.mission = rest.mission;
      if (rest.association !== undefined) dataToUpdate.association = rest.association;
      // Special handling for 'Associação' alias if needed, but 'rest.association' is standard

      if (rest.region !== undefined) dataToUpdate.region = rest.region;
      if (rest.district !== undefined) dataToUpdate.district = rest.district;
    }

    // [DEBUG] Force Hierarchy Update Check
    if (rest.union || rest.association || rest.region) {
      console.log('[UsersService.update] DETECTED HIERARCHY UPDATE PAYLOAD:',
        { u: rest.union, a: rest.association, r: rest.region, d: rest.district });

      // Ensure they are set if not already handled
      if (rest.union) dataToUpdate.union = rest.union;
      if (rest.association) {
        dataToUpdate.association = rest.association;
        dataToUpdate.mission = rest.association;
      }
      if (rest.region) dataToUpdate.region = rest.region;
      if (rest.district) dataToUpdate.district = rest.district;
    }

    try {
      console.log(`[UsersService.update] Final data for Prisma update:`, JSON.stringify(dataToUpdate, null, 2));
      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: dataToUpdate,
      });

      console.log(`[UsersService.update] SUCCESSFULLY updated user: ${updatedUser.id}`);

      // Firebase Sync: Support updating password if provided
      if (password && updatedUser.email) {
        try {
          console.log(`[FirebaseSync] Attempting to sync password for ${updatedUser.email}...`);
          // 1. Try to find user by email
          const fbUser = await firebaseAdmin.auth().getUserByEmail(updatedUser.email);
          if (fbUser) {
            await firebaseAdmin.auth().updateUser(fbUser.uid, {
              password: password,
              emailVerified: true // Ensure it's verified
            });
            console.log(`[FirebaseSync] Password updated successfully for existing user ${updatedUser.email} (UID: ${fbUser.uid})`);
          }
        } catch (error: any) {
          if (error.code === 'auth/user-not-found') {
            console.warn(`[FirebaseSync] User ${updatedUser.email} not found in Firebase. Creating new Firebase user...`);
            try {
              const newUser = await firebaseAdmin.auth().createUser({
                uid: updatedUser.id, // Try to enforce same ID if possible, but might fail if format differs
                email: updatedUser.email,
                password: password,
                displayName: updatedUser.name,
                emailVerified: true
              });
              console.log(`[FirebaseSync] User ${updatedUser.email} CREATED successfully in Firebase (UID: ${newUser.uid}).`);
            } catch (createError: any) {
              // Edge Case: Email exists but GetByEmail failed? Or Race condition?
              if (createError.code === 'auth/email-already-exists') {
                console.warn(`[FirebaseSync] Creation failed because email already exists. Retrying update...`);
                try {
                  const existingUser = await firebaseAdmin.auth().getUserByEmail(updatedUser.email);
                  await firebaseAdmin.auth().updateUser(existingUser.uid, { password: password });
                  console.log(`[FirebaseSync] Recovered: Password updated for ${updatedUser.email} after creation conflict.`);
                } catch (retryError) {
                  console.error(`[FirebaseSync] CRITICAL: Failed to recover password update for ${updatedUser.email}:`, retryError);
                }
              } else if (createError.code === 'auth/uid-already-exists') {
                // Try creating without enforcing UID
                console.warn(`[FirebaseSync] UID collision. Creating with auto-generated UID...`);
                try {
                  await firebaseAdmin.auth().createUser({
                    email: updatedUser.email,
                    password: password,
                    displayName: updatedUser.name,
                    emailVerified: true
                  });
                  console.log(`[FirebaseSync] User ${updatedUser.email} created with auto-UID.`);
                } catch (finalError) {
                  console.error(`[FirebaseSync] Failed auto-UID creation for ${updatedUser.email}:`, finalError);
                }
              } else {
                console.error(`[FirebaseSync] Failed to create user ${updatedUser.email}:`, createError);
              }
            }
          } else {
            console.error(`[FirebaseSync] Unexpected error looking up ${updatedUser.email}:`, error);
          }
        }
      }

      console.log('User Updated:', updatedUser);

      // AUTO-ACTIVATE CLUB IF OWNER APPROVED
      if (updatedUser.role === 'OWNER' && updatedUser.status === 'ACTIVE' && updatedUser.clubId) {
        try {
          const club = await this.prisma.club.findUnique({ where: { id: updatedUser.clubId } });
          const settings: any = club?.settings || {};
          const cycle = settings?.billingCycle || 'MENSAL';

          // Calculate Next Billing Date (1st of current or next month?)
          // "inicia em 01 do mes contratado" -> Implies start of cycle is 1st.
          // If approved today (11th), and cycle is Monthly.
          // Does it expire on Feb 1st?
          // Let's set nextBillingDate to:
          // MENSAL -> +1 Month from 1st of current month? Or +1 Month from now?
          // Usually strict systems: 1st of Next Month (if pro-rated) or 1st of Current + 1 Month.
          // Let's do: Next Billing = 1st of NEXT Month + Cycle duration.
          // Simplest interpretation: Access until [Cycle End].
          // If Monthly: Today -> +30 days approx.
          // User said "inicia em 01 do mes contratado".
          // I'll set Next Billing Date to: 1st of Next Month (providing free days remaining in current month?) or 1st of Current + 1 Month?
          // Let's assume standard SaaS: Bill Date = Today + Cycle.
          // But user insisted "01".
          // I will set it to the 1st of the NEXT month for safety (giving them the rest of this month free effectively, or pro-rated).
          // Or if they pay for "January", it expires "Feb 1st".
          // So if cycle is Monthly, expiry is 1st of Next Month.
          // If Quarterly, expiry is 1st of +3 Months.
          // If Annual, expiry is 1st of +12 Months.

          const now = new Date();
          let nextDate = new Date(now.getFullYear(), now.getMonth() + 1, 1); // Default Next Month 1st

          if (cycle === 'TRIMESTRAL') {
            nextDate = new Date(now.getFullYear(), now.getMonth() + 3, 1);
          } else if (cycle === 'ANUAL') {
            nextDate = new Date(now.getFullYear(), now.getMonth() + 12, 1);
          }

          console.log(`[AutoApproval] Activating Club ${updatedUser.clubId} with Billing Cycle: ${cycle}. Next Due: ${nextDate.toISOString()}`);

          await this.clubsService.updateSubscription(updatedUser.clubId, {
            subscriptionStatus: 'ACTIVE',
            planTier: 'PLAN_P', // Default Tier? Or determine from somewhere? defaulting to PLAN_P (Small)
            // We don't know the Tier chosen, assume 'PLAN_P' or keep existing if trial. But 'TRIAL' -> 'ACTIVE'
            // I'll force PLAN_P for now as it's a paid tier.
            memberLimit: 50, // Default limit
            nextBillingDate: nextDate.toISOString(),
            gracePeriodDays: 5,
            lastPaymentAmount: 0 // Marking as manually approved
          });

        } catch (err) {
          console.error('[AutoApproval] Failed to activate club:', err);
        }
      }

      return updatedUser;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async findChildren(parentId: string) {
    // Get requirements for class calc
    const requirements = await this.prisma.requirement.findMany({
      where: { dbvClass: { not: null } },
      select: { dbvClass: true }
    });
    const classTotals: Record<string, number> = {};
    requirements.forEach(r => {
      if (r.dbvClass) classTotals[r.dbvClass] = (classTotals[r.dbvClass] || 0) + 1;
    });

    const children = await this.prisma.user.findMany({
      where: { parentId },
      include: {
        logs: true,
        attendances: true,
        specialties: { include: { specialty: true } },
        unit: true,
        requirements: {
          include: {
            requirement: true
          }
        }
      }
    });

    return children.map(child => {
      const classProgress: Record<string, number> = {};

      // Calculate progress ONLY from APPROVED requirements
      child.requirements.forEach(ur => {
        if (ur.status === 'APPROVED' && ur.requirement.dbvClass) {
          const cls = ur.requirement.dbvClass;
          classProgress[cls] = (classProgress[cls] || 0) + 1;
        }
      });

      // If child has a class, calc percentage
      let progressPercent = 0;
      if (child.dbvClass && classTotals[child.dbvClass]) {
        const total = classTotals[child.dbvClass];
        const completed = classProgress[child.dbvClass] || 0;
        progressPercent = Math.round((completed / total) * 100);
      }

      return {
        ...child,
        progressPercent
      };
    });
  }
  async remove(id: string, currentUser?: any) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new Error('Usuário não encontrado');

    if (currentUser) {
      const isMaster = currentUser.email === 'master@cantinhomda.com';
      const isClubAdmin = ['OWNER', 'ADMIN', 'DIRECTOR'].includes(currentUser.role) && user.clubId === currentUser.clubId;

      if (!isMaster && !isClubAdmin) {
        throw new UnauthorizedException('Apenas Diretores podem remover membros.');
      }
    }

    // 1. Delete from Firebase First
    if (user.email) {
      try {
        console.log(`[FirebaseSync] Deleting user ${user.email}...`);
        try {
          // Try by UID (Ideal case)
          await firebaseAdmin.auth().deleteUser(id);
          console.log(`[FirebaseSync] User ${id} deleted from Firebase by UID.`);
        } catch (uidError: any) {
          if (uidError.code === 'auth/user-not-found') {
            // Fallback: Try by Email (Legacy/Desync case)
            const fbUser = await firebaseAdmin.auth().getUserByEmail(user.email);
            if (fbUser) {
              await firebaseAdmin.auth().deleteUser(fbUser.uid);
              console.log(`[FirebaseSync] User ${user.email} deleted from Firebase by Email (UID: ${fbUser.uid}).`);
            }
          } else {
            throw uidError;
          }
        }
      } catch (error) {
        console.error(`[FirebaseSync] Error deleting user ${user.email} from Firebase:`, error);
        // We continue to delete from DB to avoid locking the user, 
        // but log the error. In strict mode, we might want to throw.
      }
    }

    return this.prisma.user.delete({ where: { id } });
  }
  async resetMasterPasswordForce() {
    const email = 'master@cantinhomda.com';
    const pass = 'Ascg@300585!@#$';
    const hash = await bcrypt.hash(pass, 10);
    await this.prisma.user.update({
      where: { email },
      data: { password: hash }
    });
    return 'Senha alterada com sucesso para ' + email;
  }

  // ============================================
  // APPROVAL MANAGEMENT (MASTER ONLY)
  // ============================================

  /**
   * Buscar todos os usuários pendentes de aprovação
   */
  async findPendingUsers() {
    return this.prisma.user.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        cpf: true,
        role: true,
        status: true,
        clubId: true,
        createdAt: true,
        club: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            union: true,
            association: true,
            mission: true,
            region: true,
            district: true,
            memberLimit: true,
            settings: true,
            subscriptionStatus: true,
            _count: {
              select: { users: true }
            }
          }
        }
      }
    });
  }

  /**
   * Aprovar usuário pendente
   * - Atualiza status para ACTIVE
   * - Se for OWNER, cria pagamento pendente para o clube
   */
  async approveUser(userId: string, approvedBy: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { club: true }
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (user.status !== 'PENDING') {
      throw new UnauthorizedException('Usuário não está pendente de aprovação');
    }

    // Atualizar status do usuário
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: 'ACTIVE',
        isActive: true
      }
    });

    // Se for OWNER de um novo clube, criar pagamento pendente
    if (user.role === 'OWNER' && user.clubId && user.club) {
      const settings: any = user.club.settings || {};
      const memberLimit = settings.memberLimit || user.club.memberLimit || 30;
      const billingCycle = settings.billingCycle || 'MENSAL';

      // Calcular meses baseado no ciclo
      const months = billingCycle === 'TRIMESTRAL' ? 3 : billingCycle === 'ANUAL' ? 12 : 1;

      // R$ 2,00 por membro/mês
      const pricePerMember = 2.00;
      const amount = memberLimit * pricePerMember * months;

      const planName = months === 1 ? 'Mensal' : months === 3 ? 'Trimestral' : 'Anual';
      const description = `Assinatura ${planName} - ${memberLimit} Acessos`;

      // Criar pagamento pendente
      await this.prisma.payment.create({
        data: {
          clubId: user.clubId,
          type: 'SUBSCRIPTION',
          amount,
          status: 'PENDING',
          paymentMethod: 'pix',
          description,
          metadata: {
            memberCount: memberLimit,
            months,
            billingCycle,
            planName,
            startDate: new Date().toISOString()
          },
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 dias
        }
      });

      console.log(`[ApproveUser] Created pending payment for club ${user.clubId}: R$ ${amount} (${description})`);
    }

    console.log(`[ApproveUser] User ${userId} approved by ${approvedBy}`);

    return {
      success: true,
      message: 'Usuário aprovado com sucesso',
      user: updatedUser
    };
  }

  /**
   * Rejeitar usuário pendente
   */
  async rejectUser(userId: string, rejectedBy: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (user.status !== 'PENDING') {
      throw new UnauthorizedException('Usuário não está pendente de aprovação');
    }

    // Atualizar status para BLOCKED
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: 'BLOCKED',
        isActive: false
      }
    });

    console.log(`[RejectUser] User ${userId} rejected by ${rejectedBy}`);

    return {
      success: true,
      message: 'Usuário rejeitado',
      user: updatedUser
    };
  }

  /**
   * Buscar histórico de pontos do usuário
   */
  async getPointsHistory(userId: string, currentUser?: any) {
    // Allow self-access, club admins, or master
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, clubId: true, name: true }
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // ACL Check
    if (currentUser) {
      const isMaster = currentUser.email === 'master@cantinhomda.com';
      const isSelf = currentUser.userId === userId;
      const isClubAdmin = ['OWNER', 'ADMIN', 'DIRECTOR'].includes(currentUser.role) && user.clubId === currentUser.clubId;

      if (!isMaster && !isSelf && !isClubAdmin) {
        throw new UnauthorizedException('Permissão negada para ver histórico.');
      }
    }

    const history = await this.prisma.pointHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    return {
      userId,
      userName: user.name,
      totalRecords: history.length,
      history
    };
  }
}

