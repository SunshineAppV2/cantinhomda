import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { RateLimitGuard } from './common/guards/rate-limit.guard';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { PrismaService } from './prisma/prisma.service';
import { Reflector } from '@nestjs/core';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { join } from 'path';
import './firebase-admin'; // Initialize Firebase


async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    // Configuração para Proxy (Render, etc) - Importante para Rate Limiting funcionar por IP real
    app.set('trust proxy', 1);

    // Serve Static Assets (Uploads)
    // Using process.cwd() is safer usually if running from root
    app.useStaticAssets(join(process.cwd(), 'uploads'), {
        prefix: '/uploads/',
    });

    // Security Headers (Helmet.js) WITH宽松 CORS policy
    app.use(helmet({
        crossOriginResourcePolicy: false,
        crossOriginOpenerPolicy: false,
        crossOriginEmbedderPolicy: false,
    }));

    // Force HTTPS in production (Skip for Health Checks to prevent Render Timeouts)
    if (process.env.NODE_ENV === 'production') {
        app.use((req, res, next) => {
            const isHealthCheck = req.path === '/' || req.path === '/health' || req.path.startsWith('/api');
            if (req.header('x-forwarded-proto') !== 'https' && !isHealthCheck) {
                res.redirect(`https://${req.header('host')}${req.url}`);
            } else {
                next();
            }
        });
    }

    // Rate Limiting
    app.use(
        rateLimit({
            windowMs: 1 * 60 * 1000,
            max: 1000,
            standardHeaders: true,
            legacyHeaders: false,
        }),
    );

    // Definitive CORS Configuration
    app.enableCors({
        origin: (requestOrigin, callback) => {
            // Allow all origins (standard approach for public/semi-public APIs)
            // requestOrigin is null for server-to-server or tools like Postman
            callback(null, true);
        },
        allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'Origin'],
        exposedHeaders: ['Content-Range', 'X-Content-Range'],
        methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
        credentials: true,
        maxAge: 3600,
        optionsSuccessStatus: 200,
    });

    // Global Validation Pipe
    app.useGlobalPipes(new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
    }));

    // Global Guards and Interceptors
    app.useGlobalGuards(new RateLimitGuard(app.get(Reflector)));
    app.useGlobalInterceptors(new AuditInterceptor(app.get(PrismaService)));

    // Swagger Documentation
    const config = new DocumentBuilder()
        .setTitle('CantinhoMDA API')
        .setDescription('API documentation for CantinhoMDA system')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    await app.listen(process.env.PORT || 3000, '0.0.0.0');
    console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
