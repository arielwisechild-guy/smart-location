-- Supabase setup for auth + profiles
-- 1) Enable Email/Password authentication in Supabase Dashboard > Authentication > Providers

-- 2) Create a table for user profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  prenom text,
  nom text,
  phone text,
  role text default 'locataire',
  commune text,
  quartier text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- 3) Policies for the profiles table
create policy "Users can view profiles" on public.profiles
  for select using (true);

create policy "Users can insert their own profile" on public.profiles
  for insert with check (auth.role() = 'authenticated' and auth.uid() = id);

create policy "Users can update their own profile" on public.profiles
  for update using (auth.role() = 'authenticated' and auth.uid() = id) with check (auth.role() = 'authenticated' and auth.uid() = id);

create policy "Users can delete their own profile" on public.profiles
  for delete using (auth.uid() = id);

-- Optional: if you also want profile avatars, create a separate bucket
-- create bucket named 'avatars' if needed in the Storage dashboard
-- or by SQL if your plan allows it.
