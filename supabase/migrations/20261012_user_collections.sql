-- Visitor-built collections.
--
-- A collection is a group of directory listings someone put together, kept
-- either privately or shared through its own URL at /collections/u/<owner>/<slug>.
-- The follow graph lives here too, so a visitor can follow a curator and come
-- back to their newest collections.

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  slug text not null,
  title text not null default '',
  description text not null default '',
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, slug)
);

create index if not exists collections_owner_idx on public.collections (owner_id, updated_at desc);
create index if not exists collections_public_idx on public.collections (is_public, updated_at desc);

create table if not exists public.collection_sites (
  collection_id uuid not null references public.collections(id) on delete cascade,
  slug text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (collection_id, slug)
);

create table if not exists public.curator_follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  curator_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, curator_id),
  check (follower_id <> curator_id)
);

alter table public.collections enable row level security;
alter table public.collection_sites enable row level security;
alter table public.curator_follows enable row level security;

-- A collection is readable when it is public, and always by whoever owns it.
drop policy if exists "Anyone can view public collections" on public.collections;
create policy "Anyone can view public collections"
  on public.collections for select
  using (is_public or auth.uid() = owner_id);

drop policy if exists "Owners can add collections" on public.collections;
create policy "Owners can add collections"
  on public.collections for insert
  with check (auth.uid() = owner_id);

drop policy if exists "Owners can update collections" on public.collections;
create policy "Owners can update collections"
  on public.collections for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "Owners can delete collections" on public.collections;
create policy "Owners can delete collections"
  on public.collections for delete
  using (auth.uid() = owner_id);

-- Members are visible exactly when their collection is.
drop policy if exists "Members follow their collection" on public.collection_sites;
create policy "Members follow their collection"
  on public.collection_sites for select
  using (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and (c.is_public or c.owner_id = auth.uid())
    )
  );

drop policy if exists "Owners can add members" on public.collection_sites;
create policy "Owners can add members"
  on public.collection_sites for insert
  with check (
    exists (select 1 from public.collections c where c.id = collection_id and c.owner_id = auth.uid())
  );

drop policy if exists "Owners can update members" on public.collection_sites;
create policy "Owners can update members"
  on public.collection_sites for update
  using (
    exists (select 1 from public.collections c where c.id = collection_id and c.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.collections c where c.id = collection_id and c.owner_id = auth.uid())
  );

drop policy if exists "Owners can remove members" on public.collection_sites;
create policy "Owners can remove members"
  on public.collection_sites for delete
  using (
    exists (select 1 from public.collections c where c.id = collection_id and c.owner_id = auth.uid())
  );

-- Follower counts and "who follows whom" are public; only you may follow for yourself.
drop policy if exists "Anyone can view the follow graph" on public.curator_follows;
create policy "Anyone can view the follow graph"
  on public.curator_follows for select
  using (true);

drop policy if exists "Curators can follow" on public.curator_follows;
create policy "Curators can follow"
  on public.curator_follows for insert
  with check (auth.uid() = follower_id);

drop policy if exists "Curators can update their follows" on public.curator_follows;
create policy "Curators can update their follows"
  on public.curator_follows for update
  using (auth.uid() = follower_id)
  with check (auth.uid() = follower_id);

drop policy if exists "Curators can unfollow" on public.curator_follows;
create policy "Curators can unfollow"
  on public.curator_follows for delete
  using (auth.uid() = follower_id);

-- Same timestamp helper the profiles table uses.
drop trigger if exists collections_set_updated_at on public.collections;
create trigger collections_set_updated_at
  before update on public.collections
  for each row execute procedure public.set_updated_at();
