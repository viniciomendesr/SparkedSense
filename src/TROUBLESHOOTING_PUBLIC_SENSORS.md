# Troubleshooting Public Sensors Collection

## Issue: No sensors appearing on homepage or public collection page

### Quick Diagnostics

1. **Check Browser Console**
   - Open browser developer tools (F12)
   - Look for console logs:
     - "Featured sensors loaded: X" (homepage)
     - "Public sensors loaded: X" (public collection page)
   - Check for any error messages

2. **Check Backend Logs**
   - Open Supabase Edge Functions logs
   - Look for:
     - "Found X total sensors in database"
     - "Sensor [name] has X public dataset(s)"
     - "Returning X public sensors"
     - "Found X sensors with public datasets"

### Common Issues and Solutions

#### Issue: "Featured sensors loaded: 0" or "Public sensors loaded: 0"

**Cause**: No datasets have been marked as public yet.

**Solution**:
1. Sign in to your account
2. Navigate to a sensor detail page
3. Go to the "Datasets" tab
4. Either:
   - Create a new dataset with "Make Dataset Public" toggled ON
   - Toggle an existing dataset's Public/Private switch to "Public"
5. Wait for the dataset to be anchored (status should show "Anchored")
6. Refresh the homepage or public collection page

#### Issue: Backend shows "Found X sensors with public datasets" but frontend shows 0

**Cause**: API response format mismatch or network error.

**Solution**:
1. Check the Network tab in browser dev tools
2. Look for requests to:
   - `/public/sensors/featured` (homepage)
   - `/public/sensors` (public collection)
3. Verify the response format matches: `{ sensors: [...] }`
4. Check for CORS errors or 500 status codes

#### Issue: Dataset visibility toggle doesn't work

**Cause**: Missing access token or backend update endpoint not working.

**Solution**:
1. Ensure you're signed in (access token must be present)
2. Check browser console for error messages
3. Verify the backend `/datasets/:id` PUT endpoint is working
4. Check that the dataset update includes the `isPublic` field

#### Issue: Dataset shows as Public but doesn't appear in collection

**Cause**: Dataset might not be anchored yet, or cache issue.

**Solution**:
1. Verify dataset status is "Anchored" (not "Preparing" or "Anchoring")
2. Try hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
3. Check if the sensor has at least ONE public dataset that is anchored
4. Wait a few seconds and refresh again

## Validation Checklist

Use this checklist to verify everything is working:

- [ ] Can create a new dataset with "Make Dataset Public" toggle
- [ ] Can toggle existing dataset between Public and Private
- [ ] Toast notifications appear when toggling visibility
- [ ] Public badge appears on public datasets in the sensor detail page
- [ ] Homepage shows "Featured Public Sensors" section (if any public sensors exist)
- [ ] Clicking "View Public Sensors" shows the collection page
- [ ] Public collection page lists all sensors with public datasets
- [ ] Can click on a sensor to view its audit page
- [ ] Audit page shows dataset details and verification data
- [ ] Backend logs show correct sensor and dataset counts

## Debug Commands

### Check if datasets have isPublic field

In the Supabase dashboard, query the KV store:
```sql
SELECT * FROM kv_store_4a89e1c9 WHERE key LIKE 'dataset:%';
```

Look for the `isPublic` field in the value column. It should be `true` or `false`.

### Manually set a dataset to public (if needed)

1. Get the dataset key from the KV store
2. Update the value to include `"isPublic": true`
3. Save the changes

### Verify sensor count

Count all sensors:
```sql
SELECT COUNT(*) FROM kv_store_4a89e1c9 WHERE key LIKE 'sensor:%';
```

## Expected Behavior

### Normal Flow
1. User creates sensor → sensor exists in database
2. User creates readings → readings are stored and associated with sensor
3. User creates dataset with public flag → dataset stored with `isPublic: true`
4. Dataset gets anchored → status changes to "anchored"
5. Public API picks up sensor → sensor appears in public collection
6. Homepage shows top 3 → sorted by most recent activity

### Data Requirements
- At least 1 sensor must exist
- At least 1 dataset must have `isPublic: true`
- That dataset should have status "anchored" for best results
- Sensor should have at least 1 reading for meaningful display

## Need More Help?

If issues persist:
1. Check all console logs (both browser and backend)
2. Verify database structure in Supabase dashboard
3. Test with a fresh dataset creation
4. Ensure backend server is running and accessible
5. Check for any TypeScript compilation errors
