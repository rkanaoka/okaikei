import { Inject, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { GARCOM_REPOSITORY_PORT, GarcomRepositoryPort } from '@/modules/ponto-de-venda/domain/repositories/garcom-repository.port';
import { uuidv7 } from 'uuidv7';
import { randomInt } from 'crypto';

function generateCode(): string {
  return String(randomInt(0, 1000)).padStart(3, '0');
}

@Injectable()
export class GarconsService {
  constructor(
    @Inject(GARCOM_REPOSITORY_PORT) private readonly repo: GarcomRepositoryPort,
  ) {}

  async list() {
    return this.repo.findAll();
  }

  async findByCode(rawCode: string) {
    const code = rawCode.trim().padStart(3, '0');
    const garcom = await this.repo.findByCode(code);
    if (!garcom || !garcom.active) throw new NotFoundException('Garçom não encontrado');
    return { id: garcom.id, code: garcom.code, name: garcom.name };
  }

  async create(dto: { name: string; userId?: string | null }) {
    if (!dto.name?.trim()) throw new BadRequestException('Nome do garçom é obrigatório');
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        return await this.repo.create({
          id:     uuidv7(),
          code:   generateCode(),
          name:   dto.name.trim(),
          userId: dto.userId || null,
        });
      } catch (e: any) {
        if (e.code === 'P2002' && attempt < 4) continue;
        throw e;
      }
    }
    throw new BadRequestException('Não foi possível gerar um código único para o garçom');
  }

  async update(id: string, dto: Partial<{ name: string; userId: string | null; active: boolean }>) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('Garçom não encontrado');
    if (dto.name !== undefined && !dto.name.trim()) throw new BadRequestException('Nome do garçom é obrigatório');
    return this.repo.update(id, {
      ...(dto.name !== undefined   && { name: dto.name.trim() }),
      ...(dto.userId !== undefined && { userId: dto.userId || null }),
      ...(dto.active !== undefined && { active: dto.active }),
    });
  }
}
