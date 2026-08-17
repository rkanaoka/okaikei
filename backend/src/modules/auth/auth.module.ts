import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { USER_REPOSITORY_PORT } from './domain/repositories/user-repository.port';
import { PrismaUserRepository } from './infrastructure/repositories/prisma-user.repository';
import { FirebaseAdminProvider } from './infrastructure/firebase-admin.provider';
import { AuthService } from './application/use-cases/auth.service';
import { UsersService } from './application/use-cases/users.service';

import { AuthController } from '@/runtimes/api/controllers/auth.controller';
import { UsersController } from '@/runtimes/api/controllers/users.controller';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN ?? '12h' },
    }),
  ],
  controllers: [AuthController, UsersController],
  providers: [
    AuthService,
    UsersService,
    FirebaseAdminProvider,
    { provide: USER_REPOSITORY_PORT, useClass: PrismaUserRepository },
  ],
  exports: [JwtModule],
})
export class AuthModule {}
