import { Module }         from '@nestjs/common';
import { MenuController } from './menu.controller';
import { MenuService }    from './menu.service';
import { SyncModule }     from '@/modules/sync/sync.module';

@Module({
  imports:     [SyncModule],
  controllers: [MenuController],
  providers:   [MenuService],
  exports:     [MenuService],
})
export class MenuModule {}
