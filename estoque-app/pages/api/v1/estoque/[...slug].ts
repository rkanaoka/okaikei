import type { NextApiRequest, NextApiResponse } from 'next';

// Proxy autenticado (ver middleware.ts) para o okaikei server, alcançado pelo
// IP WireGuard. O front do estoque-app nunca fala com o okaikei diretamente —
// sempre via esta rota, que injeta o x-api-key (nunca exposto ao navegador).
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { slug, ...query } = req.query;
  const path = Array.isArray(slug) ? slug.join('/') : slug ?? '';

  const backendUrl = process.env.OKAIKEI_BACKEND_URL;
  const apiKey = process.env.OKAIKEI_API_KEY;
  if (!backendUrl || !apiKey) {
    return res.status(500).json({ error: 'OKAIKEI_BACKEND_URL / OKAIKEI_API_KEY não configurados.' });
  }

  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) value.forEach((v) => qs.append(key, v));
    else if (value !== undefined) qs.append(key, value);
  }
  const url = `${backendUrl.replace(/\/$/, '')}/estoque-mobile/${path}${qs.toString() ? `?${qs}` : ''}`;

  try {
    const upstream = await fetch(url, {
      method: req.method,
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });

    const contentType = upstream.headers.get('content-type') ?? '';
    const payload = contentType.includes('application/json') ? await upstream.json() : await upstream.text();
    return res.status(upstream.status).send(payload);
  } catch (err) {
    return res.status(502).json({ error: 'Falha ao conectar ao okaikei server (verifique o WireGuard).' });
  }
}
