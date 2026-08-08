import { Module }         from '@nestjs/common';
import { MenuController } from '@/runtimes/api/controllers/menu.controller';
import { MenuService }    from './application/use-cases/menu.service';
import { SyncModule }     from '@/modules/sync/sync.module';
import { MENU_REPOSITORY_PORT } from './domain/repositories/menu-repository.port';
import { PrismaMenuRepository } from './infrastructure/repositories/prisma-menu.repository';

@Module({
  imports:     [SyncModule],
  controllers: [MenuController],
  providers: [
    MenuService,
    { provide: MENU_REPOSITORY_PORT, useClass: PrismaMenuRepository },
  ],
  exports: [MenuService],
})
export class MenuModule {}
