import { Inject, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { USER_REPOSITORY_PORT, UserRepositoryPort } from '@/modules/auth/domain/repositories/user-repository.port';
import { PERMISSION_GROUPS, MASTER_ADMIN_EMAIL } from '@/modules/auth/domain/permission-groups';

function toListItem(user: Awaited<ReturnType<UserRepositoryPort['listAll']>>[number]) {
  const { password: _password, ...safe } = user;
  return safe;
}

@Injectable()
export class UsersService {
  constructor(@Inject(USER_REPOSITORY_PORT) private readonly users: UserRepositoryPort) {}

  async listAll() {
    const all = await this.users.listAll();
    return all.map(toListItem);
  }

  async updatePermissions(id: string, dto: { active?: boolean; adminPermissions?: string[] }) {
    const target = await this.users.findById(id);
    if (!target) throw new NotFoundException('Usuário não encontrado.');
    if (target.email === MASTER_ADMIN_EMAIL) throw new BadRequestException('Não é possível editar o usuário mestre.');

    if (dto.adminPermissions) {
      const invalid = dto.adminPermissions.filter((p) => !(PERMISSION_GROUPS as readonly string[]).includes(p));
      if (invalid.length) throw new BadRequestException(`Permissões inválidas: ${invalid.join(', ')}`);
    }

    const updated = await this.users.updatePermissions(id, dto);
    return toListItem(updated);
  }
}
