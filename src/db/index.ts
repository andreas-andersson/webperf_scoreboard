import { drizzle } from 'drizzle-orm/node-postgres';
import { boolean, jsonb, pgTable, serial, text, timestamp, withReplicas } from 'drizzle-orm/pg-core';
import * as schema from './schema';

if (
  !process.env.DB_CONNECTION_STRING ||
  !process.env.DB_CONNECTION_READ1 ||
  !process.env.DB_CONNECTION_READ2
) {
  throw new Error('DB_CONNECTION_STRING or DB_CONNECTION_READ1 or DB_CONNECTION_READ2 is missing');
}

const primary = drizzle(process.env.DB_CONNECTION_STRING, { schema });
const read1 = drizzle(process.env.DB_CONNECTION_READ1, { schema });
const read2 = drizzle(process.env.DB_CONNECTION_READ2, { schema });

export const db = withReplicas(primary, [read1, read2]);

export function useReplica(): typeof read1 {
  const replicas = [read1, read2];
  const randomIndex = Math.floor(Math.random() * replicas.length);
  return replicas[randomIndex];
}
