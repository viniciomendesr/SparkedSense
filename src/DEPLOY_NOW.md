# 🚀 Deploy Now - Complete Deployment Guide

## Current Status

✅ **Auth Fixed** - Sign up/sign in now works WITHOUT Edge Function  
❌ **Edge Function** - Not deployed yet (needed for sensors/data features)  
❌ **Database** - Migration not run yet  

---

## 🎯 Quick Start (2 Steps)

### Step 1: Enable Authentication (1 minute)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/djzexivvddzzduetmkel)
2. Click **Authentication** → **Providers** → **Email**
3. **Turn OFF** "Confirm email"
4. Click **Save**

✅ **Result:** You can now sign up and sign in!

### Step 2: Deploy Edge Function (2 minutes)

```bash
# Make sure you're in the project directory
cd sparked-sense

# Deploy the Edge Function
supabase functions deploy server

# Wait for deployment to complete...
# Expected: "Deployed Function server successfully"
```

✅ **Result:** All features now work!

---

## 🔧 Detailed Setup

### Prerequisites

- Supabase CLI installed
- Supabase project created (ID: `djzexivvddzzduetmkel`)
- Project linked to Supabase

### Step-by-Step Deployment

#### 1. Verify Supabase Connection

```bash
# Check if you're logged in
supabase status

# If not linked, link your project
supabase link --project-ref djzexivvddzzduetmkel
```

#### 2. Run Database Migration

```bash
# Apply the database schema
supabase db push

# Or manually run the migration
supabase db reset
```

**What this does:**
- Creates 5 tables: devices, sensor_data, datasets, claims, hourly_merkle_roots
- Sets up foreign key relationships
- Configures Row Level Security (RLS) policies
- Creates indexes for performance

#### 3. Deploy Edge Function

```bash
# Deploy the server function
supabase functions deploy server

# Test the deployment
curl https://djzexivvddzzduetmkel.supabase.co/functions/v1/make-server-4a89e1c9/health

# Expected response: {"status":"ok"}
```

#### 4. Disable Email Confirmation

1. Open [Authentication Settings](https://supabase.com/dashboard/project/djzexivvddzzduetmkel/auth/providers)
2. Find **Email** provider
3. Toggle **OFF**: "Confirm email"
4. Click **Save**

---

## ✅ Verification Checklist

After deployment, verify everything works:

### Test Authentication

```bash
# 1. Open the app
# 2. Click "Sign In"
# 3. Switch to "Sign Up" tab
# 4. Create account:
#    - Email: test@example.com
#    - Password: password123
#    - Name: Test User
# 5. Should auto sign-in and redirect to Dashboard
```

**Expected:**
- ✅ Account created
- ✅ Auto signed in
- ✅ Name appears in header
- ✅ No errors in console

### Test Edge Function

```bash
# Test health endpoint
curl https://djzexivvddzzduetmkel.supabase.co/functions/v1/make-server-4a89e1c9/health

# Test public sensors
curl https://djzexivvddzzduetmkel.supabase.co/functions/v1/make-server-4a89e1c9/public/sensors

# Expected: {"sensors":[]} or array of sensors
```

### Test Database

```bash
# Check if tables exist
supabase db dump --data-only

# You should see tables like:
# - kv_store_4a89e1c9
# - devices
# - sensor_data
# - datasets
# - claims
# - hourly_merkle_roots
```

---

## 🎨 Test with Mock Data

Create a test sensor to verify everything works:

### 1. Sign In

```
Email: test@example.com
Password: password123
```

### 2. Register a Mock Sensor

1. Click "Register New Sensor"
2. Fill in:
   - **Name**: Test Temperature Sensor
   - **Type**: temperature
   - **Location**: Lab
   - **Mode**: Mock Data (auto-generates data)
   - **Visibility**: Public
3. Click "Register Sensor"

### 3. Wait for Data

- Mock sensors auto-generate data every 5 seconds
- After 10-15 seconds, reload the page
- You should see readings appearing

### 4. Verify Public Display

1. Sign out (or open incognito window)
2. Visit home page
3. Check "Featured Public Sensors" section
4. Your test sensor should appear
5. Click to view details

---

## 🐛 Troubleshooting

### Issue: "Failed to fetch" errors

**Symptoms:**
- Featured sensors won't load
- Public sensors page shows error
- Dashboard is empty

**Solution:**
```bash
# 1. Deploy Edge Function
supabase functions deploy server

# 2. Wait 30 seconds
# 3. Refresh the page
# 4. Try again
```

### Issue: Sign up doesn't work

**Symptoms:**
- Sign up button does nothing
- Error: "Email not confirmed"

**Solution:**
1. Go to Supabase Dashboard
2. Authentication → Providers → Email
3. Turn OFF "Confirm email"
4. Save
5. Try again with NEW email

### Issue: Edge Function won't deploy

**Symptoms:**
- `supabase functions deploy` fails
- Module not found errors

**Solution:**
```bash
# Make sure you're in the project root
cd sparked-sense

# Check if files exist
ls -la supabase/functions/server/

# Should show:
# - index.tsx
# - kv_store.tsx
# - lib/ directory

# Try deploying again
supabase functions deploy server --no-verify-jwt
```

### Issue: Database migration fails

**Symptoms:**
- Tables don't exist
- RLS errors

**Solution:**
```bash
# Reset database (WARNING: deletes all data)
supabase db reset

# Or manually run migration
supabase migration up

# Or apply specific migration
psql $DATABASE_URL -f supabase/migrations/001_initial_schema.sql
```

---

## 📊 What Each Component Does

### Frontend
- React + TypeScript + Tailwind
- Handles UI and user interactions
- Makes API calls to Edge Function
- Uses Supabase Auth directly (no Edge Function needed)

### Edge Function (Supabase)
- REST API server (Hono framework)
- Routes: `/auth`, `/sensors`, `/readings`, `/datasets`, `/public`
- Handles sensor registration, data generation, dataset creation
- Serves public API for external access

### Database (Supabase Postgres)
- KV Store table: `kv_store_4a89e1c9` (for sensor metadata)
- Relational tables: devices, sensor_data, datasets, claims, merkle_roots
- RLS policies for security
- Real-time subscriptions enabled

### Authentication (Supabase Auth)
- Client-side auth (works without Edge Function)
- Email/password authentication
- Session persistence
- User metadata (name, etc.)

---

## 🎯 Expected Results

### After Step 1 (Auth Config)
- ✅ Sign up works
- ✅ Sign in works
- ✅ Session persists
- ❌ No sensor data yet

### After Step 2 (Edge Function)
- ✅ All auth features work
- ✅ Can register sensors
- ✅ Mock data generates
- ✅ Public sensors visible
- ✅ Dashboard shows data
- ✅ Real-time updates work

---

## 🚦 Deployment Status

| Component | Status | Action Needed |
|-----------|--------|---------------|
| Frontend | ✅ Ready | None |
| Auth Context | ✅ Updated | Disable email confirmation |
| Edge Function | ❌ Not Deployed | Run `supabase functions deploy server` |
| Database | ⚠️ Unknown | Run migration if needed |
| Environment Vars | ✅ Set | None |

---

## 📝 Environment Variables

Already configured in `/utils/supabase/info.tsx`:

```typescript
projectId = "djzexivvddzzduetmkel"
publicAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

Edge Function has these automatically:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## 🎉 Success Indicators

When fully deployed, you should see:

1. ✅ Home page loads without errors
2. ✅ Sign up creates account instantly
3. ✅ Dashboard shows registered sensors
4. ✅ Mock sensors generate data every 5 seconds
5. ✅ Featured sensors appear on home page
6. ✅ Public sensors page shows public sensors
7. ✅ Real-time updates work (data refreshes automatically)
8. ✅ No console errors
9. ✅ All API calls return 200 OK

---

## 📚 Additional Resources

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Deployment Troubleshooting Guide](/DEPLOYMENT_TROUBLESHOOTING.md)
- [Quick Auth Fix Guide](/QUICK_FIX_AUTH.md)
- [Backend Integration Guide](/BACKEND_INTEGRATION_GUIDE.md)
- [API Reference](/API_QUICK_REFERENCE.md)

---

## 🆘 Need Help?

### Check Logs

**Edge Function Logs:**
1. Go to Supabase Dashboard
2. Click **Edge Functions** → **server**
3. Click **Logs** tab
4. Look for errors

**Browser Console:**
1. Press F12
2. Go to **Console** tab
3. Look for red errors
4. Check **Network** tab for failed requests

### Common Error Messages

| Error | Meaning | Fix |
|-------|---------|-----|
| `Failed to fetch` | Edge Function not deployed | Deploy server |
| `Email not confirmed` | Email confirmation enabled | Disable it |
| `Invalid credentials` | Wrong email/password | Check credentials |
| `User already exists` | Email already registered | Sign in instead |
| `Module not found` | Missing file/import | Check file exists |

---

## 🎯 Next Steps After Deployment

1. **Create Test Sensors**
   - Register 2-3 mock sensors
   - Set visibility to "public"
   - Wait for data generation

2. **Test Public Features**
   - Visit `/public-sensors`
   - Check featured sensors on home page
   - Click sensor cards to view details

3. **Test Real Sensors** (Optional)
   - Get an ESP8266/Arduino
   - Use code from "Activate Sensor" dialog
   - Connect real hardware

4. **Explore Dashboard**
   - View sensor list
   - Check real-time data
   - Create datasets
   - Verify on blockchain (simulated for now)

---

**Last Updated:** 2025-01-30  
**Status:** Ready to Deploy  
**Time to Deploy:** ~5 minutes
