CREATE TABLE IF NOT EXISTS billing_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id TEXT NOT NULL REFERENCES billing_subscriptions(provider_id),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  payment_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider_id, payment_date)
);
CREATE INDEX IF NOT EXISTS billing_payments_date ON billing_payments(payment_date DESC);
