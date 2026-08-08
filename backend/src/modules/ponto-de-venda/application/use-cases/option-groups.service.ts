import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { OPTION_GROUP_REPOSITORY_PORT, OptionGroupRepositoryPort } from '@/modules/ponto-de-venda/domain/repositories/option-group-repository.port';
import { RedisService } from '@/shared/infrastructure/cache/redis.service';
import { uuidv7 } from 'uuidv7';

type OptionDto = { id?: string; name: string; price?: number; active?: boolean };

@Injectable()
export class OptionGroupsService {
  constructor(
    @Inject(OPTION_GROUP_REPOSITORY_PORT) private readonly repo: OptionGroupRepositoryPort,
    private readonly redis: RedisService,
  ) {}

  async findAll() {
    return this.repo.findAll();
  }

  async findOne(id: string) {
    const group = await this.repo.findById(id);
    if (!group) throw new NotFoundException(`Grupo de opções ${id} não encontrado`);
    return group;
  }

  async create(dto: { name: string; minSelect?: number; maxSelect?: number; options?: OptionDto[] }) {
    if (!dto.name?.trim()) throw new BadRequestException('Nome do grupo é obrigatório');
    const options = (dto.options ?? []).map((o, i) => ({
      id: uuidv7(), name: o.name.trim(), price: o.price ?? 0, active: o.active ?? true, sortOrder: i,
    }));
    const group = await this.repo.create({ id: uuidv7(), name: dto.name.trim(), options });
    await this.redis.invalidateMenu();
    return group;
  }

  async update(id: string, dto: Partial<{
    name: string; minSelect: number; maxSelect: number; active: boolean; options: OptionDto[];
  }>) {
    await this.findOne(id);
    if (dto.name !== undefined && !dto.name.trim()) throw new BadRequestException('Nome do grupo é obrigatório');
    const group = await this.repo.updateWithOptions(id, {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.minSelect !== undefined ? { minSelect: dto.minSelect } : {}),
      ...(dto.maxSelect !== undefined ? { maxSelect: dto.maxSelect } : {}),
      ...(dto.active !== undefined ? { active: dto.active } : {}),
      ...(dto.options !== undefined ? { options: dto.options } : {}),
    });
    await this.redis.invalidateMenu();
    return group;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.repo.remove(id);
    await this.redis.invalidateMenu();
    return { id };
  }

  async setItems(id: string, menuItemIds: string[]) {
    await this.findOne(id);
    const group = await this.repo.setMenuItems(id, menuItemIds);
    await this.redis.invalidateMenu();
    return group;
  }

  async updateOption(optionId: string, dto: Partial<{ name: string; price: number; active: boolean }>) {
    const option = await this.repo.findOptionById(optionId);
    if (!option) throw new NotFoundException(`Opção ${optionId} não encontrada`);
    const updated = await this.repo.updateOption(optionId, {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.price !== undefined ? { price: dto.price } : {}),
      ...(dto.active !== undefined ? { active: dto.active } : {}),
    });
    await this.redis.invalidateMenu();
    return updated;
  }
}
