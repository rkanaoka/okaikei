import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { PRINT_TEMPLATE_REPOSITORY_PORT, PrintTemplateRepositoryPort } from '@/modules/print-templates/domain/repositories/print-template-repository.port';
import {
  TEMPLATE_TYPES, TEMPLATE_LABELS, DEFAULT_CONFIGS, DEFAULT_ENABLED,
  isTemplateType, TemplateType,
} from './print-template-defaults';

@Injectable()
export class PrintTemplatesService {
  constructor(
    @Inject(PRINT_TEMPLATE_REPOSITORY_PORT) private readonly repo: PrintTemplateRepositoryPort,
  ) {}

  private merge(type: TemplateType, row: { enabled: boolean; config: any } | null) {
    return {
      type,
      label:   TEMPLATE_LABELS[type],
      enabled: row?.enabled ?? DEFAULT_ENABLED[type],
      config:  { ...DEFAULT_CONFIGS[type], ...(row?.config as object ?? {}) },
    };
  }

  async list() {
    const rows   = await this.repo.findAll();
    const byType = new Map(rows.map((r) => [r.type, r]));
    return TEMPLATE_TYPES.map((t) => this.merge(t, byType.get(t) ?? null));
  }

  async get(type: string) {
    if (!isTemplateType(type)) throw new BadRequestException(`Tipo de modelo inválido: ${type}`);
    const row = await this.repo.findByType(type);
    return this.merge(type as TemplateType, row);
  }

  async update(type: string, dto: { enabled?: boolean; config?: Record<string, any> }) {
    if (!isTemplateType(type)) throw new BadRequestException(`Tipo de modelo inválido: ${type}`);
    const current    = await this.get(type);
    const nextConfig  = { ...current.config, ...(dto.config ?? {}) };
    const nextEnabled = dto.enabled ?? current.enabled;
    const row = await this.repo.upsert(type, { enabled: nextEnabled, config: nextConfig });
    return this.merge(type as TemplateType, row);
  }

  async reset(type: string) {
    if (!isTemplateType(type)) throw new BadRequestException(`Tipo de modelo inválido: ${type}`);
    const row = await this.repo.upsert(type, { enabled: DEFAULT_ENABLED[type as TemplateType], config: DEFAULT_CONFIGS[type as TemplateType] });
    return this.merge(type as TemplateType, row);
  }

  async getEffective(type: TemplateType) {
    return this.get(type);
  }
}
