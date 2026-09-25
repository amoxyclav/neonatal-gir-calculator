-- Account-scoped preset storage for Neonatal GIR & Nutrition Calculator.
-- Apply this migration in Supabase SQL Editor after creating a project.
-- Store only user-authored presets/preferences; never patient or encounter data.

create table if not exists public.user_preset_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  presets jsonb not null default '{}'::jsonb,
  preferences jsonb not null default '{}'::jsonb,
  schema_version integer not null default 1 check (schema_version >= 1),
  updated_at timestamptz not null default now(),
  constraint presets_must_be_object check (jsonb_typeof(presets) = 'object'),
  constraint preferences_must_be_object check (jsonb_typeof(preferences) = 'object')
);

alter table public.user_preset_settings enable row level security;

drop policy if exists "Read own preset settings" on public.user_preset_settings;
create policy "Read own preset settings" on public.user_preset_settings for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Insert own preset settings" on public.user_preset_settings;
create policy "Insert own preset settings" on public.user_preset_settings for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Update own preset settings" on public.user_preset_settings;
create policy "Update own preset settings" on public.user_preset_settings for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update on public.user_preset_settings to authenticated;
revoke all on public.user_preset_settings from anon;

create or replace function public.set_user_preset_settings_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists set_user_preset_settings_updated_at on public.user_preset_settings;
create trigger set_user_preset_settings_updated_at before update on public.user_preset_settings for each row execute function public.set_user_preset_settings_updated_at();
