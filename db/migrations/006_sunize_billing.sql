CREATE TABLE IF NOT EXISTS billing_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL UNIQUE,
  provider_id TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL CHECK (plan IN ('starter', 'enterprise')),
  amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING_AUTHORIZATION',
  pix_link TEXT,
  next_payment_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS billing_subscriptions_salon ON billing_subscriptions(salon_id, created_at DESC);
