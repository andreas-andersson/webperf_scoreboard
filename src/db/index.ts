import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';

if (!process.env.DB_CONNECTION_STRING) {
  throw new Error('DB_CONNECTION_STRING is missing');
}

const pool = new pg.Pool({
  connectionString: process.env.DB_CONNECTION_STRING,
});

export const db = drizzle(pool, { schema });
