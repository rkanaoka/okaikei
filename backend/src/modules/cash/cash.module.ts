import { Module } from '@nestjs/common';
import { CashController }       from '@/runtimes/api/controllers/cash.controller';
import { CashService }          from './application/use-cases/cash.service';
import { CASH_REPOSITORY_PORT } from './domain/repositories/cash-repository.port';
import { PrismaCashRepository } from './infrastructure/repositories/prisma-cash.repository';

@Module({
  controllers: [CashController],
  providers: [
    CashService,
    { provide: CASH_REPOSITORY_PORT, useClass: PrismaCashRepository },
  ],
  exports: [CashService],
})
export class CashModule {}
