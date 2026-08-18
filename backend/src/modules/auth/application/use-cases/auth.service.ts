import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { USER_REPOSITORY_PORT, UserRepositoryPort, AuthUser } from '@/modules/auth/domain/repositories/user-repository.port';
import { PERMISSION_GROUPS, MASTER_ADMIN_EMAIL } from '@/modules/auth/domain/permission-groups';
import { FirebaseAdminProvider } from '@/modules/auth/infrastructure/firebase-admin.provider';

function effectivePermissions(user: AuthUser): string[] {
  return user.role === 'ADMIN' ? [...PERMISSION_GROUPS] : user.adminPermissions;
}

function toSafeUser(user: AuthUser) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, permissions: effectivePermissions(user) };
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY_PORT) private readonly users: UserRepositoryPort,
    private readonly jwt: JwtService,
    private readonly firebase: FirebaseAdminProvider,
  ) {}

  private issueToken(user: AuthUser) {
    const safe = toSafeUser(user);
    const token = this.jwt.sign({ sub: user.id, role: user.role, permissions: safe.permissions });
    return { token, user: safe };
  }

  async loginWithPassword(username: string, password: string) {
    if (username !== 'admin' || !process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
      throw new UnauthorizedException('Usuário ou senha inválidos.');
    }

    const admin = await this.users.findByEmail(MASTER_ADMIN_EMAIL);
    if (!admin) throw new UnauthorizedException('Usuário admin não encontrado — rode o seed do banco (make seed).');

    return this.issueToken(admin);
  }

  async loginWithFirebase(idToken: string): Promise<{ pending: true } | ReturnType<AuthService['issueToken']>> {
    const decoded = await this.firebase.verifyIdToken(idToken);
    const email = decoded.email;
    if (!email) throw new UnauthorizedException('Conta Google sem e-mail associado.');

    let user = await this.users.findByFirebaseUid(decoded.uid);
    if (!user) {
      user = await this.users.findByEmail(email);
      user = user
        ? await this.users.linkFirebaseUid(user.id, decoded.uid)
        : await this.users.createFromFirebase({ name: decoded.name ?? email, email, firebaseUid: decoded.uid });
    }

    const hasAccess = user.role === 'ADMIN' || (user.active && user.adminPermissions.length > 0);
    if (!hasAccess) return { pending: true };

    return this.issueToken(user);
  }

  async me(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException('Usuário não encontrado.');
    return toSafeUser(user);
  }
}
