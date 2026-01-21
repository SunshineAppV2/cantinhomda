import { Injectable, UnauthorizedException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ClubsService } from '../clubs/clubs.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from '../users/dto/create-user.dto';
import * as admin from 'firebase-admin';
import { toDataURL } from 'qrcode';

import { authenticator } from 'otplib';
import { jwtConstants } from './constants';

// Initialize Firebase Admin (Lazy)
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault()
    });
  } catch (e) {
    console.warn("Firebase Admin Init Failed (Auto):", e.message);
  }
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private clubsService: ClubsService,
    private jwtService: JwtService,
  ) { }

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findOneByEmail(email);

    if (user && (await bcrypt.compare(pass, user.password))) {
      if (user.status === 'BLOCKED') {
        throw new UnauthorizedException('Sua conta foi bloqueada. Entre em contato com a diretoria.');
      }
      if (user.status === 'PENDING') {
        throw new UnauthorizedException('Seu cadastro aguarda aprovação da diretoria.');
      }
      if (user.isActive === false) {
        throw new UnauthorizedException('Sua conta está inativa.');
      }

      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    let club: any = null;
    if (user.clubId) {
      try {
        club = await this.clubsService.getClubStatus(user.clubId);

        let isOverdue = club?.subscriptionStatus === 'OVERDUE' || club?.subscriptionStatus === 'CANCELED';

        if (!isOverdue && club?.nextBillingDate) {
          const today = new Date();
          const billingDate = new Date(club.nextBillingDate);
          const gracePeriod = (club.gracePeriodDays && !isNaN(Number(club.gracePeriodDays))) ? Number(club.gracePeriodDays) : 0;

          const cutoffDate = new Date(billingDate);
          cutoffDate.setDate(cutoffDate.getDate() + gracePeriod);

          if (today > cutoffDate) {
            isOverdue = true;
          }
        }

        if (isOverdue) {
          const allowedRoles = ['OWNER', 'ADMIN', 'MASTER', 'DIRECTOR'];
          if (!allowedRoles.includes(user.role)) {
            throw new Error('SUBSCRIPTION_OVERDUE');
          }
        }
      } catch (error) {
        if (error.message === 'SUBSCRIPTION_OVERDUE') {
          throw new UnauthorizedException('O acesso deste clube está suspenso. Contate a direção.');
        }
      }
    }

    // --- MFA CHECK ---
    const userAny = user as any;
    if (userAny.isMfaEnabled) {
      return {
        mfaRequired: true,
        tempToken: this.jwtService.sign({ sub: user.id, email: user.email, isMfaPending: true }, { expiresIn: '5m' })
      };
    }

    const payload = {
      email: user.email,
      sub: user.id,
      clubId: user.clubId,
      unitId: user.unitId,
      role: user.role,
      union: user.union || (club as any)?.union,
      association: user.association || (club as any)?.association,
      mission: user.mission || (club as any)?.mission,
      region: user.region || (club as any)?.region,
      district: user.district || (club as any)?.district
    };

    if (!user.clubId && (user.role === 'DIRECTOR' || user.role === 'OWNER')) {
      console.warn(`[AuthService.login] ⚠️ WARNING: DIRECTOR/OWNER ${user.email} has NO ClubID! Functionality will be limited.`);
    }

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        clubId: user.clubId,
        unitId: user.unitId,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        union: user.union || (club as any)?.union,
        association: user.association || (club as any)?.association,
        mission: user.mission || (club as any)?.mission,
        region: user.region || (club as any)?.region,
        district: user.district || (club as any)?.district
      }
    };
  }

  // --- MFA METHODS ---
  async generateMfaSecret(email: string) {
    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(email, 'CantinhoMDA', secret);
    const qrCodeUrl = await toDataURL(otpauthUrl);
    return { secret, qrCodeUrl };
  }

  verifyMfaCode(code: string, secret: string) {
    try {
      return authenticator.verify({ token: code, secret });
    } catch (e) {
      return false;
    }
  }

  async enableMfa(userId: string, secret: string) {
    return this.usersService.update(userId, {
      mfaSecret: secret,
      isMfaEnabled: true
    } as any);
  }



  async validateMfaLogin(tempToken: string, code: string) {
    try {
      console.log(`[MFA] Validate Request. TokenPrefix: ${tempToken?.substring(0, 15)}... Code: ${code}`);

      if (!tempToken) {
        throw new UnauthorizedException('Token MFA não fornecido.');
      }

      // Check format (basic debugging)
      const parts = tempToken.split('.');
      if (parts.length !== 3) {
        console.error(`[MFA] Malformed Token. Parts: ${parts.length}`);
        throw new UnauthorizedException('Token malformado.');
      }

      // Decode without verification to inspect header
      const decodedUnverified = this.jwtService.decode(tempToken, { complete: true }) as any;
      console.log(`[MFA] Token Header Strategy: ${decodedUnverified?.header?.alg}`);

      let decoded: any;
      try { // Trust the global module configuration
        decoded = this.jwtService.verify(tempToken);
      } catch (innerVerifyErr: any) {
        console.warn(`[MFA] Standard verify failed: ${innerVerifyErr.message}. Retrying with explicit secret fallback.`);
        // Fallback manual just in case global injection is somehow acting up
        try {
          decoded = this.jwtService.verify(tempToken, { secret: jwtConstants.secret });
        } catch (fallbackErr) {
          console.error(`[MFA] Fallback also failed: ${fallbackErr.message}`);
          throw innerVerifyErr; // Throw original error
        }
      }

      console.log(`[MFA] Token Verified. Payload:`, JSON.stringify(decoded));

      if (!decoded.isMfaPending) {
        console.warn('[MFA] Token is not a pending MFA token.');
        throw new UnauthorizedException('Token inválido (não é pendente).');
      }

      const user = await this.usersService.findOne(decoded.sub);
      const userAny = user as any;

      if (!user || !userAny.isMfaEnabled || !userAny.mfaSecret) {
        console.warn('[MFA] User not ready for MFA validation.');
        throw new UnauthorizedException('MFA não configurado para este usuário.');
      }

      const isValid = this.verifyMfaCode(code, userAny.mfaSecret);
      if (!isValid) {
        console.warn(`[MFA] Code invalid. User: ${user.email}`);
        throw new UnauthorizedException('Código inválido. Tente novamente.');
      }

      let club: any = {};
      if (user.clubId) {
        try {
          club = await this.clubsService.findOne(user.clubId);
        } catch (e) { }
      }

      const payload = {
        email: user.email,
        sub: user.id,
        clubId: user.clubId,
        unitId: user.unitId,
        role: user.role,
        union: user.union || club?.union,
        association: user.association || club?.association,
        mission: user.mission || club?.mission,
        region: user.region || club?.region,
        district: user.district || club?.district
      };

      return {
        access_token: this.jwtService.sign(payload),
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          clubId: user.clubId,
          role: user.role,
          unitId: user.unitId
        }
      };
    } catch (e) {
      console.error(`[MFA] CRITICAL ERROR:`, e);
      // Ensure we return 401 so frontend handles it
      if (e instanceof UnauthorizedException) throw e;
      throw new UnauthorizedException(`MFA Fail: ${e.message}`);
    }
  }

  async register(createUserDto: CreateUserDto & { referralCode?: string }) {
    const existingUser = await this.usersService.findOneByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('Este e-mail já está cadastrado no sistema.');
    }

    if (!createUserDto.clubId && !createUserDto.clubName) {
      throw new BadRequestException('Você deve informar o nome do clube ou selecionar um clube existente.');
    }

    let clubId = createUserDto.clubId;
    let role = createUserDto.role || 'PATHFINDER';
    let status = 'PENDING';
    let wasNewClubCreated = false;

    if (!clubId && createUserDto.clubName) {
      if (!createUserDto.region || !createUserDto.mission || !createUserDto.union) {
        throw new BadRequestException('Dados hierárquicos incompletos (União, Associação, Região são obrigatórios).');
      }

      let referrerClubId: string | undefined = undefined;
      if (createUserDto.referralCode) {
        try {
          referrerClubId = await this.clubsService.resolveReferralCode(createUserDto.referralCode) || undefined;
        } catch (err) { }
      }

      try {
        const newClub = await this.clubsService.create({
          name: createUserDto.clubName,
          region: createUserDto.region,
          district: createUserDto.district,
          mission: createUserDto.mission,
          union: createUserDto.union,
          referrerClubId: referrerClubId,
          phoneNumber: createUserDto.mobile,
          settings: {
            billingCycle: createUserDto.paymentPeriod || 'MENSAL',
            memberLimit: parseInt(String(createUserDto.clubSize || '30'))
          }
        });

        clubId = newClub.id;
        wasNewClubCreated = true;
        role = 'OWNER';
        status = 'PENDING';
      } catch (clubError) {
        throw new BadRequestException(`Falha ao criar clube: ${clubError.message}`);
      }
    }

    try {
      const user = await this.usersService.create({
        ...createUserDto,
        password: createUserDto.password,
        clubId: clubId!,
        role: role as any,
        status: status,
        isActive: false
      });

      return {
        success: true,
        message: 'Cadastro realizado com sucesso! Aguardando aprovação da diretoria.',
        user: {
          id: user.id,
          email: user.email,
          status: user.status,
          clubId: user.clubId,
          role: user.role
        }
      };

    } catch (userError) {
      if (wasNewClubCreated && clubId) {
        await this.clubsService.delete(clubId).catch(console.error);
      }
      if (userError.code === 'P2002') {
        throw new ConflictException('Este e-mail ou CPF já está cadastrado.');
      }
      throw new BadRequestException(`Falha no registro: ${userError.message}`);
    }
  }

  async syncWithFirebase(idToken: string) {
    try {
      if (!admin.apps.length) {
        throw new UnauthorizedException('Firebase Admin not configured on Backend.');
      }
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const { uid, email } = decodedToken;

      if (!email) throw new UnauthorizedException('Email not found in token.');

      let user = await this.usersService.findOneByEmail(email);

      if (user) {
        return this.login(user);
      }

      throw new UnauthorizedException('CONTA_NAO_ENCONTRADA_BACKEND');

    } catch (e) {
      if (e.message === 'CONTA_NAO_ENCONTRADA_BACKEND') {
        throw new UnauthorizedException('CONTA_INCOMPLETA');
      }
      throw new UnauthorizedException('Falha ao validar login com Google.');
    }
  }

  async refreshToken(userId: string) {
    const user = await this.usersService.findOne(userId);
    if (!user) throw new UnauthorizedException('Usuário não encontrado');
    return this.login(user);
  }

  async fixSunshineUser() {
    let club = await this.clubsService.search('Sunshine').then(res => res[0]);
    if (!club) {
      club = await this.clubsService.create({
        name: 'Clube Sunshine',
        region: '1ª Região',
        mission: 'MOPa',
        union: 'UNB',
        district: 'Central',
        settings: { memberLimit: 50 },
        phoneNumber: '5591983292005'
      });
    }

    const email = 'aseabra2005@gmail.com';
    const pass = 'Ascg@300585!@#$';
    const hashedPassword = await bcrypt.hash(pass, 10);

    let user = await this.usersService.findOneByEmail(email);

    if (user) {
      await this.usersService.update(user.id, {
        clubId: club.id,
        role: 'OWNER',
        password: hashedPassword,
        isActive: true,
        status: 'ACTIVE'
      });
    } else {
      user = await this.usersService.create({
        email,
        name: 'Alex Seabra',
        password: pass,
        role: 'OWNER',
        clubId: club.id,
        status: 'ACTIVE',
        isActive: true,
        mobile: '5591983292005'
      });
    }
    return { message: 'User aseabra2005 associated to Sunshine successfully.', clubId: club.id };
  }

  async fixMasterUser() {
    const email = 'master@cantinhodbv.com';
    let club = await this.clubsService.search('Clube Master').then(res => res[0]);

    if (!club) {
      club = await this.clubsService.create({
        name: 'Clube Master',
        region: '1ª Região',
        mission: 'MOPa',
        union: 'UNB',
        district: 'Central',
        settings: { memberLimit: 100 },
        phoneNumber: '000000000'
      });
    }

    const user = await this.usersService.findOneByEmail(email);
    if (user) {
      await this.usersService.update(user.id, {
        clubId: club.id,
        role: 'OWNER',
        isActive: true,
        status: 'ACTIVE'
      });
      return { success: true, message: `Master user fixed and linked to club ${club.id}` };
    }
    return { success: false, message: 'Master user not found' };
  }
}
