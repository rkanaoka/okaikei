import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { CardapioDigitalService }    from './application/use-cases/cardapio-digital.service';
import { CardapioDigitalSettingsService } from './application/use-cases/cardapio-digital-settings.service';
import { CardapioPublicoController } from '@/runtimes/api/controllers/cardapio-publico.controller';
import { CardapioDigitalAdminController } from '@/runtimes/api/controllers/cardapio-digital-admin.controller';

@Module({
  imports: [AuthModule],
  controllers: [CardapioPublicoController, CardapioDigitalAdminController],
  providers: [CardapioDigitalService, CardapioDigitalSettingsService],
})
export class CardapioDigitalModule {}
