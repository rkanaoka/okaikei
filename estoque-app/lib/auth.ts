// Sessão de login: cookie assinado (HMAC-SHA256), sem persistência em banco.
// Usa a Web Crypto API (globalThis.crypto.subtle) em vez do módulo `crypto` do
// Node — assim o mesmo código roda tanto nas API routes (Node runtime) quanto
// no middleware (Edge runtime).

export const SESSION_COOKIE = 'estoque_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12h — dura um turno de trabalho

function getSecret(): string {
  const secret = process.env.ESTOQUE_SESSION_SECRET;
  if (!secret) throw new Error('ESTOQUE_SESSION_SECRET não configurado.');
  return secret;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(b64url.length / 4) * 4, '=');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function createSessionToken(): Promise<string> {
  const payload = JSON.stringify({ exp: Date.now() + SESSION_TTL_MS });
  const payloadB64 = bytesToBase64Url(new TextEncoder().encode(payload));
  const key = await hmacKey();
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadB64));
  const sigB64 = bytesToBase64Url(new Uint8Array(signature));
  return `${payloadB64}.${sigB64}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const [payloadB64, sigB64] = token.split('.');
  if (!payloadB64 || !sigB64) return false;

  try {
    const key = await hmacKey();
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      base64UrlToBytes(sigB64) as BufferSource,
      new TextEncoder().encode(payloadB64) as BufferSource,
    );
    if (!valid) return false;

    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payloadB64)));
    return typeof payload.exp === 'number' && payload.exp > Date.now();
  } catch {
    return false;
  }
}

export function sessionCookieOptions(): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_MS / 1000}${secure}`;
}
