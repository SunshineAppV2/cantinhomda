import { Body, Controller, Post, HttpCode, HttpStatus, UnauthorizedException, Get, UseGuards, Req, Headers } from '@nestjs/common';
import { AuthService } from './auth.service';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { JwtAuthGuard } from './jwt-auth.guard';
import * as admin from 'firebase-admin';

class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async signIn(@Body() signInDto: LoginDto) {
    const user = await this.authService.validateUser(signInDto.email, signInDto.password);

    if (!user) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }

    return this.authService.login(user);
  }

  // IMPORTANT: This route does NOT use JwtAuthGuard
  // We manually validate the Firebase token instead (if available)
  @Post('register')
  async register(
    @Headers('authorization') authorization: string,
    @Body() createUserDto: any
  ) {
    console.log('[AuthController] ============ /register called ============');
    console.log('[AuthController] Body received:', JSON.stringify(createUserDto, null, 2));
    console.log('[AuthController] Authorization header present:', !!authorization);

    // Try to validate Firebase token if provided, but don't fail if Firebase Admin is not configured
    // This allows the system to work purely with Postgres if needed
    try {
      if (authorization && authorization.startsWith('Bearer ')) {
        const token = authorization.split('Bearer ')[1];
        console.log('[AuthController] Token extracted, attempting Firebase validation...');

        // Check if Firebase Admin is initialized
        if (admin.apps.length > 0) {
          try {
            const decodedToken = await admin.auth().verifyIdToken(token);
            const { uid, email } = decodedToken;
            console.log(`[AuthController] ✅ Firebase token valid for: ${email} (UID: ${uid})`);

            // Pass validated data to service
            const dataToRegister = {
              ...createUserDto,
              uid,
              email: email || createUserDto.email,
            };

            const result = await this.authService.register(dataToRegister);
            console.log('[AuthController] ✅ Registration SUCCESS with Firebase validation');
            return result;
          } catch (tokenError: any) {
            console.warn('[AuthController] Firebase token validation failed:', tokenError.message);
            // Continue without Firebase validation
          }
        } else {
          console.warn('[AuthController] Firebase Admin not initialized');
        }
      }
    } catch (fbError: any) {
      console.warn('[AuthController] Firebase validation error (non-critical):', fbError.message);
      // Continue without Firebase validation
    }

    // Proceed with registration without Firebase validation
    // This is the standard path when Firebase Admin is not configured
    console.log('[AuthController] Proceeding with registration (Postgres-only mode)');
    try {
      const result = await this.authService.register(createUserDto);
      console.log('[AuthController] ✅ Registration SUCCESS (Postgres-only)');
      return result;
    } catch (error: any) {
      console.error('[AuthController] ❌ Registration error:', error.message, error.stack);
      throw error;
    }
  }

  @Post('sync')
  async sync(@Body('idToken') idToken: string) {
    return this.authService.syncWithFirebase(idToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('refresh')
  async refresh(@Req() req: any) {
    return this.authService.refreshToken(req.user.userId);
  }

  @Post('fix-sunshine')
  async fixSunshine() {
    return this.authService.fixSunshineUser();
  }
}
