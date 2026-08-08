import { Module } from '@nestjs/common';
import { ReasonsController }   from '@/runtimes/api/controllers/reasons.controller';
import { ReasonsService }      from './application/use-cases/reasons.service';
import { REASONS_REPOSITORY_PORT } from './domain/repositories/reasons-repository.port';
import { PrismaReasonsRepository } from './infrastructure/repositories/prisma-reasons.repository';

@Module({
  controllers: [ReasonsController],
  providers: [
    ReasonsService,
    { provide: REASONS_REPOSITORY_PORT, useClass: PrismaReasonsRepository },
  ],
})
export class ReasonsModule {}
