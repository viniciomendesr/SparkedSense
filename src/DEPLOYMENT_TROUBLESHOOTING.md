# Deployment Troubleshooting Guide

## "Failed to fetch" Errors

If you're seeing errors like:
```
Failed to load featured sensors: TypeError: Failed to fetch
Failed to load public sensors: TypeError: Failed to fetch
```

This means the frontend cannot reach the backend API. Here's how to fix it:

---

## Solution Steps

### 1. ✅ Verify Supabase Edge Function is Deployed

The most common cause is that the Edge Function hasn't been deployed yet.

**Check deployment status:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Edge Functions**
4. Look for the `server` function

**If not deployed, deploy it:**
```bash
# Make sure you're in the project directory
cd sparked-sense

# Deploy the Edge Function
supabase functions deploy server

# Or if using the Supabase CLI
npx supabase functions deploy server
```

### 2. ✅ Test the Health Endpoint

After deploying, test the API:

```bash
curl https://djzexivvddzzduetmkel.supabase.co/functions/v1/make-server-4a89e1c9/health
```

**Expected Response:**
```json
{"status":"ok"}
```

**If you get an error:**
- Check the Edge Function logs in Supabase Dashboard
- Verify the function deployed successfully
- Check for any syntax errors in the server code

### 3. ✅ Verify Environment Variables

Make sure your project has the correct Supabase project ID:

**Check `/utils/supabase/info.tsx`:**
```typescript
export const projectId = "djzexivvddzzduetmkel"
export const publicAnonKey = "eyJhbG..."
```

**The API base URL should be:**
```
https://djzexivvddzzduetmkel.supabase.co/functions/v1/make-server-4a89e1c9
```

### 4. ✅ Check CORS Settings

The Edge Function should have CORS enabled. Verify in `/supabase/functions/server/index.tsx`:

```typescript
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);
```

### 5. ✅ Test Public API Endpoints

Test the endpoints that are failing:

```bash
# Test featured sensors
curl https://djzexivvddzzduetmkel.supabase.co/functions/v1/make-server-4a89e1c9/public/sensors/featured

# Test public sensors list
curl https://djzexivvddzzduetmkel.supabase.co/functions/v1/make-server-4a89e1c9/public/sensors
```

**Expected Response:**
```json
{
  "sensors": []  // or array of sensors if any exist
}
```

---

## Common Issues & Fixes

### Issue 1: "Function not found"

**Symptom:** 404 error when calling API

**Solution:**
- Deploy the Edge Function: `supabase functions deploy server`
- Wait 10-30 seconds for deployment to complete
- Try again

### Issue 2: "CORS policy blocked"

**Symptom:** Browser console shows CORS error

**Solution:**
- Verify CORS is enabled in the server code (see Step 4 above)
- Redeploy the function
- Clear browser cache and try again

### Issue 3: "Timeout" or "Network Error"

**Symptom:** Request times out or fails

**Solution:**
- Check if Supabase project is paused (free tier auto-pauses after inactivity)
- Go to Supabase Dashboard and "Resume" the project if paused
- Wait for project to fully start (can take 1-2 minutes)
- Try again

### Issue 4: Empty Response `{"sensors": []}`

**Symptom:** API works but returns no sensors

**Solution:**
- This is actually correct! You haven't created any sensors yet
- The UI will show "No Public Sensors Available"
- Create a mock sensor from the Dashboard to populate data

---

## Creating Test Data

To test the public sensors pages, you need to create some sensors:

### Step 1: Sign Up / Sign In
1. Click "Sign In" in the header
2. Create a new account
3. You'll be redirected to the Dashboard

### Step 2: Create a Mock Sensor
1. Click "Register New Sensor"
2. Fill in:
   - **Name**: Test Temperature Sensor
   - **Type**: temperature
   - **Mode**: Mock Data
   - **Visibility**: Public
3. Click "Register"

### Step 3: Wait for Data
- Mock sensors auto-generate data every 5 seconds
- After 10-15 seconds, reload the page
- You should see the sensor with data

### Step 4: Verify Public Access
1. Sign out (or open incognito window)
2. Visit `/public-sensors`
3. You should see your public sensor listed

---

## Debugging Tips

### Check Edge Function Logs
1. Go to Supabase Dashboard
2. Navigate to **Edge Functions** → **server**
3. Click **Logs**
4. Look for errors or API call logs

### Check Browser Console
1. Open DevTools (F12)
2. Go to **Console** tab
3. Look for error messages
4. Check **Network** tab for failed requests

### Test API Directly
Use the browser or Postman to test endpoints:

```
GET https://djzexivvddzzduetmkel.supabase.co/functions/v1/make-server-4a89e1c9/public/sensors
```

You should get a JSON response, not an HTML error page.

---

## Expected Behavior

### Before Creating Sensors:
- ✅ API returns `{"sensors": []}`
- ✅ UI shows "No Public Sensors Available"
- ✅ No errors in console

### After Creating Public Mock Sensors:
- ✅ API returns array of sensors
- ✅ UI displays sensor cards
- ✅ Featured sensors show on home page
- ✅ Data updates every 5 seconds

---

## Still Having Issues?

### 1. Check Project Status
- Go to Supabase Dashboard
- Verify project is **Active** (not paused)
- Check for any service interruptions

### 2. Verify Database Setup
- Make sure you ran the migration: `/supabase/migrations/001_initial_schema.sql`
- Check that KV store table exists: `kv_store_4a89e1c9`

### 3. Redeploy Everything
```bash
# Redeploy Edge Function
supabase functions deploy server

# Restart frontend
npm run dev
```

### 4. Clear Everything and Start Fresh
```bash
# Clear browser cache
# Clear local storage
# Sign out and sign back in
# Create new test sensor
```

---

## Quick Verification Checklist

- [ ] Edge Function deployed successfully
- [ ] Health endpoint responds with `{"status":"ok"}`
- [ ] CORS headers are set correctly
- [ ] Project is active (not paused)
- [ ] Environment variables match your project
- [ ] KV store table exists in database
- [ ] At least one mock sensor created for testing
- [ ] Browser console shows no errors
- [ ] Network tab shows successful API calls

---

## Success Indicators

When everything is working correctly, you should see:

1. ✅ Home page loads without errors
2. ✅ Featured sensors section appears (empty or with sensors)
3. ✅ Public Sensors page loads
4. ✅ "Try Again" button not shown (no fetch errors)
5. ✅ Browser console is clean (no red errors)
6. ✅ Mock sensors generate data every 5 seconds

---

## Contact Support

If you've tried everything and still have issues:

1. Check the Edge Function logs for detailed error messages
2. Review the `/BACKEND_INTEGRATION_GUIDE.md` for API documentation
3. Check the `/INTEGRATION_CHECKLIST.md` for setup steps
4. Verify your Supabase project is on a compatible plan

---

**Last Updated:** 2025-01-30  
**For:** Sparked Sense Backend Integration
