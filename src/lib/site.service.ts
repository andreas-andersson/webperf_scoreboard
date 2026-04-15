import { supabaseAdmin } from './supabase';

export async function getLeaderboard() {
  const { data, error } = await supabaseAdmin.rpc('get_leaderboard');

  if (error) throw new Error(`getLeaderboard failed: ${error.message}`);

  return (data as Array<Record<string, unknown>>).map((row) => ({
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
  const [{ data: site }, { data: history }] = await Promise.all([
    supabaseAdmin.from('sites').select('*').eq('id', id).single(),
    supabaseAdmin
      .from('scans')
      .select('*')
      .eq('site_id', id)
      .order('scanned_at', { ascending: false })
      .limit(limit),
  ]);

  return {
    site: site
      ? {
          id: site.id as string,
          name: site.name as string,
          url: site.url as string,
          createdAt: site.created_at as string,
        }
      : null,
    history: (history ?? []).map((scan: Record<string, unknown>) => ({
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
  const { data, error } = await supabaseAdmin
    .from('sites')
    .upsert({ url, name }, { onConflict: 'url' })
    .select('id')
    .single();

  if (error) throw new Error(`upsertSite failed: ${error.message}`);
  return data.id as string;
}

export async function createScan(params: {
  siteId: string;
  totalScore: number | null;
  categories: Record<string, number>;
  testsData: Record<string, number>;
}) {
  const { error } = await supabaseAdmin.from('scans').insert({
    site_id: params.siteId,
    total_score: params.totalScore,
    categories: params.categories,
    tests_data: params.testsData,
    scanned_at: new Date().toISOString(),
  });

  if (error) throw new Error(`createScan failed: ${error.message}`);
}
