/**
 * Bodogami — lib/db.js
 * Pool de conexão PostgreSQL (singleton).
 * Usa as mesmas variáveis de ambiente do projeto (POSTGRES_*).
 */
import { Pool } from 'pg';

let pool;

export function getDb() {
  if (!pool) {
    pool = new Pool({
      host:     process.env.POSTGRES_HOST,
      port:     parseInt(process.env.POSTGRES_PORT ?? '5432'),
      user:     process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
      ssl: process.env.POSTGRES_CA
        ? { ca: process.env.POSTGRES_CA }
        : process.env.NODE_ENV === 'production',
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis:       30000,
      max: 10,
    });

    pool.on('error', (err) => {
      console.error('[DB] Unexpected error on idle client', err);
    });
  }
  return pool;
}

/**
 * Helper para query simples.
 * Uso: const { rows } = await query('SELECT * FROM items WHERE id=$1', [id])
 */
export async function query(text, params) {
  const db = getDb();
  const start = Date.now();
  const res = await db.query(text, params);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[DB] ${Date.now() - start}ms » ${text.slice(0, 80)}`);
  }
  return res;
}
