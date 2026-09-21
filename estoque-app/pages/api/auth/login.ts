import type { NextApiRequest, NextApiResponse } from 'next';
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const { password } = req.body ?? {};
  const expected = process.env.ESTOQUE_PASSWORD;

  if (!expected) {
    return res.status(500).json({ error: 'ESTOQUE_PASSWORD não configurado no servidor.' });
  }
  if (typeof password !== 'string' || password !== expected) {
    return res.status(401).json({ error: 'Senha incorreta.' });
  }

  const token = await createSessionToken();
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${token}; ${sessionCookieOptions()}`);
  return res.status(200).json({ ok: true });
}
