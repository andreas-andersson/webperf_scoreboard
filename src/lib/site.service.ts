import { pool } from './db';

export async function getLeaderboard() {
  const { rows } = await pool.query('SELECT * FROM leaderboard()');

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

function toDateStr(value: string | Date): string {
  return new Date(value).toISOString().split('T')[0];
}

export async function getSiteWithHistory(id: string, limit = 25) {
  const [{ rows: siteRows }, { rows: scoreRows }, { rows: testRows }, { rows: currentScoreRows }, { rows: currentTestRows }] =
    await Promise.all([
      pool.query('SELECT * FROM sites WHERE id = $1', [id]),
      pool.query(
        'SELECT metric_name, score, scraped_at FROM site_scores WHERE site_id = $1 ORDER BY scraped_at ASC, created_at ASC',
        [id],
      ),
      pool.query(
        'SELECT test_name, score, tested_at FROM site_tests WHERE site_id = $1 ORDER BY tested_at ASC, created_at ASC',
        [id],
      ),
      pool.query('SELECT metric_name, score FROM site_scores_current WHERE site_id = $1', [id]),
      pool.query('SELECT test_name, score FROM site_tests_current WHERE site_id = $1', [id]),
    ]);
  const site = siteRows[0];

  // The "current" state (top-of-page cards) comes from *_current, not from
  // history[0] — one row per key by construction, no date-ordering tiebreak
  // that could pick a stale value. History is still walked below, but only
  // to feed the chart's timeline.
  const currentCategories: Record<string, number> = {};
  for (const r of currentScoreRows) currentCategories[r.metric_name as string] = r.score as number;
  const { Totalbetyg: currentTotalScore, ...currentCategoriesOnly } = currentCategories;
  const currentTestsData: Record<string, number> = {};
  for (const r of currentTestRows) currentTestsData[r.test_name as string] = r.score as number;

  // Reconstruct one snapshot per distinct date anything changed, carrying
  // forward the last known value for whatever didn't change on that date --
  // there's no more single "scan" row, so this rebuilds the equivalent view.
  // scraped_at/tested_at is the source's self-reported date, not our write
  // order -- two rows can share it (source hasn't bumped its own date yet).
  // The queries above tiebreak on created_at so same-date state overwrites
  // land in true write order (same fix as leaderboard()/*_current, 009/010).
  type Event = { date: string; kind: 'score' | 'test'; key: string; value: number };
  const events: Event[] = [
    ...scoreRows.map((r) => ({
      date: toDateStr(r.scraped_at as string),
      kind: 'score' as const,
      key: r.metric_name as string,
      value: r.score as number,
    })),
    ...testRows.map((r) => ({
      date: toDateStr(r.tested_at as string),
      kind: 'test' as const,
      key: r.test_name as string,
      value: r.score as number,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  const categoriesState: Record<string, number> = {};
  const testsState: Record<string, number> = {};
  const snapshotsByDate = new Map<string, { categories: Record<string, number>; testsData: Record<string, number> }>();

  for (const ev of events) {
    if (ev.kind === 'score') categoriesState[ev.key] = ev.value;
    else testsState[ev.key] = ev.value;
    snapshotsByDate.set(ev.date, { categories: { ...categoriesState }, testsData: { ...testsState } });
  }

  const dates = [...snapshotsByDate.keys()].sort().reverse().slice(0, limit);

  return {
    site: site
      ? {
          id: site.id as string,
          name: site.name as string,
          url: site.url as string,
          createdAt: site.created_at as string,
        }
      : null,
    current: {
      totalScore: currentTotalScore ?? null,
      categories: currentCategoriesOnly,
      testsData: currentTestsData,
    },
    history: dates.map((date) => {
      const { Totalbetyg, ...categories } = snapshotsByDate.get(date)!.categories;
      return {
        id: `${id}:${date}`,
        siteId: id,
        scannedAt: new Date(date),
        totalScore: Totalbetyg ?? null,
        categories,
        testsData: snapshotsByDate.get(date)!.testsData,
        createdAt: date,
      };
    }),
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

export async function upsertSiteScores(
  siteId: string,
  scores: Record<string, number | null>,
  scrapedAt: Date,
) {
  const entries = Object.entries(scores);
  if (entries.length === 0) return;

  const values: string[] = [];
  const params: unknown[] = [];
  entries.forEach(([metricName, score], i) => {
    values.push(`($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`);
    params.push(siteId, metricName, score, scrapedAt.toISOString());
  });

  // "Latest" is a physical guarantee (the primary key on site_scores_current),
  // not a query convention — no ORDER BY tiebreak needed. The WHERE on DO
  // UPDATE is evaluated against the one row that can possibly be "current",
  // so the change-check and the write happen in a single atomic statement;
  // unchanged rows are skipped by Postgres and excluded from RETURNING, so
  // the history-log insert only fires for genuine changes.
  await pool.query(
    `WITH upserted AS (
       INSERT INTO site_scores_current (site_id, metric_name, score, scraped_at)
       VALUES ${values.join(', ')}
       ON CONFLICT (site_id, metric_name) DO UPDATE
         SET score = EXCLUDED.score, scraped_at = EXCLUDED.scraped_at, updated_at = now()
         WHERE site_scores_current.score IS DISTINCT FROM EXCLUDED.score
       RETURNING site_id, metric_name, score, scraped_at
     )
     INSERT INTO site_scores (site_id, metric_name, score, scraped_at)
     SELECT site_id, metric_name, score, scraped_at FROM upserted`,
    params,
  );
}

export async function upsertSiteTests(
  siteId: string,
  tests: { name: string; score: number; testedAt: string }[],
) {
  if (tests.length === 0) return;

  const values: string[] = [];
  const params: unknown[] = [];
  tests.forEach(({ name, score, testedAt }, i) => {
    values.push(`($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`);
    params.push(siteId, name, score, testedAt);
  });

  // Same atomic upsert-then-log pattern as upsertSiteScores. Dedup key stays
  // tested_at (a test re-run with an identical result is still a new
  // observation date), matching the ON CONFLICT DO NOTHING semantics the old
  // site_tests-only design used.
  await pool.query(
    `WITH upserted AS (
       INSERT INTO site_tests_current (site_id, test_name, score, tested_at)
       VALUES ${values.join(', ')}
       ON CONFLICT (site_id, test_name) DO UPDATE
         SET score = EXCLUDED.score, tested_at = EXCLUDED.tested_at, updated_at = now()
         WHERE site_tests_current.tested_at IS DISTINCT FROM EXCLUDED.tested_at
       RETURNING site_id, test_name, score, tested_at
     )
     INSERT INTO site_tests (site_id, test_name, score, tested_at)
     SELECT site_id, test_name, score, tested_at FROM upserted
     ON CONFLICT (site_id, test_name, tested_at) DO NOTHING`,
    params,
  );
}
