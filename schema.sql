-- ============================================================
-- R&R Lead Intelligence Platform — Database Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Organizations (multi-tenancy anchor)
create table organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz default now()
);

-- Maps auth.users → organizations
create table user_organizations (
  user_id         uuid references auth.users(id) on delete cascade,
  organization_id uuid references organizations(id) on delete cascade,
  primary key (user_id, organization_id)
);

-- Leads
create table leads (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid references organizations(id) on delete cascade not null,
  place_id            text,                    -- Google Places ID
  name                text not null,
  address             text,
  phone               text,
  website             text,
  email               text,
  stage               text not null default 'discovered'
                        check (stage in ('discovered','qualified','outreach','closed')),
  framework_match     text
                        check (framework_match in (
                          'brand_positioning','client_acquisition',
                          'growth_infrastructure','scaling_roadmap','venture_development'
                        )),
  framework_score     numeric(3,1),
  framework_reasoning text,
  rating              numeric(2,1),
  review_count        integer,
  source              text default 'google_places',
  notes               text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now(),
  unique (organization_id, place_id)
);

-- Outreach history (Phase 2)
create table outreach_logs (
  id              uuid primary key default gen_random_uuid(),
  lead_id         uuid references leads(id) on delete cascade not null,
  organization_id uuid references organizations(id) on delete cascade not null,
  type            text,
  subject         text,
  body            text,
  sent_at         timestamptz,
  opened_at       timestamptz,
  clicked_at      timestamptz
);

-- updated_at trigger
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger leads_updated_at
  before update on leads
  for each row execute procedure update_updated_at();

-- ── Row-Level Security ───────────────────────────────────────

alter table organizations    enable row level security;
alter table user_organizations enable row level security;
alter table leads            enable row level security;
alter table outreach_logs    enable row level security;

create policy "users_read_own_org"
  on organizations for select
  using (id in (
    select organization_id from user_organizations where user_id = auth.uid()
  ));

create policy "users_read_own_user_orgs"
  on user_organizations for select
  using (user_id = auth.uid());

create policy "users_select_leads"
  on leads for select
  using (organization_id in (
    select organization_id from user_organizations where user_id = auth.uid()
  ));

create policy "users_insert_leads"
  on leads for insert
  with check (organization_id in (
    select organization_id from user_organizations where user_id = auth.uid()
  ));

create policy "users_update_leads"
  on leads for update
  using (organization_id in (
    select organization_id from user_organizations where user_id = auth.uid()
  ));

create policy "users_select_outreach"
  on outreach_logs for select
  using (organization_id in (
    select organization_id from user_organizations where user_id = auth.uid()
  ));

-- ── Auto-assign new users to R&R Collective ─────────────────

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.user_organizations (user_id, organization_id)
  select new.id, id from public.organizations where name = 'R&R Collective' limit 1;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Seed ────────────────────────────────────────────────────

insert into organizations (name) values ('R&R Collective');

-- ── Migration: add created_by ownership ──────────────────────
-- Run this block in Supabase SQL Editor AFTER the initial schema is applied.

alter table leads
  add column if not exists created_by       uuid references auth.users(id),
  add column if not exists created_by_email text;

create index if not exists leads_created_by_idx on leads (created_by);
