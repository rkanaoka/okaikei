import { Module } from '@nestjs/common';
import { OptionGroupsController } from './option-groups.controller';
import { OptionGroupsService } from './option-groups.service';

@Module({
  controllers: [OptionGroupsController],
  providers:   [OptionGroupsService],
})
export class OptionGroupsModule {}
