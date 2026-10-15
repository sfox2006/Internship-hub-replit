import 'dotenv/config';
import pg from 'pg';
import { readFile, readdir } from 'node:fs/promises';
if (process.env.REPLIT_ENVIRONMENT !== 'development')
  throw new Error('db:migrate is Development-only; use the supported Production publish schema flow.');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const files = (await readdir(new URL('./migrations/', import.meta.url)))
      .filter((file) => file.endsWith('.sql'))
      .sort();
    for (const file of files)
      await client.query(
        await readFile(new URL(`./migrations/${file}`, import.meta.url), 'utf8'),
      );
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
  console.log('Messaging schema ready');
} finally { await pool.end(); }
