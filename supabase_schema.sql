-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles Table (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text unique not null,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Friends Table
create table public.friends (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  friend_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, friend_id)
);

-- 3. Groups Table
create table public.groups (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Group Members Table
create table public.group_members (
  id uuid default uuid_generate_v4() primary key,
  group_id uuid references public.groups(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(group_id, user_id)
);

-- 5. Expenses Table
create table public.expenses (
  id uuid default uuid_generate_v4() primary key,
  description text not null,
  amount numeric(10, 2) not null check (amount > 0),
  category text not null default 'General',
  date date not null default current_date,
  paid_by uuid references public.profiles(id) on delete cascade not null,
  group_id uuid references public.groups(id) on delete cascade, -- null if personal/direct friend expense
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Expense Splits Table
create table public.expense_splits (
  id uuid default uuid_generate_v4() primary key,
  expense_id uuid references public.expenses(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  amount_owed numeric(10, 2) not null check (amount_owed >= 0),
  is_settled boolean default false not null,
  unique(expense_id, user_id)
);


-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

alter table public.profiles enable row level security;
alter table public.friends enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_splits enable row level security;

-- Profiles: Users can read all profiles (to find friends) but only update their own
create policy "Profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Friends: Users can see their own friends
create policy "Users can view their friends" on public.friends for select using (auth.uid() = user_id or auth.uid() = friend_id);
create policy "Users can add friends" on public.friends for insert with check (auth.uid() = user_id);
create policy "Users can remove friends" on public.friends for delete using (auth.uid() = user_id or auth.uid() = friend_id);

-- Groups: Users can see groups they are a member of
create policy "Users can view groups they are in" on public.groups for select using (
  exists (select 1 from public.group_members where group_id = groups.id and user_id = auth.uid())
);
create policy "Users can create groups" on public.groups for insert with check (auth.uid() = created_by);

-- Group Members: Users can see members of their groups
create policy "Users can view members of their groups" on public.group_members for select using (
  exists (select 1 from public.group_members gm where gm.group_id = group_members.group_id and gm.user_id = auth.uid())
);
create policy "Users can add members to their groups" on public.group_members for insert with check (
  exists (select 1 from public.group_members gm where gm.group_id = group_members.group_id and gm.user_id = auth.uid()) 
  or 
  -- Allow creator to add themselves during group creation
  not exists (select 1 from public.group_members gm where gm.group_id = group_members.group_id)
);

-- Expenses: Users can see expenses they paid, are part of the split, or in their groups
create policy "Users can view relevant expenses" on public.expenses for select using (
  paid_by = auth.uid() or
  exists (select 1 from public.expense_splits where expense_id = expenses.id and user_id = auth.uid()) or
  (group_id is not null and exists (select 1 from public.group_members where group_id = expenses.group_id and user_id = auth.uid()))
);
create policy "Users can insert expenses" on public.expenses for insert with check (paid_by = auth.uid());
create policy "Users can update their expenses" on public.expenses for update using (paid_by = auth.uid());
create policy "Users can delete their expenses" on public.expenses for delete using (paid_by = auth.uid());

-- Expense Splits: Users can see splits for expenses they can see
create policy "Users can view relevant splits" on public.expense_splits for select using (
  exists (select 1 from public.expenses where id = expense_splits.expense_id)
);
create policy "Users can insert splits for their expenses" on public.expense_splits for insert with check (
  exists (select 1 from public.expenses where id = expense_splits.expense_id and paid_by = auth.uid())
);


-- ==========================================
-- TRIGGERS
-- ==========================================

-- Function to automatically create a profile when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
