# Sparked Sense - Database Setup Instructions

## Quick Setup Guide

Follow these steps to set up your unified Supabase instance for Sparked Sense.

## Prerequisites

- Active Supabase project
- Supabase Dashboard access
- Environment variables configured

## Step-by-Step Setup

### 1. Access Supabase SQL Editor

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**

### 2. Run the Migration Script

1. Open the file: `/supabase/migrations/001_initial_schema.sql`
2. Copy the **entire contents** of the file
3. Paste into the SQL Editor
4. Click **Run** (or press Ctrl/Cmd + Enter)

Expected output:
```
Success. No rows returned
```

### 3. Verify Tables Were Created

1. Click on **Table Editor** in the left sidebar
2. You should see these tables:
   - ✅ users
   - ✅ devices
   - ✅ sensor_readings
   - ✅ datasets
   - ✅ audit_logs

### 4. Check Row Level Security (RLS)

1. Click on any table (e.g., `devices`)
2. Look for the shield icon 🛡️ - it should show "RLS Enabled"
3. Click **View Policies** to see the security policies

### 5. Verify Environment Variables

Make sure these are set in your Supabase project:

#### Frontend `.env` file:
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

#### Backend (Supabase Edge Functions):
These should be automatically available in Edge Functions:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 6. Test the Setup

#### Test 1: Health Check
```bash
curl https://your-project.supabase.co/functions/v1/make-server-4a89e1c9/health
# Expected: {"status":"ok"}
```

#### Test 2: Create Account
```bash
curl -X POST https://your-project.supabase.co/functions/v1/make-server-4a89e1c9/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

#### Test 3: Sign In
```bash
curl -X POST https://your-project.supabase.co/functions/v1/make-server-4a89e1c9/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

Save the `accessToken` from the response for the next tests.

#### Test 4: Create a Mock Sensor
```bash
curl -X POST https://your-project.supabase.co/functions/v1/make-server-4a89e1c9/sensors \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "Test Temperature Sensor",
    "type": "temperature",
    "description": "Test sensor",
    "visibility": "public",
    "mode": "mock"
  }'
```

#### Test 5: View Public Sensors
```bash
curl https://your-project.supabase.co/functions/v1/make-server-4a89e1c9/public/sensors
# Should return the sensor you just created
```

### 7. Check Mock Data Generation

Wait 5-10 seconds, then check if readings are being generated:

```bash
curl https://your-project.supabase.co/functions/v1/make-server-4a89e1c9/public/readings/YOUR_SENSOR_ID?limit=10
```

You should see automatically generated mock readings!

## Troubleshooting

### Issue: "relation does not exist" error

**Solution:** The migration didn't run properly. Try these steps:
1. Drop all tables manually (if they exist partially)
2. Re-run the migration script
3. Check for syntax errors in the SQL

### Issue: "Unauthorized" error when creating sensors

**Solution:** 
1. Verify your access token is valid
2. Check that you're including the token in the Authorization header
3. Try signing in again to get a fresh token

### Issue: Mock data not generating

**Solution:**
1. Check Edge Function logs: Dashboard → Edge Functions → server → Logs
2. Verify the sensor has `mode: "mock"` and `status: "active"`
3. Wait at least 10 seconds after creating the sensor

### Issue: Public sensors not visible

**Solution:**
1. Verify sensor has `visibility: "public"`
2. Check RLS policies are enabled
3. Try querying directly from Table Editor

### Issue: Database connection errors

**Solution:**
1. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
2. Check that your Supabase project is not paused
3. Verify you're within your project's rate limits

## Database Maintenance

### View All Tables:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

### Check RLS Status:
```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

### View Table Row Counts:
```sql
SELECT 
  'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL SELECT 'devices', COUNT(*) FROM devices
UNION ALL SELECT 'sensor_readings', COUNT(*) FROM sensor_readings
UNION ALL SELECT 'datasets', COUNT(*) FROM datasets
UNION ALL SELECT 'audit_logs', COUNT(*) FROM audit_logs;
```

### Manual Data Cleanup (use with caution!):
```sql
-- Delete all test data
DELETE FROM sensor_readings;
DELETE FROM datasets;
DELETE FROM devices;
-- Users table is protected by FK constraints
```

## Next Steps

After successful setup:

1. ✅ Test user registration and login
2. ✅ Create a few mock sensors
3. ✅ Verify mock data generation
4. ✅ Create and anchor a dataset
5. ✅ Test public API endpoints
6. ✅ Connect frontend to backend
7. ✅ Test real-time subscriptions

## Production Checklist

Before going to production:

- [ ] Disable sample data insertion in migration (if enabled)
- [ ] Configure proper Solana wallet for anchoring
- [ ] Set up database backups
- [ ] Configure monitoring and alerts
- [ ] Review and adjust RLS policies if needed
- [ ] Set up rate limiting
- [ ] Enable database connection pooling
- [ ] Configure CORS for production domains only

## Support Resources

- **Supabase Docs**: https://supabase.com/docs
- **Backend Integration Guide**: `/BACKEND_INTEGRATION_GUIDE.md`
- **Edge Functions Logs**: Dashboard → Edge Functions → server → Logs
- **Database Logs**: Dashboard → Database → Logs

## Schema Diagram

```
users
  ↓ (owner_user_id)
devices
  ↓ (sensor_id)
sensor_readings
  ↓ (sensor_id)
datasets
  ↓ (entity_id)
audit_logs
```

## Backup and Recovery

### Create Backup:
```bash
# From Supabase Dashboard:
# Settings → Database → Backups → Create Backup
```

### Restore from Backup:
```bash
# Settings → Database → Backups → Restore
```

---

**Need Help?** Check the main integration guide at `/BACKEND_INTEGRATION_GUIDE.md`
