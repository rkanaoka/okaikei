import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService }  from '@/common/redis/redis.service';
import { SyncService }   from '@/modules/sync/sync.service';
import { uuidv7 }        from 'uuidv7';

@Injectable()
export class TablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis:  RedisService,
    private readonly sync:   SyncService,
  ) {}

  async findAll() {
    const cached = await this.redis.getTables();
    if (cached) return cached;
    const tables = await this.prisma.table.findMany({
      include: { comandas: { where: { status: { in: ['OPEN', 'PREPARING'] } } } },
      orderBy: { number: 'asc' },
    });
    await this.redis.cacheTables(tables);
    return tables;
  }

  async create(dto: { number: number; label: string; capacity?: number }) {
    const table = await this.prisma.table.create({
      data: { id: uuidv7(), ...dto },
    });
    await this.redis.invalidateTables();
    await this.sync.enqueue('table.created', 'Table', table.id, table);
    return table;
  }

  async update(id: string, dto: Partial<{ label: string; capacity: number }>) {
    const table = await this.prisma.table.update({ where: { id }, data: dto });
    await this.redis.invalidateTables();
    return table;
  }
}
