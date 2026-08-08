import { Module } from '@nestjs/common';
import { OptionGroupsController }   from '@/runtimes/api/controllers/option-groups.controller';
import { OptionGroupsService }      from './application/use-cases/option-groups.service';
import { OPTION_GROUP_REPOSITORY_PORT } from './domain/repositories/option-group-repository.port';
import { PrismaOptionGroupRepository }  from './infrastructure/repositories/prisma-option-group.repository';

@Module({
  controllers: [OptionGroupsController],
  providers: [
    OptionGroupsService,
    { provide: OPTION_GROUP_REPOSITORY_PORT, useClass: PrismaOptionGroupRepository },
  ],
})
export class OptionGroupsModule {}
