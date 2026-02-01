import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0'
    };
  }

  @Get('api')
  getApiInfo() {
    return {
      name: 'CantinhoMDA API',
      version: '1.0.0',
      description: 'Backend API for CantinhoMDA system',
      documentation: '/api/docs',
      health: '/health'
    };
  }


}
