import { Inject, Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { TABLE_REPOSITORY_PORT, TableRepositoryPort } from '@/modules/ponto-de-venda/domain/repositories/table-repository.port';
import { RedisService } from '@/shared/infrastructure/cache/redis.service';
import { SyncService }  from '@/modules/sync/application/use-cases/sync.service';
import { uuidv7 }       from 'uuidv7';

const TABLE_TYPES = ['MESA', 'BALCAO', 'MESA_EXTERNA'] as const;
type TableType = (typeof TABLE_TYPES)[number];

// Faixas válidas de número por tipo de mesa
const NUMBER_RANGE: Record<TableType, { min: number; max: number }> = {
  MESA:         { min: 0, max: 100 },
  BALCAO:       { min: 0, max: 10 },
  MESA_EXTERNA: { min: 0, max: 20 },
};

// Deve bater exatamente com o parser de label em frontend/src/pages/Garcom.tsx (tableGroup)
const TYPE_LABEL: Record<TableType, string> = {
  MESA: 'Mesa',
  BALCAO: 'Balcão',
  MESA_EXTERNA: 'Mesa Externa',
};

function buildLabel(type: TableType, number: number): string {
  return `${TYPE_LABEL[type]} ${number}`;
}

function validateTypeAndNumber(type: string, number: number) {
  if (!TABLE_TYPES.includes(type as TableType)) throw new BadRequestException('Tipo de mesa inválido');
  const range = NUMBER_RANGE[type as TableType];
  if (!Number.isInteger(number) || number < range.min || number > range.max) {
    throw new BadRequestException(`Número deve estar entre ${range.min} e ${range.max} para ${TYPE_LABEL[type as TableType]}`);
  }
}

@Injectable()
export class TablesService {
  constructor(
    @Inject(TABLE_REPOSITORY_PORT) private readonly repo: TableRepositoryPort,
    private readonly redis: RedisService,
    private readonly sync:  SyncService,
  ) {}

  async findAll() {
    const cached = await this.redis.getTables();
    if (cached) return cached;
    const tables = await this.repo.findAll();
    await this.redis.cacheTables(tables);
    return tables;
  }

  async create(dto: { type: string; number: number; capacity?: number }) {
    validateTypeAndNumber(dto.type, dto.number);
    const existing = await this.repo.findByTypeAndNumber(dto.type, dto.number);
    if (existing) throw new ConflictException(`${buildLabel(dto.type as TableType, dto.number)} já cadastrada`);

    const table = await this.repo.create({
      id:       uuidv7(),
      type:     dto.type,
      number:   dto.number,
      label:    buildLabel(dto.type as TableType, dto.number),
      capacity: dto.capacity,
    });
    await this.redis.invalidateTables();
    await this.sync.enqueue('table.created', 'Table', table.id, table);
    return table;
  }

  async update(id: string, dto: Partial<{ type: string; number: number; capacity: number }>) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException(`Mesa ${id} não encontrada`);

    const nextType   = dto.type   ?? existing.type;
    const nextNumber = dto.number ?? existing.number;
    if (dto.type !== undefined || dto.number !== undefined) {
      validateTypeAndNumber(nextType, nextNumber);
      if (nextType !== existing.type || nextNumber !== existing.number) {
        const conflict = await this.repo.findByTypeAndNumber(nextType, nextNumber);
        if (conflict && conflict.id !== id) throw new ConflictException(`${buildLabel(nextType as TableType, nextNumber)} já cadastrada`);
      }
    }

    const table = await this.repo.update(id, {
      ...(dto.type !== undefined     && { type: dto.type }),
      ...(dto.number !== undefined   && { number: dto.number }),
      ...(dto.capacity !== undefined && { capacity: dto.capacity }),
      ...((dto.type !== undefined || dto.number !== undefined) && { label: buildLabel(nextType as TableType, nextNumber) }),
    });
    await this.redis.invalidateTables();
    return table;
  }
}
