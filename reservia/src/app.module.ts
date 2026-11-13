import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { UsersModule } from './users/users.module.js';
import { LocationsModule } from './locations/locations.module.js';
import { ResourcesModule } from './resources/resources.module.js';
import { AuthModule } from './auth/auth.module.js';
import { envValidationSchema } from './config/env.validation.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware.js';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware.js';
import { SeatsModule } from './seats/seats.module.js';
import { HoldsModule } from './holds/holds.module.js';
import { BookingsModule } from './bookings/bookings.module.js';
import { TicketsModule } from './tickets/tickets.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { AuditModule } from './audit/audit.module.js';
import { AuditInterceptor } from './audit/audit.interceptor.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.getOrThrow<string>('DATABASE_HOST'),
        port: Number(configService.getOrThrow('DATABASE_PORT')),
        username: configService.getOrThrow<string>('DATABASE_USERNAME'),
        password: configService.getOrThrow<string>('DATABASE_PASSWORD'),
        database: configService.getOrThrow<string>('DATABASE_NAME'),
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
    UsersModule,
    LocationsModule,
    ResourcesModule,
    AuthModule,
    SeatsModule,
    HoldsModule,
    BookingsModule,
    TicketsModule,
    PaymentsModule,
    AuditModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware, RequestLoggerMiddleware).forRoutes('*');
  }
}