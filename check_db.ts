import { db } from './src/db';
import { sql } from 'drizzle-orm';

async function checkSchema() {
  const result = await db.execute(sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'scans' AND column_name = 'total_score';
  `);
  console.log('Column Type:', result.rows[0]);
  process.exit(0);
}

checkSchema();
