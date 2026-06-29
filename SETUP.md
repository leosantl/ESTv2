# StandControl — Setup & Deployment Guide

## 1. Prepare Supabase Project

- Create a new Supabase project at https://supabase.com/dashboard
- Get your **Project URL** and **Service Role Key** (not the anon key) from Settings > API
- Enable Auth (Email with password)
  - Settings > Auth > Providers > Email: Disable "Confirm email" for faster dev

## 2. Run Migrations

Via Supabase Dashboard SQL Editor (or CLI):

```bash
# Copy-paste contents of each file in order:
supabase/migrations/001_core.sql
supabase/migrations/002_operational.sql
supabase/migrations/003_rls.sql
supabase/migrations/004_storage.sql
supabase/migrations/005_views_functions.sql
```

Or with CLI:

```bash
supabase db push
```

## 3. Run Seed (Optional — Test Data)

SQL Editor:

```sql
-- Copy contents of supabase/seed/seed.sql
```

Test company ID: `a0000000-0000-0000-0000-000000000001`

## 4. Deploy Edge Functions

```bash
# Install Supabase CLI
npm install -g supabase

# Deploy functions
supabase functions deploy invite-user
supabase functions deploy webhook-asaas
supabase functions deploy check-subscriptions
```

## 5. Configure Environment

Create `.env` (frontend):

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
```

Configure Edge Functions secrets:

```bash
supabase secrets set ASAAS_WEBHOOK_TOKEN=your_token_here
supabase secrets set INVITE_REDIRECT_URL=https://yourdomain.com/invite
```

## 6. Install & Run Frontend

```bash
npm install
npm run dev
```

Visit: http://localhost:5173

## 7. Test Login

Use test credentials:

**Super Admin (full access):**
- Email: `admin@standcontrol.com.br`
- Password: `superadmin123`

**Company Admin (Tático Preciso):**
- Email: `admin@tatico.cac` 
- Password: `admin123`

Or sign up a new company via the **Onboarding** flow.

## 8. Integration with Asaas (Optional)

For real payments:

1. Create Asaas account at https://asaas.com
2. Get API key from settings
3. Configure webhook in Asaas dashboard:
   - URL: `https://your-project.supabase.co/functions/v1/webhook-asaas`
   - Token: Set in edge function secrets as `ASAAS_WEBHOOK_TOKEN`
4. Edge function creates customers and charges when companies sign up

## 9. Production Deployment

### Frontend (Vercel, Netlify, etc.)

```bash
npm run build
```

Deploy the `dist/` folder.

Set environment variables in your deployment platform's dashboard.

### Database Backups

Enable automated backups in Supabase Settings > Backups.

### Monitoring

- Check Supabase Logs > Postgres > Recent slow queries
- Monitor RLS policy errors in Auth > User logs
- Set up alerts for failed webhook deliveries

## Troubleshooting

**RLS error "row-level security policy prevented":**
- Ensure user is authenticated and has correct company_id in profiles table
- Check RLS policies are enabled and correct

**Edge Functions timing out:**
- May need Service Role Key instead of Anon Key for some operations
- Increase timeout in function settings if needed

**Seed data not appearing:**
- Check if migrations were applied in correct order
- Verify company_id UUIDs match across tables

**File uploads fail:**
- Check storage bucket "documentos" exists
- Verify RLS policies allow authenticated users
- Ensure file size < 10MB

---

**Need help?** Check Supabase docs: https://supabase.com/docs
