-- AI observability and tool execution logs.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS ai_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID REFERENCES salons(id) ON DELETE SET NULL,
  thread_id UUID REFERENCES conversation_threads(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  run_type TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'openai',
  model TEXT NOT NULL,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cached_input_tokens INTEGER DEFAULT 0,
  estimated_cost_usd NUMERIC(12,6) DEFAULT 0,
  latency_ms INTEGER DEFAULT 0,
  status TEXT DEFAULT 'started',
  error TEXT,
  previous_response_id TEXT,
  response_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_runs_salon_created
  ON ai_runs(salon_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_runs_thread
  ON ai_runs(thread_id, created_at DESC);

CREATE TABLE IF NOT EXISTS tool_calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ai_run_id UUID REFERENCES ai_runs(id) ON DELETE SET NULL,
  salon_id UUID REFERENCES salons(id) ON DELETE SET NULL,
  thread_id UUID REFERENCES conversation_threads(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  arguments_json JSONB DEFAULT '{}',
  result_json JSONB DEFAULT '{}',
  status TEXT DEFAULT 'started',
  latency_ms INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tool_calls_thread
  ON tool_calls(thread_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ai_usage_daily (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_runs INTEGER DEFAULT 0,
  total_input_tokens INTEGER DEFAULT 0,
  total_output_tokens INTEGER DEFAULT 0,
  total_cost_usd NUMERIC(12,6) DEFAULT 0,
  customer_replies INTEGER DEFAULT 0,
  appointments_created_by_ai INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(salon_id, date)
);
