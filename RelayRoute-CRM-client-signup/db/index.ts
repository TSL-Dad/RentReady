import { env } from 'cloudflare:workers';

export function getDb(): D1Database {
  if (!env.DB) throw new Error('Cloudflare D1 binding `DB` is unavailable.');
  return env.DB;
}

export function getUploads(): R2Bucket {
  if (!env.UPLOADS)
    throw new Error('Cloudflare R2 binding `UPLOADS` is unavailable.');
  return env.UPLOADS;
}
