export const USER_REPOSITORY_PORT = Symbol('UserRepositoryPort');

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'CASHIER' | 'WAITER' | 'KITCHEN';
  active: boolean;
  firebaseUid: string | null;
  adminPermissions: string[];
}

export interface UserRepositoryPort {
  findById(id: string): Promise<AuthUser | null>;
  findByEmail(email: string): Promise<AuthUser | null>;
  findByFirebaseUid(firebaseUid: string): Promise<AuthUser | null>;
  createFromFirebase(data: { name: string; email: string; firebaseUid: string }): Promise<AuthUser>;
  /** Pré-cadastro feito no admin: a pessoa entra depois com a conta Google deste e-mail. */
  createInvited(data: { name: string; email: string; active: boolean; adminPermissions: string[] }): Promise<AuthUser>;
  linkFirebaseUid(id: string, firebaseUid: string): Promise<AuthUser>;
  listAll(): Promise<AuthUser[]>;
  updatePermissions(id: string, data: { name?: string; active?: boolean; adminPermissions?: string[] }): Promise<AuthUser>;
}
