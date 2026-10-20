-- 008: shared rate-limit store (replaces the single-process in-memory limiter, release blocker B-21).
-- Keys are stored only as salted SHA-256 hashes (no raw IP addresses or e-mail addresses at rest).
CREATE TABLE domain.rate_limits (
  bucket        text PRIMARY KEY,
  window_start  timestamptz NOT NULL,
  hits          integer NOT NULL CHECK (hits >= 0)
);
CREATE INDEX rate_limits_window ON domain.rate_limits(window_start);
