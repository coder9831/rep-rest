CREATE TABLE public.profiles (id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, name text, email text, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated; GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid()=id) WITH CHECK (auth.uid()=id);

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN INSERT INTO public.profiles(id,name,email) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'), NEW.email) ON CONFLICT DO NOTHING; RETURN NEW; END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.exercises (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid(), name text NOT NULL, name_key text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,name_key));
CREATE TABLE public.plans (user_id uuid PRIMARY KEY DEFAULT auth.uid(), days_per_week int NOT NULL DEFAULT 3, weekdays int[] NOT NULL DEFAULT '{}', days jsonb NOT NULL DEFAULT '[]', version int NOT NULL DEFAULT 0, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.plan_versions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid(), version int NOT NULL, saved_at timestamptz NOT NULL DEFAULT now(), snapshot jsonb NOT NULL, UNIQUE(user_id,version));
CREATE TABLE public.sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid(), session_date date NOT NULL DEFAULT current_date, workout_day_id text, workout_name text NOT NULL, plan_version int, status text NOT NULL DEFAULT 'in_progress', started_at timestamptz NOT NULL DEFAULT now(), ended_at timestamptz, duration_seconds int, notes text, day_snapshot jsonb NOT NULL DEFAULT '{}');
CREATE TABLE public.set_logs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid(), session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE, exercise_id uuid REFERENCES public.exercises(id) ON DELETE SET NULL, exercise_name text NOT NULL, set_number int NOT NULL, weight numeric, reps int, completed boolean NOT NULL DEFAULT false, exercise_notes text, UNIQUE(session_id, exercise_name, set_number));
CREATE TABLE public.bodyweights (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid(), entry_date date NOT NULL DEFAULT current_date, weight numeric NOT NULL);

DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['exercises','plans','plan_versions','sessions','set_logs','bodyweights'] LOOP
 EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
 EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
 EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
 EXECUTE format('CREATE POLICY "own rows" ON public.%I FOR ALL TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id)', t);
END LOOP; END $$;