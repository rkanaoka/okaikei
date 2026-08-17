import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

@Injectable()
export class FirebaseAdminProvider {
  private app: App | null = null;
  private attempted = false;

  private getApp(): App | null {
    if (this.app) return this.app;
    if (this.attempted) return null;
    this.attempted = true;

    const projectId   = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey  = process.env.FIREBASE_PRIVATE_KEY;
    if (!projectId || !clientEmail || !privateKey) return null;

    this.app = getApps()[0] ?? initializeApp({
      credential: cert({ projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, '\n') }),
    });
    return this.app;
  }

  async verifyIdToken(idToken: string) {
    const app = this.getApp();
    if (!app) throw new ServiceUnavailableException('Login Google não configurado.');
    try {
      return await getAuth(app).verifyIdToken(idToken);
    } catch {
      throw new UnauthorizedException('Sessão do Google inválida ou expirada — tente entrar novamente.');
    }
  }
}
