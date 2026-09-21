import type { NextApiRequest, NextApiResponse } from 'next';
import { SESSION_COOKIE } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; Max-Age=0`);
  return res.status(200).json({ ok: true });
}
