CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY NOT NULL,
  color TEXT NOT NULL,
  tier TEXT NOT NULL,
  storage_variant TEXT NOT NULL,
  order_prefix INTEGER NOT NULL,
  country TEXT NOT NULL,
  shipping_method TEXT NOT NULL,
  dispatched_on TEXT NOT NULL,
  delivered_on TEXT NOT NULL DEFAULT '',
  submitted_at TEXT NOT NULL,
  UNIQUE (color, tier, storage_variant, order_prefix, country, shipping_method, dispatched_on, delivered_on)
);

CREATE INDEX IF NOT EXISTS reports_submitted_at_idx ON reports (submitted_at DESC);
