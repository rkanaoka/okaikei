import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { uuidv7 } from 'uuidv7';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { AuthUser, UserRepositoryPort } from '@/modules/auth/domain/repositories/user-repository.port';

@Injectable()
export class PrismaUserRepository implements UserRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<AuthUser | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string): Promise<AuthUser | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findByFirebaseUid(firebaseUid: string): Promise<AuthUser | null> {
    return this.prisma.user.findUnique({ where: { firebaseUid } });
  }

  createFromFirebase(data: { name: string; email: string; firebaseUid: string }): Promise<AuthUser> {
    // Login Google não usa senha — gera um hash aleatório inutilizável para satisfazer a coluna NOT NULL.
    return this.prisma.user.create({
      data: {
        id: uuidv7(),
        name: data.name,
        email: data.email,
        firebaseUid: data.firebaseUid,
        password: bcrypt.hashSync(uuidv7(), 10),
        role: 'WAITER',
        active: false,
        adminPermissions: [],
      },
    });
  }

  linkFirebaseUid(id: string, firebaseUid: string): Promise<AuthUser> {
    return this.prisma.user.update({ where: { id }, data: { firebaseUid } });
  }

  listAll(): Promise<AuthUser[]> {
    return this.prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
  }

  updatePermissions(id: string, data: { active?: boolean; adminPermissions?: string[] }): Promise<AuthUser> {
    return this.prisma.user.update({ where: { id }, data });
  }
}
