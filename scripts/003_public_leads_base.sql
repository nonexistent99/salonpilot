CREATE TABLE IF NOT EXISTS public.public_leads_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  city TEXT NOT NULL,
  niche TEXT NOT NULL,
  rating NUMERIC DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.public_leads_base ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_leads_base_read_all" ON public.public_leads_base FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.music_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  niche TEXT,
  style TEXT,
  tone TEXT,
  lyrics TEXT,
  short_version TEXT,
  slogan TEXT,
  alt_version TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.music_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "music_projects_select" ON public.music_projects FOR SELECT USING (
  agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "music_projects_insert" ON public.music_projects FOR INSERT WITH CHECK (
  agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "music_projects_delete" ON public.music_projects FOR DELETE USING (
  agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid())
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subscriptions' AND column_name='music_used') THEN
    ALTER TABLE public.subscriptions ADD COLUMN music_used INTEGER DEFAULT 0;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subscriptions' AND column_name='music_limit') THEN
    ALTER TABLE public.subscriptions ADD COLUMN music_limit INTEGER DEFAULT 3;
  END IF;
END $$;
