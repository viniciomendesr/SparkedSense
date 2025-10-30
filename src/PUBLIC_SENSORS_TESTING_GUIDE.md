# Public Sensors Collection - Testing Guide

This guide will walk you through testing the complete public sensors feature.

## Prerequisites

- Access to Sparked Sense application
- A registered account (for creating sensors and datasets)
- At least one sensor registered to your account

## Test Scenario 1: Create a Public Dataset from Scratch

### Steps:

1. **Sign in to your account**
   - Navigate to the application
   - Click "Sign In" and enter credentials
   - Verify you're redirected to the dashboard

2. **Navigate to a sensor**
   - Click on any sensor card in your dashboard
   - You should see the sensor detail page with two tabs: "Live Stream" and "Datasets"

3. **Create a public dataset**
   - Click the "Datasets" tab
   - Click "Create Dataset" button
   - Fill in the form:
     - **Dataset Name**: "Test Public Dataset"
     - **Start Date**: Select a date in the past (e.g., 7 days ago)
     - **End Date**: Select today's date
     - **Make Dataset Public**: Toggle this switch to ON (should be blue)
   - Click "Create Dataset"

4. **Verify dataset creation**
   - You should see a toast notification: "Dataset creation started"
   - After ~2-3 seconds, another toast: "Dataset anchored on Solana!"
   - The dataset should appear in the list with:
     - Status badge: "Anchored" (green)
     - Public badge: "Public" (blue)
     - A toggle switch showing "Public" status

5. **Verify on homepage**
   - Navigate back to homepage (click logo or home link)
   - Scroll down to "Featured Public Sensors" section
   - Your sensor should appear in the top 3 (if it's one of the most recent)
   - Card should show:
     - Sensor name
     - Sensor type
     - Status indicator
     - Public Datasets count
     - Verified datasets count
     - Total readings count

6. **Verify in public collection**
   - Click "View Public Sensors" button on homepage
   - You should see your sensor listed
   - Click on the sensor card to expand it
   - Click "View & Audit Data" button
   - Verify you can see the audit page with dataset details

### Expected Results:
✅ Dataset created successfully  
✅ Public badge appears on dataset  
✅ Sensor appears on homepage (top 3)  
✅ Sensor appears in public collection  
✅ Audit page loads correctly  
✅ All data displays correctly  

---

## Test Scenario 2: Toggle Existing Dataset to Public

### Steps:

1. **Navigate to sensor detail page**
   - Go to dashboard
   - Click on a sensor that has existing datasets
   - Click "Datasets" tab

2. **Toggle a private dataset to public**
   - Find a dataset that shows "Private" status
   - Click the toggle switch next to "Private"
   - Verify toast notification: "Dataset is now public"
   - Verify the text changes from "Private" to "Public"
   - Verify the blue "Public" badge appears

3. **Verify changes propagate**
   - Navigate to homepage
   - Check if sensor appears in "Featured Public Sensors"
   - Navigate to public collection
   - Verify sensor is listed

4. **Toggle back to private**
   - Return to sensor detail page → Datasets tab
   - Toggle the switch back to OFF
   - Verify toast notification: "Dataset is now private"
   - Verify text changes to "Private"
   - Verify blue "Public" badge disappears

5. **Verify removal from public views**
   - Navigate to homepage
   - If this was the only public dataset for this sensor, it should not appear in featured sensors
   - Navigate to public collection
   - Sensor should not be listed (if no other public datasets)

### Expected Results:
✅ Toggle switch works smoothly  
✅ Toast notifications appear  
✅ UI updates immediately  
✅ Homepage updates correctly  
✅ Public collection updates correctly  
✅ Private datasets don't appear publicly  

---

## Test Scenario 3: Public View (Unauthenticated)

### Steps:

1. **Sign out** (if signed in)
   - Click user menu
   - Click "Sign Out"

2. **View homepage as visitor**
   - Navigate to homepage
   - Verify "Featured Public Sensors" section is visible
   - Verify sensor cards display correct information
   - Click on a featured sensor card
   - Verify you're taken to the audit page

3. **Browse public collection**
   - Return to homepage
   - Click "View Public Sensors" button
   - Verify you can see the collection page
   - Click on a sensor card to expand it
   - Click "View & Audit Data"
   - Verify audit page loads

4. **Test data request**
   - On public collection page, expand a sensor
   - Click "Request Dataset" button
   - Verify email client opens with pre-filled subject and body
   - Email should include sensor name, type, and ID

### Expected Results:
✅ Homepage accessible without login  
✅ Featured sensors visible  
✅ Public collection accessible  
✅ Audit pages accessible  
✅ Request email link works  
✅ No private data visible  

---

## Test Scenario 4: Edge Cases

### Test A: No Public Sensors

1. **Make all datasets private**
   - Sign in
   - For each sensor, toggle all public datasets to private

2. **Check homepage**
   - Navigate to homepage
   - Verify "Featured Public Sensors" section does NOT appear

3. **Check public collection**
   - Click "View Public Sensors"
   - Verify empty state message appears:
     - "No Public Sensors Available"
     - Helpful text about checking back later

### Test B: Multiple Public Datasets per Sensor

1. **Create multiple public datasets**
   - Create 3 public datasets for the same sensor
   - Verify all show "Public" badge

2. **Check counts**
   - Navigate to homepage
   - Verify "Public Datasets" count shows 3
   - Navigate to public collection
   - Click sensor card
   - Verify all 3 datasets are accessible via audit

### Test C: Unanchored Public Datasets

1. **Create a public dataset**
   - Create new dataset with public toggle ON
   - Immediately after creation (before anchoring completes)

2. **Check visibility**
   - Navigate to homepage
   - Sensor should appear (as long as it has at least 1 public dataset)
   - But "Verified" count might be 0

### Expected Results:
✅ Empty states display correctly  
✅ Multiple datasets handled properly  
✅ Counts are accurate  
✅ Unanchored datasets handled gracefully  

---

## Test Scenario 5: Performance & Reliability

### Steps:

1. **Create many public sensors**
   - Create 5+ sensors
   - Create public datasets for each
   - Verify homepage shows only top 3

2. **Test sorting**
   - Create a new reading for an older sensor
   - Refresh homepage
   - Verify sensor order updates (most recent activity first)

3. **Test real-time updates**
   - Open sensor detail page in one tab
   - Open homepage in another tab
   - Toggle dataset to public in sensor detail
   - Refresh homepage
   - Verify sensor appears

4. **Check console for errors**
   - Open browser console
   - Perform all actions
   - Verify no JavaScript errors
   - Check for logging messages:
     - "Featured sensors loaded: X"
     - "Public sensors loaded: X"

### Expected Results:
✅ Only top 3 featured sensors shown  
✅ Sorting works correctly  
✅ No console errors  
✅ Helpful debug logs present  
✅ UI responsive and smooth  

---

## Debugging Tips

### If sensors don't appear:

1. **Check browser console**
   ```
   Featured sensors loaded: 0  ← Should be > 0
   Public sensors loaded: 0    ← Should be > 0
   ```

2. **Check backend logs** (Supabase Edge Functions)
   ```
   Found X total sensors in database
   Sensor [name] has X public dataset(s)
   Returning X public sensors
   ```

3. **Verify dataset structure**
   - Go to sensor detail → Datasets tab
   - Verify dataset has:
     - Status: "Anchored" (green badge)
     - Public badge visible
     - Toggle switch shows "Public"

4. **Hard refresh**
   - Press Ctrl+Shift+R (Windows/Linux)
   - Press Cmd+Shift+R (Mac)
   - Clear cache if needed

### Common Issues:

| Issue | Solution |
|-------|----------|
| Sensors don't appear | Ensure datasets have `isPublic: true` AND status is "anchored" |
| Toggle doesn't work | Check if you're signed in, check console for errors |
| Empty state on homepage | Correct - means no public sensors exist yet |
| Count mismatch | Wait a few seconds and refresh, check for pending anchor operations |

---

## Success Criteria

The feature is working correctly if:

- ✅ Users can create public datasets via dialog
- ✅ Users can toggle existing datasets between public/private
- ✅ Homepage shows top 3 public sensors when available
- ✅ Public collection page lists all sensors with public datasets
- ✅ Unauthenticated users can view public sensors and audit data
- ✅ Private datasets are never visible in public views
- ✅ Counts and metrics are accurate
- ✅ UI updates in real-time
- ✅ No console errors
- ✅ Empty states are handled gracefully

## Next Steps

After successful testing:
1. Create demo sensors with public datasets
2. Monitor backend logs for any issues
3. Gather user feedback on the feature
4. Consider additional enhancements (filters, search, etc.)
