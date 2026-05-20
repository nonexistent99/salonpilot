-- =============================================
-- Growth OS - Full Database Schema
-- =============================================

-- Agencies table (multi-tenant root)
CREATE TABLE IF NOT EXISTS public.agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Minha Agencia',
  monthly_goal NUMERIC DEFAULT 10000,
  avg_ticket NUMERIC DEFAULT 1500,
  conversion_rate NUMERIC DEFAULT 0.3,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;

-- Profiles table (links auth.users to agency)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT DEFAULT 'owner',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Leads table
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  city TEXT,
  niche TEXT,
  rating NUMERIC DEFAULT 0,
  reviews INTEGER DEFAULT 0,
  has_website BOOLEAN DEFAULT false,
  instagram_active BOOLEAN DEFAULT false,
  score_ia INTEGER DEFAULT 0,
  script TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','scheduled','no_answer','closed_won','closed_lost')),
  place_id TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Meetings table
CREATE TABLE IF NOT EXISTS public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','no_show','cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

-- Deals table
CREATE TABLE IF NOT EXISTS public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  value NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed_won','closed_lost')),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

-- Subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL UNIQUE REFERENCES public.agencies(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','starter','pro','enterprise')),
  searches_used INTEGER DEFAULT 0,
  ai_credits_used INTEGER DEFAULT 0,
  searches_limit INTEGER DEFAULT 10,
  ai_credits_limit INTEGER DEFAULT 20,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Monthly Performance history
CREATE TABLE IF NOT EXISTS public.monthly_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  revenue NUMERIC DEFAULT 0,
  conversion_rate NUMERIC DEFAULT 0,
  leads_count INTEGER DEFAULT 0,
  meetings_count INTEGER DEFAULT 0,
  avg_ticket NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agency_id, month)
);

ALTER TABLE public.monthly_performance ENABLE ROW LEVEL SECURITY;

-- AI usage log
CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Row Level Security Policies
-- =============================================

-- Agencies: users can only see their own agency
CREATE POLICY "agencies_select" ON public.agencies FOR SELECT USING (
  id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "agencies_update" ON public.agencies FOR UPDATE USING (
  id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid())
);

-- Profiles: users can manage their own profile
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (id = auth.uid());

-- Leads: users see only their agency leads
CREATE POLICY "leads_select" ON public.leads FOR SELECT USING (
  agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "leads_insert" ON public.leads FOR INSERT WITH CHECK (
  agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "leads_update" ON public.leads FOR UPDATE USING (
  agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "leads_delete" ON public.leads FOR DELETE USING (
  agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid())
);

-- Meetings
CREATE POLICY "meetings_select" ON public.meetings FOR SELECT USING (
  agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "meetings_insert" ON public.meetings FOR INSERT WITH CHECK (
  agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "meetings_update" ON public.meetings FOR UPDATE USING (
  agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "meetings_delete" ON public.meetings FOR DELETE USING (
  agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid())
);

-- Deals
CREATE POLICY "deals_select" ON public.deals FOR SELECT USING (
  agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "deals_insert" ON public.deals FOR INSERT WITH CHECK (
  agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "deals_update" ON public.deals FOR UPDATE USING (
  agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid())
);

-- Subscriptions
CREATE POLICY "subscriptions_select" ON public.subscriptions FOR SELECT USING (
  agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "subscriptions_update" ON public.subscriptions FOR UPDATE USING (
  agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid())
);

-- Monthly Performance
CREATE POLICY "monthly_performance_select" ON public.monthly_performance FOR SELECT USING (
  agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid())
);

-- AI Usage Log
CREATE POLICY "ai_usage_log_select" ON public.ai_usage_log FOR SELECT USING (
  agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid())
);
