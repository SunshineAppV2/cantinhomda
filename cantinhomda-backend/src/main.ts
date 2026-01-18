import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    // Force HTTPS in production
    if (process.env.NODE_ENV === 'production') {
        app.use((req, res, next) => {
            if (req.header('x-forwarded-proto') !== 'https') {
                res.redirect(`https://${req.header('host')}${req.url}`);
            } else {
                next();
            }
        });
    }

    // MANUAL CORS MIDDLEWARE (Nuclear Option)
    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
        res.header('Access-Control-Allow-Credentials', 'true');

        if (req.method === 'OPTIONS') {
            res.sendStatus(200);
        } else {
            next();
        }
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

    // DISABLED TEMPORARILY FOR DEBUGGING
    // app.useGlobalGuards(new RateLimitGuard(app.get(Reflector)));
    // app.useGlobalInterceptors(new AuditInterceptor(app.get(PrismaService)));


    // Global Rate Limiting Guard
    app.useGlobalGuards(new RateLimitGuard(app.get(Reflector)));

    // Global Audit Interceptor (registra todas as ações de modificação)
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

    await app.listen(process.env.PORT || 3000);
    console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
