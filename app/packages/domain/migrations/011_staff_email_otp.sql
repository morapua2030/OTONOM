CREATE TABLE domain.staff_email_otp_challenges (
  id uuid PRIMARY KEY,
  user_id text NOT NULL,
  session_digest char(64) NOT NULL,
  code_digest char(64) NOT NULL,
  request_ip_digest char(64) NOT NULL,
  status text NOT NULL CHECK (status IN ('PENDING', 'SENT', 'VERIFIED', 'SUPERSEDED', 'EXPIRED', 'LOCKED', 'FAILED')),
  attempts smallint NOT NULL DEFAULT 0 CHECK (attempts >= 0 AND attempts <= 5),
  max_attempts smallint NOT NULL DEFAULT 5 CHECK (max_attempts BETWEEN 1 AND 5),
  provider_message_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);

CREATE INDEX staff_email_otp_active_idx
  ON domain.staff_email_otp_challenges(user_id, session_digest, created_at DESC)
  WHERE status IN ('PENDING', 'SENT');

CREATE INDEX staff_email_otp_expiry_idx
  ON domain.staff_email_otp_challenges(expires_at)
  WHERE status IN ('PENDING', 'SENT');

CREATE TABLE domain.staff_auth_factors (
  user_id text NOT NULL,
  session_digest char(64) NOT NULL,
  factor text NOT NULL CHECK (factor IN ('EMAIL_OTP', 'TOTP', 'RECOVERY')),
  verified_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (user_id, session_digest, factor)
);

CREATE INDEX staff_auth_factors_expiry_idx ON domain.staff_auth_factors(expires_at);
