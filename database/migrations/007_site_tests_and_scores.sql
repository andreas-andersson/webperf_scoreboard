-- Split scans into change-detected tables:
--   site_tests  — individual tests, deduped by (site_id, test_name, tested_at)
--   site_scores — Totalbetyg + categories, deduped by value change (no reliable source date)

CREATE TABLE IF NOT EXISTS site_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  test_name text NOT NULL,
  score double precision,
  tested_at date NOT NULL,
  scraped_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_id, test_name, tested_at)
);
CREATE INDEX IF NOT EXISTS site_tests_site_test_idx ON site_tests (site_id, test_name, tested_at DESC);

CREATE TABLE IF NOT EXISTS site_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  metric_name text NOT NULL, -- 'Totalbetyg' | 'Tillgänglighet' | 'Hastighet' | 'Webbstandard' | 'Integritet & säkerhet'
  score double precision,
  scraped_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS site_scores_site_metric_idx ON site_scores (site_id, metric_name, scraped_at DESC);
