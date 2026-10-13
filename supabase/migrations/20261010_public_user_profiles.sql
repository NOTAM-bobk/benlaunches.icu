-- Public profiles intentionally expose only display fields and site slugs.
-- Email addresses remain in auth.users and are never selected by the app.
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Anyone can view public profile fields"
  on public.profiles for select
  using (true);

drop policy if exists "Users can manage own saved sites" on public.saved_sites;
create policy "Anyone can view saved site slugs"
  on public.saved_sites for select
  using (true);
create policy "Users can manage own saved sites"
  on public.saved_sites for insert
  with check (auth.uid() = user_id);
create policy "Users can delete own saved sites"
  on public.saved_sites for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can manage own vote history" on public.user_votes;
create policy "Anyone can view liked site slugs"
  on public.user_votes for select
  using (true);
create policy "Users can add own vote history"
  on public.user_votes for insert
  with check (auth.uid() = user_id);
create policy "Users can remove own vote history"
  on public.user_votes for delete
  using (auth.uid() = user_id);
