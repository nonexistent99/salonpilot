-- Auto-create agency + profile + subscription on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_agency_id UUID;
BEGIN
  -- Create a new agency for the user
  INSERT INTO public.agencies (name)
  VALUES (COALESCE(new.raw_user_meta_data ->> 'agency_name', 'Minha Agencia'))
  RETURNING id INTO new_agency_id;

  -- Create profile linked to agency
  INSERT INTO public.profiles (id, agency_id, full_name)
  VALUES (
    new.id,
    new_agency_id,
    COALESCE(new.raw_user_meta_data ->> 'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create free subscription for the agency
  INSERT INTO public.subscriptions (agency_id, plan, searches_limit, ai_credits_limit)
  VALUES (new_agency_id, 'free', 10, 20)
  ON CONFLICT (agency_id) DO NOTHING;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
