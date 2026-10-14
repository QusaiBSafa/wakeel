import 'server-only';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { Pool as NeonPool } from '@neondatabase/serverless';
import { Pool as PgPool } from 'pg';
import * as schema from './schema';

type Db = ReturnType<typeof drizzlePg<typeof schema>>;

const globalForDb = globalThis as unknown as { __hudhudDb?: Db };

function create(): Db {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  // Neon (staging/production) goes over the serverless driver; anything else (local Postgres) over node-postgres.
  if (/\.neon\.tech|neon\.build/.test(url)) {
    return drizzleNeon({ client: new NeonPool({ connectionString: url }), schema }) as unknown as Db;
  }
  return drizzlePg({ client: new PgPool({ connectionString: url, max: 5 }), schema });
}

export function db(): Db {
  if (!globalForDb.__hudhudDb) globalForDb.__hudhudDb = create();
  return globalForDb.__hudhudDb;
}

export { schema };
