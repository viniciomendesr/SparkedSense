# ✅ Vercel Deployment Checklist

Use this checklist to ensure a smooth deployment to Vercel.

---

## 📋 Pre-Deployment Checklist

### Supabase Backend (Must Complete First!)

- [ ] **Edge Function Deployed**
  ```bash
  supabase functions deploy server
  ```
  - Verify: `curl https://djzexivvddzzduetmkel.supabase.co/functions/v1/make-server-a6d2d1a2/health`
  - Expected response: `{"status":"ok"}`

- [ ] **Database Migration Applied**
  ```bash
  supabase db push
  ```
  - Verify tables exist: devices, sensor_data, datasets, claims, hourly_merkle_roots

- [ ] **Email Confirmation Disabled**
  - Go to: [Auth Settings](https://supabase.com/dashboard/project/djzexivvddzzduetmkel/auth/providers)
  - Find "Email" provider
  - Toggle OFF "Confirm email"
  - Click "Save"

- [ ] **Test Auth Locally**
  - Sign up works ✅
  - Sign in works ✅
  - Session persists ✅

- [ ] **Test API Locally**
  - Can register sensors ✅
  - Can fetch sensors ✅
  - Public sensors visible ✅

### Git Repository

- [ ] **Code Committed to Git**
  ```bash
  git add .
  git commit -m "Prepare for Vercel deployment"
  ```

- [ ] **Pushed to GitHub/GitLab/Bitbucket**
  ```bash
  git push origin main
  ```

- [ ] **Repository is Public** (or Vercel has access)

### Configuration Files

- [ ] **vercel.json exists** ✅ (created)
- [ ] **.env.example exists** ✅ (created)
- [ ] **.gitignore exists** ✅ (created)
- [ ] **.vercelignore exists** ✅ (created)

### Package.json

- [ ] **Build script exists**
  ```json
  "scripts": {
    "build": "vite build"
  }
  ```

- [ ] **All dependencies listed**
  - Run `npm install` to verify
  - Check for missing packages

---

## 🚀 Vercel Deployment Steps

### Step 1: Import Project

- [ ] Go to [vercel.com/new](https://vercel.com/new)
- [ ] Click "Import Git Repository"
- [ ] Select your repository
- [ ] Click "Import"

### Step 2: Configure Build Settings

- [ ] **Framework Preset:** Vite (auto-detected)
- [ ] **Root Directory:** `./` (default)
- [ ] **Build Command:** `npm run build`
- [ ] **Output Directory:** `dist`
- [ ] **Install Command:** `npm install`

### Step 3: Add Environment Variables

Add these in the "Environment Variables" section:

- [ ] **VITE_SUPABASE_URL**
  - Value: `https://djzexivvddzzduetmkel.supabase.co`
  - Environments: Production, Preview, Development ✅

- [ ] **VITE_SUPABASE_ANON_KEY**
  - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqemV4aXZ2ZGR6emR1ZXRta2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3ODYzMzAsImV4cCI6MjA3NzM2MjMzMH0.hW1SyZKQRzI-ghokMb-F5uccV52vxixE0aH78lNZ1F4`
  - Environments: Production, Preview, Development ✅

**⚠️ Important:** 
- DO NOT add `SUPABASE_SERVICE_ROLE_KEY` - it should only be in Edge Functions
- Both env vars must start with `VITE_` prefix for Vite to expose them

### Step 4: Deploy

- [ ] Click "Deploy"
- [ ] Wait 2-5 minutes for build to complete
- [ ] Build succeeds ✅
- [ ] Note your deployment URL

---

## 🔧 Post-Deployment Configuration

### Supabase Auth URLs

- [ ] Go to [Supabase Auth Settings](https://supabase.com/dashboard/project/djzexivvddzzduetmkel/auth/url-configuration)

- [ ] **Add Site URL:**
  ```
  https://your-project-name.vercel.app
  ```

- [ ] **Add Redirect URLs:**
  ```
  https://your-project-name.vercel.app/**
  ```

- [ ] Click "Save"

### Custom Domain (Optional)

- [ ] Go to Vercel → Project Settings → Domains
- [ ] Click "Add Domain"
- [ ] Enter your domain
- [ ] Configure DNS records
- [ ] Wait for DNS propagation (can take 24-48 hours)
- [ ] Update Supabase Auth URLs with custom domain

---

## ✅ Verification Tests

### Test 1: Basic Deployment

- [ ] Visit your Vercel URL
- [ ] Home page loads ✅
- [ ] No 404 errors ✅
- [ ] Images and styles load correctly ✅
- [ ] No console errors ✅

### Test 2: Routing

- [ ] Visit `/dashboard` directly
  - Should load without 404 ✅
- [ ] Visit `/public-sensors`
  - Should load without 404 ✅
- [ ] Refresh on any route
  - Should not 404 ✅

### Test 3: Authentication

- [ ] Click "Sign In"
- [ ] Switch to "Sign Up" tab
- [ ] Create test account:
  - Email: `test@vercel.com`
  - Password: `testpass123`
  - Name: `Vercel Test User`
- [ ] Should redirect to dashboard ✅
- [ ] Name appears in header ✅
- [ ] Sign out works ✅
- [ ] Sign in again works ✅

### Test 4: Backend Connection

- [ ] Go to Dashboard (signed in)
- [ ] Click "Register New Sensor"
- [ ] Fill in sensor details
- [ ] Click "Register Sensor"
- [ ] Sensor appears in list ✅
- [ ] Check Network tab:
  - API calls go to `djzexivvddzzduetmkel.supabase.co` ✅
  - Status codes are 200 OK ✅

### Test 5: Public Features

- [ ] Sign out or open incognito window
- [ ] Visit home page
- [ ] Featured sensors section loads ✅
- [ ] Click "Explore All Public Sensors"
- [ ] Public sensors page loads ✅
- [ ] Click a sensor card
- [ ] Sensor detail page loads ✅

### Test 6: Real-Time Data

- [ ] Register a mock sensor (if not already)
- [ ] Wait 10-15 seconds
- [ ] Refresh page
- [ ] Data appears ✅
- [ ] Leave page open
- [ ] Data updates automatically every 5 seconds ✅

---

## 🐛 Troubleshooting

### Build Fails

**Error: Module not found**
- [ ] Run `npm install` locally
- [ ] Commit `package-lock.json`
- [ ] Push to Git
- [ ] Redeploy

**Error: TypeScript errors**
- [ ] Run `npm run build` locally
- [ ] Fix TypeScript errors
- [ ] Push to Git
- [ ] Redeploy

### Deployed App Issues

**404 on routes (e.g., /dashboard)**
- [ ] Check `vercel.json` exists
- [ ] Verify rewrite rule:
  ```json
  "rewrites": [{"source": "/(.*)", "destination": "/index.html"}]
  ```
- [ ] Redeploy

**Failed to fetch errors**
- [ ] Verify Supabase Edge Function is deployed
  ```bash
  curl https://djzexivvddzzduetmkel.supabase.co/functions/v1/make-server-a6d2d1a2/health
  ```
- [ ] Check Edge Function logs in Supabase Dashboard
- [ ] Redeploy Edge Function if needed

**Auth doesn't work**
- [ ] Verify environment variables in Vercel
- [ ] Check Supabase Auth URLs include Vercel domain
- [ ] Ensure email confirmation is disabled
- [ ] Check browser console for errors

**Blank white page**
- [ ] Check Vercel build logs
- [ ] Verify output directory is `dist`
- [ ] Check browser console for errors
- [ ] Ensure all dependencies installed

---

## 📊 Monitoring

### Check Deployment Status

- [ ] Vercel Dashboard → Deployments
- [ ] Latest deployment shows "Ready"
- [ ] No failed builds

### Monitor Logs

**Vercel Function Logs:**
- [ ] Go to Vercel → Project → Logs
- [ ] Check for errors

**Supabase Edge Function Logs:**
- [ ] Go to Supabase Dashboard → Edge Functions → server → Logs
- [ ] Monitor API calls and errors

**Browser Console:**
- [ ] Open DevTools (F12)
- [ ] Console tab: No red errors
- [ ] Network tab: All requests succeed

### Analytics (Optional)

- [ ] Enable Vercel Analytics
- [ ] Monitor page views
- [ ] Track load times
- [ ] Review error rates

---

## 🎯 Success Criteria

Your deployment is **fully successful** when ALL of these are true:

- [x] ✅ Vercel URL loads without errors
- [x] ✅ All routes work (/, /dashboard, /public-sensors, etc.)
- [x] ✅ Sign up creates account successfully
- [x] ✅ Sign in redirects to dashboard
- [x] ✅ Session persists on page refresh
- [x] ✅ Can register new sensors
- [x] ✅ Mock sensors generate data
- [x] ✅ Public sensors visible on home page
- [x] ✅ Real-time updates work
- [x] ✅ No console errors
- [x] ✅ All API calls return 200 OK
- [x] ✅ Supabase Auth URLs updated
- [x] ✅ Environment variables configured

---

## 📚 Additional Resources

- [ ] Read [VERCEL_DEPLOYMENT_GUIDE.md](./VERCEL_DEPLOYMENT_GUIDE.md) for detailed instructions
- [ ] Review [DEPLOY_NOW.md](./DEPLOY_NOW.md) for Supabase setup
- [ ] Check [API_QUICK_REFERENCE.md](./API_QUICK_REFERENCE.md) for API endpoints
- [ ] See [DEPLOYMENT_TROUBLESHOOTING.md](./DEPLOYMENT_TROUBLESHOOTING.md) for common issues

---

## 🎉 Next Steps After Deployment

- [ ] Share deployment URL with team/testers
- [ ] Create sample sensors for demo
- [ ] Test with real IoT hardware (ESP8266/Arduino)
- [ ] Set up continuous deployment
- [ ] Configure custom domain
- [ ] Enable analytics
- [ ] Set up monitoring/alerts

---

## 📝 Deployment Notes

**Date Deployed:** _______________

**Vercel URL:** _______________

**Custom Domain:** _______________

**Deployed By:** _______________

**Issues Encountered:**
- 
- 
- 

**Resolution:**
- 
- 
- 

---

**Status:** 🟢 Ready to Deploy  
**Estimated Time:** 10-15 minutes  
**Difficulty:** Easy (with checklist)

**Good luck with your deployment! 🚀**
