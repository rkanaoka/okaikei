import { Module } from '@nestjs/common';
import { VouchersController }   from '@/runtimes/api/controllers/vouchers.controller';
import { VouchersService }      from './application/use-cases/vouchers.service';
import { VOUCHER_REPOSITORY_PORT }   from './domain/repositories/voucher-repository.port';
import { PrismaVoucherRepository }   from './infrastructure/repositories/prisma-voucher.repository';

@Module({
  controllers: [VouchersController],
  providers: [
    VouchersService,
    { provide: VOUCHER_REPOSITORY_PORT, useClass: PrismaVoucherRepository },
  ],
})
export class VouchersModule {}
