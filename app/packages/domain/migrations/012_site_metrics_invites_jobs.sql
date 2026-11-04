-- 012 (final release, owner 2026-11-04): privacy-first site metrics, staff invitations and scheduled-job runs.

-- Aggregated counters only: (event, route, locale, day) -> count. No IP address, user agent, cookie or any identifier
-- is ever stored; the rate limiter keys on a salted daily hash kept only in domain.rate_limits (already hashed).
CREATE TABLE domain.site_metrics (
  event   text NOT NULL CHECK (event ~ '^[a-z][a-z0-9_]{1,31}$'),
  route   text NOT NULL CHECK (char_length(route) BETWEEN 1 AND 80 AND route ~ '^/[a-z0-9/_-]*$'),
  locale  text NOT NULL CHECK (locale IN ('ar', 'en')),
  day     date NOT NULL,
  count   bigint NOT NULL DEFAULT 0 CHECK (count >= 0),
  PRIMARY KEY (event, route, locale, day)
);
CREATE INDEX site_metrics_day ON domain.site_metrics(day);

-- One-time staff invitation links: only the SHA-256 of the token is stored; a link is single-use and expires.
CREATE TABLE domain.staff_invites (
  id          text PRIMARY KEY,
  user_id     text NOT NULL,
  token_hash  text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  created_by  text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  revoked_at  timestamptz,
  delivery    text NOT NULL CHECK (delivery IN ('EMAIL', 'SHOWN_ONCE'))
);
CREATE INDEX staff_invites_user ON domain.staff_invites(user_id);

-- Scheduled jobs (daily digest, weekly summary, retention) record each run once, so a retried cron never repeats it.
CREATE TABLE domain.job_runs (
  job      text NOT NULL CHECK (job IN ('daily_digest', 'weekly_summary', 'lead_retention')),
  run_key  text NOT NULL,
  ran_at   timestamptz NOT NULL DEFAULT now(),
  result   jsonb,
  PRIMARY KEY (job, run_key)
);
