import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TABLE_REPOSITORY_PORT, TableRepositoryPort } from '@/modules/ponto-de-venda/domain/repositories/table-repository.port';
import { RedisService } from '@/shared/infrastructure/cache/redis.service';
import { SyncService }  from '@/modules/sync/application/use-cases/sync.service';
import { uuidv7 }       from 'uuidv7';

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

  async create(dto: { number: number; label: string; capacity?: number }) {
    const table = await this.repo.create({ id: uuidv7(), ...dto });
    await this.redis.invalidateTables();
    await this.sync.enqueue('table.created', 'Table', table.id, table);
    return table;
  }

  async update(id: string, dto: Partial<{ label: string; capacity: number }>) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException(`Mesa ${id} não encontrada`);
    const table = await this.repo.update(id, dto);
    await this.redis.invalidateTables();
    return table;
  }
}
