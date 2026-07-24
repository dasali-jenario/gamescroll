# UGC Game Creator setup

Canonical creator URL: **https://play.thehappylab.com/create**

## Cursor / CLI setup (preferred)

With these keys in `.env.local`:

- `SUPABASE_PROJECT_REF`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_ACCESS_TOKEN` (from [Account → Access Tokens](https://supabase.com/dashboard/account/tokens))
- `OPENAI_API_KEY`
- optional: `SUPABASE_REGION`, `OPENAI_MODEL`

Run:

```bash
node scripts/setup-supabase.mjs
```

That script (via Management API + CLI):

1. Applies `supabase/migrations/20260723120000_ugc_games.sql`
2. Writes `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` into `.env.local`
3. Sets Edge secrets (`PUBLIC_SITE_URL`, `OPENAI_API_KEY`)
4. Deploys the `creator` Edge Function
5. Configures Auth redirects for `/create`

## Moderators

After you sign in once at `/create`, get your user id from Auth → Users, then:

```sql
insert into public.moderators (user_id)
values ('YOUR_AUTH_USER_UUID');
```

Or ask Cursor to run that SQL for you.

## Hostinger SPA routes

`public/.htaccess` rewrites unknown paths to `index.html` so `/create` and `/mod` work on hard refresh. Redeploy `dist/` after build.

## Flow

1. User opens `/create`, magic-link signs in.
2. Chat interviews → Edge Function generates bridge-compatible HTML → Storage + `ugc_games` draft.
3. **Publish** → `published` (shareable via `?g=<slug>` immediately).
4. Moderator **Approve** → `approved` (enters main feed mix).
