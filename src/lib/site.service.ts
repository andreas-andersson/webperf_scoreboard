import { pool } from './db';

export async function getLeaderboard() {
  const { rows } = await pool.query('SELECT * FROM get_leaderboard()');

  return rows.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    url: row.url as string,
    totalScore: row.total_score as number,
    lastScanned: row.scanned_at
      ? new Date(row.scanned_at as string).toISOString()
      : 'Never',
    rank: Number(row.current_rank),
    rankChange: row.rank_change ? Number(row.rank_change) : 0,
  }));
}

export async function getSiteWithHistory(id: string, limit = 25) {
  const [{ rows: siteRows }, { rows: history }] = await Promise.all([
    pool.query('SELECT * FROM sites WHERE id = $1', [id]),
    pool.query(
      'SELECT * FROM scans WHERE site_id = $1 ORDER BY scanned_at DESC LIMIT $2',
      [id, limit],
    ),
  ]);
  const site = siteRows[0];

  return {
    site: site
      ? {
          id: site.id as string,
          name: site.name as string,
          url: site.url as string,
          createdAt: site.created_at as string,
        }
      : null,
    history: history.map((scan) => ({
      id: scan.id as string,
      siteId: scan.site_id as string,
      scannedAt: new Date(scan.scanned_at as string),
      totalScore: scan.total_score as number | null,
      categories: scan.categories,
      testsData: scan.tests_data,
      createdAt: scan.created_at as string,
    })),
  };
}

export async function upsertSite(url: string, name: string): Promise<string> {
  const { rows } = await pool.query(
    `INSERT INTO sites (url, name)
     VALUES ($1, $2)
     ON CONFLICT (url) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [url, name],
  );
  return rows[0].id as string;
}

export async function createScan(params: {
  siteId: string;
  totalScore: number | null;
  categories: Record<string, number>;
  testsData: Record<string, number>;
}) {
  await pool.query(
    `INSERT INTO scans (site_id, total_score, categories, tests_data, scanned_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      params.siteId,
      params.totalScore,
      JSON.stringify(params.categories),
      JSON.stringify(params.testsData),
      new Date().toISOString(),
    ],
  );
}
