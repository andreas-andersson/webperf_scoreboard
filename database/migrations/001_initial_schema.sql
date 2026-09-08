-- Initial schema (migrated from Neon/Drizzle)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL UNIQUE,
  name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  total_score double precision,
  categories jsonb,
  tests_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
