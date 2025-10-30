# Wallet Integration Testing Guide

## Quick Test Instructions

### Test 1: Create a Mock Sensor (No Wallet Required)
1. Navigate to Dashboard
2. Click "Register New Sensor" button
3. Select "Mock Data Sensor" mode
4. Fill out form:
   - Name: "Test Mock Sensor"
   - Type: Temperature
   - Description: "Testing mock sensor flow"
   - Visibility: Public
5. Click "Register Sensor"
6. ✅ Should proceed directly to success screen
7. ✅ Should show claim token
8. ✅ Should NOT show wallet section
9. ✅ Should show mock-specific instructions

### Test 2: Create a Real Sensor with Generated Claim Token
1. Navigate to Dashboard
2. Click "Register New Sensor" button
3. Select "Real Data Sensor" mode
4. Fill out form:
   - Name: "Test Real Sensor"
   - Type: Temperature
   - Description: "Testing real sensor with wallet"
   - Visibility: Public
5. Click "Register Sensor"
6. ✅ Should show "Connect to Blockchain" screen
7. Click "Generate" button next to Claim Token field
8. ✅ Should show loading state
9. ✅ Token should appear in read-only field below
10. ✅ Copy button should appear next to token
11. Paste a valid Solana public key: `5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp4vt86nq8SYtv`
12. ✅ Should NOT show error
13. ✅ "Complete Registration" button should be enabled
14. Click "Complete Registration"
15. ✅ Should show success screen
16. ✅ Should display claim token with copy button
17. ✅ Should display linked wallet address
18. ✅ Should show real sensor setup instructions

### Test 3: Wallet Validation - Invalid Format
1. Follow steps 1-6 from Test 2
2. Generate or paste a claim token
3. Paste invalid wallet key: `ABC123`
4. ✅ Should show error: "Invalid Solana public key format"
5. ✅ "Complete Registration" button should be disabled
6. Update to valid key: `DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21hy`
7. ✅ Error should disappear
8. ✅ Button should become enabled

### Test 4: Wallet Validation - Invalid Characters
1. Follow steps 1-6 from Test 2
2. Generate or paste a claim token
3. Paste key with invalid characters: `5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp4vt86nq8SYtv0OIl`
4. ✅ Should show error (contains 0, O, I, l)
5. ✅ Button should be disabled

### Test 5: Copy Claim Token
1. Complete Test 2 up to success screen
2. Click copy button next to claim token
3. ✅ Button icon should change from Copy to Check
4. ✅ Icon should turn green (success color)
5. ✅ After 2 seconds, should revert to Copy icon
6. Paste in a text editor
7. ✅ Should paste the full claim token

### Test 6: Paste Existing Claim Token
1. Follow steps 1-6 from Test 2
2. Paste existing token: `CLAIM_EXISTINGTOKEN123`
3. ✅ Should appear in input field
4. ✅ Should also appear in read-only display below
5. Enter valid wallet key
6. Click "Complete Registration"
7. ✅ Should succeed with pasted token

### Test 7: Back Navigation
1. Follow steps 1-6 from Test 2
2. Click "Back" button on wallet step
3. ✅ Should return to form with data preserved
4. ✅ All form fields should still contain entered data
5. Click "Register Sensor" again
6. ✅ Should return to wallet step
7. ✅ Previously entered claim token should NOT be preserved (starts fresh)

### Test 8: Backend Storage Verification
1. Complete Test 2 fully
2. Open browser developer console
3. Navigate to sensor detail page for the created sensor
4. Check network tab for sensor API response
5. ✅ Response should include `walletPublicKey` field
6. ✅ Value should match what was entered
7. ✅ `claimToken` should match generated token

### Test 9: Multiple Sensors with Different Wallets
1. Create first real sensor with wallet: `5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp4vt86nq8SYtv`
2. Create second real sensor with wallet: `DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21hy`
3. ✅ Both should be created successfully
4. ✅ Each should store its respective wallet
5. ✅ Each should have unique claim tokens

### Test 10: API Fallback (Simulated Failure)
1. Open browser developer console
2. Go to Network tab
3. Set up network throttling or filter to block `/generate-claim-token` endpoint
4. Follow steps 1-6 from Test 2
5. Click "Generate" button
6. ✅ Should show loading state briefly
7. ✅ Should generate token locally as fallback
8. ✅ Token should start with `CLAIM_`
9. ✅ No error should be shown to user
10. Check console
11. ✅ Should see error logged but operation continued

## Expected Wallet Public Key Format

### Valid Examples:
```
5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp4vt86nq8SYtv
DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21hy
EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
7UX2i7SucgLMQcfZ75s3VXmZZY4YRUyJN9X1RgfMoDUi
```

### Invalid Examples:
```
ABC123                                              (too short)
5eykt4UsFv8P0NJdTREpY1vzqKqZKvdp4vt86nq8SYtv   (contains '0')
5eykt4UsFv8P8NJdTREpOIlzqKqZKvdp4vt86nq8SYtv   (contains 'O', 'I', 'l')
```

## Visual Checklist

### Wallet Step Screen Elements:
- [ ] Dialog title: "Connect to Blockchain"
- [ ] Description text about linking device to blockchain
- [ ] "Claim Token" label
- [ ] Helper text about ESP8266 linking
- [ ] Claim token input field
- [ ] "Generate" button (or "Generating..." with spinner)
- [ ] Read-only token display (when token exists)
- [ ] Copy button next to token display
- [ ] "Solana Wallet Public Key" label
- [ ] Helper text about pasting public key
- [ ] Wallet icon in input field
- [ ] Wallet public key input field
- [ ] Error message area (shown when invalid)
- [ ] Info box with wallet linking explanation
- [ ] "Back" button
- [ ] "Complete Registration" button (disabled when invalid)

### Success Screen Elements (Real Sensor):
- [ ] Dialog title: "Sensor Successfully Linked!"
- [ ] Description about NFT and wallet linking
- [ ] Claim token display with copy button
- [ ] Linked wallet section with wallet icon
- [ ] Wallet address display
- [ ] Success info box (green/success colored)
- [ ] Firmware setup instructions (5 steps)
- [ ] "Done" button

### Success Screen Elements (Mock Sensor):
- [ ] Dialog title: "Sensor Registered Successfully!"
- [ ] Description about NFT minting
- [ ] Claim token display with copy button
- [ ] NO wallet section
- [ ] Success info box
- [ ] Mock sensor instructions (4 steps)
- [ ] "Done" button

## Browser Console Checks

### Successful Real Sensor Creation:
```
Created sensor abc-123-def-456 (mode: real, wallet: linked)
```

### Successful Mock Sensor Creation:
```
Created sensor xyz-789-uvw-012 (mode: mock, wallet: none)
```

### Claim Token Generation:
```
// On success - no logs needed (silent success)
// On failure:
Failed to generate claim token: [error details]
```

## Database Verification (Developer Tools)

### Query to Check Sensor:
```javascript
// In browser console
fetch('https://[project-id].supabase.co/functions/v1/make-server-4a89e1c9/sensors/[sensor-id]', {
  headers: {
    'Authorization': 'Bearer [your-access-token]'
  }
}).then(r => r.json()).then(console.log);
```

### Expected Response:
```json
{
  "sensor": {
    "id": "...",
    "name": "Test Real Sensor",
    "type": "temperature",
    "mode": "real",
    "claimToken": "CLAIM_A1B2C3D4...",
    "walletPublicKey": "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp4vt86nq8SYtv",
    ...
  }
}
```

## Performance Checks

- [ ] Claim token generation completes in < 2 seconds
- [ ] Wallet validation is instant (no lag on typing)
- [ ] Dialog transitions are smooth
- [ ] Copy operation completes immediately
- [ ] No memory leaks on open/close cycles

## Accessibility Checks

- [ ] All inputs have associated labels
- [ ] Tab navigation works correctly
- [ ] Enter key submits forms when appropriate
- [ ] Error messages are announced to screen readers
- [ ] Button disabled states are clear
- [ ] Loading states are announced

## Edge Cases to Test

1. **Very Long Wallet Keys** - Test with maximum 44 characters
2. **Rapid Clicking** - Click "Generate" multiple times quickly
3. **Network Offline** - Test with network disconnected
4. **Session Expiry** - Test when auth token expires during flow
5. **Special Characters** - Try pasting emoji or special chars in wallet field
6. **Cancel Mid-Flow** - Cancel at each step and verify cleanup
7. **Multiple Browser Tabs** - Open dialog in two tabs simultaneously

---

## Pass Criteria

All tests should pass with ✅ marks. Any failures should be investigated and resolved before deployment.
