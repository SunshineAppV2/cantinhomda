import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import { ValidationPipe } from '@nestjs/common';
import express from 'express';
import helmet from 'helmet';

// Configuração para Vercel Serverless
const server = express();

let appPromise: Promise<any>;

async function bootstrap() {
    const app = await NestFactory.create(
        AppModule,
        new ExpressAdapter(server),
    );

    // Security Headers
    app.use(helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" },
    }));

    // CORS
    app.enableCors({
        origin: true,
        credentials: true,
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    });

    // Validation
    app.useGlobalPipes(new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: false,
    }));

    await app.init();
    return app;
}

export default async (req: any, res: any) => {
    if (!appPromise) {
        appPromise = bootstrap();
    }
    await appPromise;
    server(req, res);
};
