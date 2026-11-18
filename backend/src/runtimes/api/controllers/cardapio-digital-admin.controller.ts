import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import {
  CardapioDigitalSettingsService,
  DigitalMenuSettings,
} from '@/modules/cardapio-digital/application/use-cases/cardapio-digital-settings.service';
import { JwtAuthGuard } from '@/modules/auth/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermission } from '@/modules/auth/infrastructure/guards/permissions.guard';

/** Admin > Cardápio > Cardápio digital — vitrine do cardapio-app (boas-vindas, ofertas, destaques...). */
@Controller('cardapio-digital')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('cardapio')
export class CardapioDigitalAdminController {
  constructor(private readonly settings: CardapioDigitalSettingsService) {}

  @Get('settings')
  get() {
    return this.settings.getForAdmin();
  }

  @Put('settings')
  save(@Body() body: Partial<DigitalMenuSettings>) {
    return this.settings.save(body);
  }
}
