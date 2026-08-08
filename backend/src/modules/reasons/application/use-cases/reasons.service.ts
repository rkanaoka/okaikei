import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { REASONS_REPOSITORY_PORT, ReasonsRepositoryPort } from '@/modules/reasons/domain/repositories/reasons-repository.port';
import { uuidv7 } from 'uuidv7';

@Injectable()
export class ReasonsService {
  constructor(
    @Inject(REASONS_REPOSITORY_PORT) private readonly repo: ReasonsRepositoryPort,
  ) {}

  // ── Motivos de Cancelamento ──────────────────────────────────────────────

  async listCancellationReasons() {
    const [reasons, counts] = await Promise.all([
      this.repo.findAllCancellationReasons(),
      this.repo.findCancellationUsageCounts(),
    ]);
    const countMap = new Map(counts.map((c) => [c.reasonId, c.count]));
    return reasons.map((r) => ({ ...r, usageCount: countMap.get(r.id) ?? 0 }));
  }

  async createCancellationReason(dto: { label: string }) {
    if (!dto.label?.trim()) throw new BadRequestException('Nome do motivo é obrigatório');
    return this.repo.createCancellationReason({ id: uuidv7(), label: dto.label.trim() });
  }

  async listCancellationHistory() {
    return this.repo.findCancellationHistory();
  }

  // ── Motivos de Desconto ──────────────────────────────────────────────────

  async listDiscountReasons() {
    return this.repo.findAllDiscountReasons();
  }

  async createDiscountReason(dto: { label: string; type: 'percent' | 'fixed'; value: number }) {
    if (!dto.label?.trim()) throw new BadRequestException('Nome do motivo é obrigatório');
    if (!dto.value || dto.value <= 0) throw new BadRequestException('Valor inválido');
    if (dto.type !== 'percent' && dto.type !== 'fixed') throw new BadRequestException('Tipo inválido');
    return this.repo.createDiscountReason({ id: uuidv7(), label: dto.label.trim(), type: dto.type, value: dto.value });
  }
}
