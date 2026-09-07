-- P2 daily diagnostic recommendations.
-- Stores proposals only; this table cannot authorize or apply UI/content changes.

BEGIN;

CREATE TABLE IF NOT EXISTS improvement_candidates (
  candidate_id UUID PRIMARY KEY,
  candidate_key VARCHAR(160) NOT NULL,
  business_date_kst DATE NOT NULL,
  candidate_type VARCHAR(30) NOT NULL CHECK (
    candidate_type IN ('data_quality', 'measurement', 'ux_experiment')
  ),
  surface VARCHAR(30) NOT NULL DEFAULT 'all',
  title VARCHAR(300) NOT NULL,
  hypothesis TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'proposed' CHECK (
    status IN ('proposed', 'approved', 'rejected', 'expired')
  ),
  priority_score NUMERIC(5,2) NOT NULL CHECK (priority_score BETWEEN 0 AND 100),
  evidence JSONB NOT NULL CHECK (
    jsonb_typeof(evidence) = 'object' AND evidence <> '{}'::jsonb
  ),
  sample JSONB NOT NULL CHECK (
    jsonb_typeof(sample) = 'object' AND sample <> '{}'::jsonb
  ),
  primary_metric JSONB NOT NULL CHECK (jsonb_typeof(primary_metric) = 'object'),
  guardrails JSONB NOT NULL CHECK (
    jsonb_typeof(guardrails) = 'array' AND jsonb_array_length(guardrails) > 0
  ),
  rollback_plan TEXT NOT NULL CHECK (length(trim(rollback_plan)) > 0),
  risks JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(risks) = 'array'),
  recommendation JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(recommendation) = 'object'),
  winner_declared BOOLEAN NOT NULL DEFAULT FALSE CHECK (winner_declared = FALSE),
  requires_human_approval BOOLEAN NOT NULL DEFAULT TRUE CHECK (requires_human_approval = TRUE),
  automatic_change_allowed BOOLEAN NOT NULL DEFAULT FALSE CHECK (automatic_change_allowed = FALSE),
  reviewed_by VARCHAR(100),
  review_note TEXT,
  reviewed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (candidate_key, business_date_kst)
);

CREATE INDEX IF NOT EXISTS idx_improvement_candidates_status_priority
  ON improvement_candidates(status, priority_score DESC, business_date_kst DESC);

CREATE INDEX IF NOT EXISTS idx_improvement_candidates_expires_at
  ON improvement_candidates(expires_at)
  WHERE status = 'proposed';

COMMENT ON TABLE improvement_candidates IS
  'Human-reviewed diagnostic proposals only. Rows never apply UI or content changes.';

COMMENT ON COLUMN improvement_candidates.status IS
  'proposed awaits human review; approved still requires a separate implementation workflow.';

COMMIT;
