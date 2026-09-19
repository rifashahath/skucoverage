# Supabase setup

1. Run the migration in `migrations/20260912140000_create_users_rls.sql` from the Supabase SQL Editor or with the Supabase CLI.
2. In Supabase Authentication → Providers, enable Email and Google.
3. Add these redirect URLs in Authentication → URL Configuration:
   - `http://localhost:3000/app/`
   - `https://skucoverage.tech/app/`
   - `https://skucoverage.pages.dev/app/`
4. Configure the app build with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from `app/.env.example`.

The `public.users` table is protected by RLS. Users can only select, insert, or update the profile row whose `id` matches `auth.uid()`. A trigger creates the profile automatically whenever a new Supabase Auth user is created.
