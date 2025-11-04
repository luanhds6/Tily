# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/4a85b927-5679-45be-b008-36389534d73e

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/4a85b927-5679-45be-b008-36389534d73e) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
 - Supabase (database)

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/4a85b927-5679-45be-b008-36389534d73e) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
## Supabase Setup (Database)

To use Supabase as the database for tickets and messages, follow these steps:

1. Create a project in Supabase (https://supabase.com) and get your `Project URL` and `anon` public key.
2. Create a `.env` file in the project root with:

```
VITE_SUPABASE_URL=<your_project_url>
VITE_SUPABASE_ANON_KEY=<your_anon_public_key>
```

3. Create the tables using SQL in Supabase (SQL Editor):

```sql
-- Tickets table
create table if not exists public.tickets (
  id text primary key,
  author_id text not null,
  author_name text not null,
  title text not null,
  description text,
  category text,
  priority text,
  status text,
  created_at timestamptz default now(),
  updated_at timestamptz,
  resolved_at timestamptz,
  assigned_to text,
  assigned_to_name text,
  tags jsonb default '[]',
  sla integer default 24
);

-- Messages table
create table if not exists public.messages (
  id text primary key,
  ticket_id text not null references public.tickets(id) on delete cascade,
  author_id text not null,
  author_name text not null,
  text text,
  attachments jsonb default '[]',
  created_at timestamptz default now()
);

-- Enable Row Level Security as needed
alter table public.tickets enable row level security;
alter table public.messages enable row level security;

-- Simple policies (public read/write for demo; tighten in production)
create policy "tickets read" on public.tickets for select using (true);
create policy "tickets write" on public.tickets for insert with check (true);
create policy "tickets update" on public.tickets for update using (true);
create policy "tickets delete" on public.tickets for delete using (true);

create policy "messages read" on public.messages for select using (true);
create policy "messages write" on public.messages for insert with check (true);
create policy "messages delete" on public.messages for delete using (true);

-- Chat messages table (internal chat between users and support)
create table if not exists public.chat_messages (
  id text primary key,
  room_id text not null, -- room per user (use the user's id)
  sender_id text not null,
  sender_name text not null,
  text text,
  created_at timestamptz default now()
);

-- Realtime configuration
alter table public.chat_messages replica identity full;
```

To support file/image attachments in chat, add the `attachments` column:

```sql
alter table public.chat_messages
  add column if not exists attachments jsonb default '[]'::jsonb;
```

Each attachment stored follows:

```json
{
  "name": "print.png",
  "type": "image/png",
  "dataUrl": "data:image/png;base64,...",
  "size": 102400
}
```

4. Install dependencies and run the app:

```
npm install
npm run dev
```

The app will optimistically update the UI and persist to Supabase when configured. If env variables are missing, it falls back to localStorage.

### Internal Chat
- Users chat with support in a room identified by their user id.
- Admins can select which user room to view/respond in the Chat screen.
- Messages are stored in `public.chat_messages` and stream in Realtime.
- Notifications are triggered on incoming messages from other participants.
