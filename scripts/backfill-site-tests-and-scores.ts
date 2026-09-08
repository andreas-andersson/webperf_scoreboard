/**
 * One-off backfill: old `scans` (weekly full-snapshot blobs) -> new
 * `site_tests` (per-test, dedup by tested_at) + `site_scores` (Totalbetyg +
 * categories, dedup by value change).
 *
 * Backfilled dates are approximate (scans.scanned_at), not true source
 * "last performed" dates — acceptable, goal is preserving historical score
 * values, not historical date accuracy. Consecutive-equal-value runs per
 * (site, metric/test) are collapsed so history starts clean.
 *
 * Run: npm run backfill:site-tests-and-scores
 * Safe to run only once — aborts if site_tests/site_scores already have rows.
 */
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

interface ScanRow {
  site_id: string;
  total_score: number | null;
  categories: Record<string, number> | null;
  tests_data: Record<string, number> | null;
  scanned_at: Date;
}

interface SiteScoreInsert {
  site_id: string;
  metric_name: string;
  score: number | null;
  scraped_at: Date;
}

interface SiteTestInsert {
  site_id: string;
  test_name: string;
  score: number | null;
  tested_at: string; // date only, YYYY-MM-DD
  scraped_at: Date;
}

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function main() {
  const [{ rows: existingScores }, { rows: existingTests }] = await Promise.all([
    pool.query('SELECT 1 FROM site_scores LIMIT 1'),
    pool.query('SELECT 1 FROM site_tests LIMIT 1'),
  ]);
  if (existingScores.length > 0 || existingTests.length > 0) {
    throw new Error(
      'site_scores or site_tests already has rows — refusing to run backfill twice. ' +
        'Truncate both tables first if you really want to re-run.',
    );
  }

  const { rows } = await pool.query<ScanRow>(
    'SELECT site_id, total_score, categories, tests_data, scanned_at FROM scans ORDER BY site_id ASC, scanned_at ASC',
  );
  console.log(`Loaded ${rows.length} scan rows.`);

  const scoreInserts: SiteScoreInsert[] = [];
  const testInserts: SiteTestInsert[] = [];

  const lastScoreValue = new Map<string, number | null>(); // key: `${site_id}:${metric_name}`
  const lastTestValue = new Map<string, number | null>(); // key: `${site_id}:${test_name}`

  for (const row of rows) {
    const metrics: Record<string, number | null> = {
      Totalbetyg: row.total_score,
      ...(row.categories ?? {}),
    };

    for (const [metricName, score] of Object.entries(metrics)) {
      const key = `${row.site_id}:${metricName}`;
      if (lastScoreValue.has(key) && lastScoreValue.get(key) === score) continue;
      lastScoreValue.set(key, score);
      scoreInserts.push({ site_id: row.site_id, metric_name: metricName, score, scraped_at: row.scanned_at });
    }

    for (const [testName, score] of Object.entries(row.tests_data ?? {})) {
      const key = `${row.site_id}:${testName}`;
      if (lastTestValue.has(key) && lastTestValue.get(key) === score) continue;
      lastTestValue.set(key, score);
      testInserts.push({
        site_id: row.site_id,
        test_name: testName,
        score,
        tested_at: toDateOnly(row.scanned_at),
        scraped_at: row.scanned_at,
      });
    }
  }

  console.log(
    `Collapsed to ${scoreInserts.length} site_scores rows and ${testInserts.length} site_tests rows.`,
  );

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const s of scoreInserts) {
      await client.query(
        `INSERT INTO site_scores (site_id, metric_name, score, scraped_at) VALUES ($1, $2, $3, $4)`,
        [s.site_id, s.metric_name, s.score, s.scraped_at],
      );
    }

    for (const t of testInserts) {
      await client.query(
        `INSERT INTO site_tests (site_id, test_name, score, tested_at, scraped_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (site_id, test_name, tested_at) DO NOTHING`,
        [t.site_id, t.test_name, t.score, t.tested_at, t.scraped_at],
      );
    }

    await client.query('COMMIT');
    console.log('Backfill committed.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

main()
  .catch((err) => {
    console.error('Backfill failed:', err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
