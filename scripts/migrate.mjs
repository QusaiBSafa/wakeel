// Applies drizzle/ migrations. Skipped when DATABASE_URL is missing so builds without a database still pass.
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { migrate as migratePg } from 'drizzle-orm/node-postgres/migrator';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { migrate as migrateNeon } from 'drizzle-orm/neon-serverless/migrator';
import { Pool as NeonPool } from '@neondatabase/serverless';
import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) {
  console.log('[migrate] DATABASE_URL not set, skipping migrations');
  process.exit(0);
}

const isNeon = /\.neon\.tech|neon\.build/.test(url);
const pool = isNeon ? new NeonPool({ connectionString: url }) : new pg.Pool({ connectionString: url });
try {
  if (isNeon) await migrateNeon(drizzleNeon({ client: pool }), { migrationsFolder: 'drizzle' });
  else await migratePg(drizzlePg({ client: pool }), { migrationsFolder: 'drizzle' });
  console.log('[migrate] done');
} finally {
  await pool.end();
}
