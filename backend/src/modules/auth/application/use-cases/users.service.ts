import { Inject, Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { USER_REPOSITORY_PORT, UserRepositoryPort } from '@/modules/auth/domain/repositories/user-repository.port';
import { PERMISSION_GROUPS, MASTER_ADMIN_EMAIL } from '@/modules/auth/domain/permission-groups';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  async create(dto: { name?: string; email?: string; active?: boolean; adminPermissions?: string[] }) {
    const name  = dto.name?.trim() ?? '';
    const email = dto.email?.trim().toLowerCase() ?? '';
    if (!name) throw new BadRequestException('Informe o nome.');
    if (name.length > 100) throw new BadRequestException('Nome deve ter no máximo 100 caracteres.');
    if (!EMAIL_RE.test(email) || email.length > 200) throw new BadRequestException('E-mail inválido.');
    if (email === MASTER_ADMIN_EMAIL) throw new BadRequestException('Este e-mail é do usuário mestre.');
    if (await this.users.findByEmail(email)) throw new ConflictException('Já existe um usuário com este e-mail.');

    const adminPermissions = this.validatePermissions(dto.adminPermissions ?? []);
    if (adminPermissions.length === 0) throw new BadRequestException('Selecione ao menos uma permissão.');

    const created = await this.users.createInvited({ name, email, active: dto.active ?? true, adminPermissions });
    return toListItem(created);
  }

  async updatePermissions(id: string, dto: { name?: string; active?: boolean; adminPermissions?: string[] }) {
    const target = await this.users.findById(id);
    if (!target) throw new NotFoundException('Usuário não encontrado.');
    if (target.email === MASTER_ADMIN_EMAIL) throw new BadRequestException('Não é possível editar o usuário mestre.');

    const data: { name?: string; active?: boolean; adminPermissions?: string[] } = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException('Informe o nome.');
      if (name.length > 100) throw new BadRequestException('Nome deve ter no máximo 100 caracteres.');
      data.name = name;
    }
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.adminPermissions) data.adminPermissions = this.validatePermissions(dto.adminPermissions);

    const updated = await this.users.updatePermissions(id, data);
    return toListItem(updated);
  }

  private validatePermissions(permissions: string[]): string[] {
    const invalid = permissions.filter((p) => !(PERMISSION_GROUPS as readonly string[]).includes(p));
    if (invalid.length) throw new BadRequestException(`Permissões inválidas: ${invalid.join(', ')}`);
    return [...new Set(permissions)];
  }
}
