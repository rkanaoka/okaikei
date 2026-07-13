import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { uuidv7 } from 'uuidv7';
import {
  TEMPLATE_TYPES, TEMPLATE_LABELS, DEFAULT_CONFIGS, DEFAULT_ENABLED,
  isTemplateType, TemplateType,
} from './print-template-defaults';

@Injectable()
export class PrintTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  private merge(type: TemplateType, row: { enabled: boolean; config: any } | null) {
    return {
      type,
      label:   TEMPLATE_LABELS[type],
      enabled: row?.enabled ?? DEFAULT_ENABLED[type],
      config:  { ...DEFAULT_CONFIGS[type], ...(row?.config as object ?? {}) },
    };
  }

  async list() {
    const rows = await this.prisma.printTemplate.findMany();
    const byType = new Map(rows.map((r) => [r.type, r]));
    return TEMPLATE_TYPES.map((t) => this.merge(t, byType.get(t) ?? null));
  }

  async get(type: string) {
    if (!isTemplateType(type)) throw new BadRequestException(`Tipo de modelo inválido: ${type}`);
    const row = await this.prisma.printTemplate.findUnique({ where: { type } });
    return this.merge(type, row);
  }

  async update(type: string, dto: { enabled?: boolean; config?: Record<string, any> }) {
    if (!isTemplateType(type)) throw new BadRequestException(`Tipo de modelo inválido: ${type}`);
    const current = await this.get(type);
    const nextConfig  = { ...current.config, ...(dto.config ?? {}) };
    const nextEnabled = dto.enabled ?? current.enabled;

    const row = await this.prisma.printTemplate.upsert({
      where:  { type },
      update: { enabled: nextEnabled, config: nextConfig },
      create: { id: uuidv7(), type, enabled: nextEnabled, config: nextConfig },
    });
    return this.merge(type, row);
  }

  async reset(type: string) {
    if (!isTemplateType(type)) throw new BadRequestException(`Tipo de modelo inválido: ${type}`);
    const row = await this.prisma.printTemplate.upsert({
      where:  { type },
      update: { enabled: DEFAULT_ENABLED[type], config: DEFAULT_CONFIGS[type] },
      create: { id: uuidv7(), type, enabled: DEFAULT_ENABLED[type], config: DEFAULT_CONFIGS[type] },
    });
    return this.merge(type, row);
  }

  // Usado internamente pelo PrintingService — sempre retorna um config completo (com defaults aplicados)
  async getEffective(type: TemplateType) {
    return this.get(type);
  }
}
