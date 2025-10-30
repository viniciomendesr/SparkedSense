# Claim Token & Solana Wallet Integration

## Overview
This document describes the implementation of Claim Token and Solana Wallet Public Key integration in the Real Sensor Creation Flow. This feature enables proper blockchain linking for physical IoT devices on the Sparked Sense platform.

## Features Implemented

### 1. Enhanced Sensor Type Definition
Added `walletPublicKey` field to the `Sensor` interface in `/lib/types.ts`:
```typescript
export interface Sensor {
  // ... existing fields
  walletPublicKey?: string; // Solana wallet public key for blockchain integration
}
```

### 2. Updated Registration Flow

#### Step Sequence for Real Sensors:
1. **Mode Selection** - Choose between Real Data or Mock Data sensor
2. **Form Entry** - Basic sensor information (name, type, description, visibility)
3. **Wallet & Claim Token** (Real sensors only) - Blockchain linking step
4. **Success Confirmation** - Display final details with firmware setup instructions

#### Step Sequence for Mock Sensors:
1. **Mode Selection** - Choose between Real Data or Mock Data sensor
2. **Form Entry** - Basic sensor information
3. **Success Confirmation** - Display claim token for reference

### 3. Wallet & Claim Token Step (Real Sensors)

This new step includes:

#### Claim Token Input Section:
- **Manual Input Field**: Paste an existing Claim Token if available
- **Generate Button**: Click to generate a new cryptographically secure token via API
- **Token Display**: Read-only view with copy-to-clipboard functionality
- **Helper Text**: "This Claim Token links your physical device (e.g., ESP8266) to its on-chain identity."

#### Solana Wallet Public Key Input Section:
- **Input Field**: Paste your Solana wallet's public key
- **Validation**: Real-time validation using base58 format checking
- **Visual Feedback**: Error message for invalid format
- **Helper Text**: "Paste the public key of your Solana wallet. It will be used to register this sensor on-chain."
- **Wallet Icon**: Visual indicator for blockchain connection

#### Validation Rules:
- Claim Token must be present (either pasted or generated)
- Wallet Public Key must be present
- Wallet Public Key must match Solana's base58 format: `^[1-9A-HJ-NP-Za-km-z]{32,44}$`
- "Next" button disabled until both fields are valid

### 4. API Integration

#### New Endpoint: Generate Claim Token
**Route**: `POST /make-server-4a89e1c9/sensors/generate-claim-token`

**Authentication**: Required (Bearer token)

**Response**:
```json
{
  "claimToken": "CLAIM_A1B2C3D4E5F6..."
}
```

**Implementation**:
- Uses cryptographically secure random number generation
- Generates 16 bytes of random data
- Formats as `CLAIM_` + hex-encoded uppercase string
- Located in `/supabase/functions/server/index.tsx`

#### Updated Endpoint: Create Sensor
**Route**: `POST /make-server-4a89e1c9/sensors`

**New Fields**:
```json
{
  "claimToken": "CLAIM_...",
  "walletPublicKey": "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp..."
}
```

**Behavior**:
- Accepts optional `claimToken` (uses provided or generates new)
- Accepts optional `walletPublicKey` (stores if provided)
- Logs successful wallet linkage
- Returns complete sensor object with all fields

### 5. Frontend Components

#### RegisterSensorDialog Component
**Location**: `/components/register-sensor-dialog.tsx`

**New State Variables**:
- `walletPublicKey`: Stores the Solana public key
- `walletError`: Validation error message
- `isGeneratingToken`: Loading state for token generation

**New Functions**:
- `handleGenerateClaimToken()`: Calls API to generate token, with fallback
- `validateSolanaPublicKey()`: Validates base58 format
- `handleWalletPublicKeyChange()`: Updates state and validates
- `handleWalletSubmit()`: Proceeds to token step with validation

**Step Flow Management**:
```typescript
type Step = 'mode' | 'form' | 'wallet' | 'token';
```

### 6. User Experience Flow

#### For Real Sensors:
1. User selects "Real Data Sensor" mode
2. User fills out sensor information form
3. User clicks "Register Sensor" → proceeds to wallet step
4. User either:
   - Pastes existing Claim Token, OR
   - Clicks "Generate Claim Token" button
5. Token appears in read-only field with copy button
6. User pastes their Solana wallet public key
7. Real-time validation confirms format
8. User clicks "Complete Registration" (enabled when valid)
9. Success screen shows:
   - Claim Token with copy button
   - Linked Wallet address with icon
   - Success message: "Sensor successfully linked with wallet and Claim Token"
   - Firmware setup instructions (5 steps)

#### For Mock Sensors:
1. User selects "Mock Data Sensor" mode
2. User fills out sensor information form
3. User clicks "Register Sensor" → proceeds directly to success
4. Success screen shows:
   - Auto-generated Claim Token
   - Instructions for mock data generation

### 7. Visual Design

**Colors**:
- Primary actions: `#97AAF7` (primary blue)
- Success messages: Success theme color
- Error messages: Error theme color
- Info boxes: Info theme color with 10% opacity background

**Icons**:
- Database icon: Real sensors
- TestTube2 icon: Mock sensors
- Wallet icon: Blockchain wallet field
- Loader2 icon: Generating token (with spin animation)
- Copy/Check icons: Clipboard actions

**Spacing**:
- Consistent 6-unit spacing between sections
- 3-unit spacing for form fields
- 2-unit spacing for inline elements

### 8. Error Handling

#### Frontend:
- API failure during token generation → fallback to local generation
- Invalid wallet format → inline error message
- Missing required fields → disabled submit button
- Network errors → toast notification

#### Backend:
- Unauthorized requests → 401 response
- Missing user authentication → detailed error logging
- Token generation failure → 500 response with error message

### 9. Security Considerations

**Claim Token**:
- Generated using `crypto.getRandomValues()` for cryptographic security
- 128 bits of entropy (16 bytes)
- Formatted as uppercase hex for readability
- Stored server-side associated with sensor

**Wallet Public Key**:
- Validation prevents obvious format errors
- Stored as plain text (public keys are non-sensitive)
- Used for on-chain NFT minting identification
- No private keys handled at any point

**API Authentication**:
- All endpoints require valid Bearer token
- User ownership verified on all operations
- Service role key used only in backend

### 10. Database Storage

**KV Store Schema**:
```
Key: sensor:{userId}:{sensorId}
Value: {
  id: string,
  name: string,
  type: string,
  description: string,
  visibility: string,
  mode: 'real' | 'mock',
  status: string,
  owner: string,
  claimToken: string,
  walletPublicKey: string | null,
  createdAt: string,
  updatedAt: string,
  // ... other fields
}
```

### 11. Future Integration Points

**Prepared for**:
- ✅ Solana blockchain NFT minting using wallet public key
- ✅ Firmware authentication using claim token
- ✅ On-chain sensor registration
- ✅ Cryptographic data verification
- ✅ NFT ownership tracking

**Recommended Next Steps**:
1. Implement actual Solana NFT minting when sensor receives first verified reading
2. Create firmware library that uses claim token for signing readings
3. Add on-chain verification of sensor ownership
4. Implement wallet connection UI for signing transactions
5. Add blockchain transaction history for sensors

### 12. Testing Checklist

- [ ] Generate claim token via API
- [ ] Generate claim token with fallback (simulate API failure)
- [ ] Paste existing claim token
- [ ] Copy claim token to clipboard
- [ ] Validate correct Solana public key format
- [ ] Reject invalid wallet format
- [ ] Prevent submission without claim token
- [ ] Prevent submission without wallet key
- [ ] Prevent submission with invalid wallet format
- [ ] Create real sensor with both fields
- [ ] Create mock sensor (no wallet step)
- [ ] Verify sensor stored with walletPublicKey in database
- [ ] Verify success screen shows wallet info for real sensors
- [ ] Verify success screen hides wallet info for mock sensors

### 13. Code Locations

- **Types**: `/lib/types.ts` - Line 12 (walletPublicKey field)
- **API Client**: `/lib/api.ts` - Lines 68-75 (generateClaimToken function)
- **Dialog Component**: `/components/register-sensor-dialog.tsx` - Complete rewrite
- **Backend Server**: `/supabase/functions/server/index.tsx` - Lines 217-233, 337-360
- **Dashboard Integration**: `/pages/dashboard.tsx` - Lines 151-169 (handleAddSensor)

### 14. Validation Details

**Solana Public Key Validation**:
- Format: Base58 encoding
- Character set: `1-9A-HJ-NP-Za-km-z` (excludes 0, O, I, l for clarity)
- Length: 32-44 characters (typical Solana public key length)
- Regex: `/^[1-9A-HJ-NP-Za-km-z]{32,44}$/`

**Examples of Valid Keys**:
- `5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp4vt86nq8SYtv`
- `DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21hy`

**Examples of Invalid Keys**:
- `ABC123` (too short)
- `5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp4vt86nq8SYtv0OIl` (contains invalid chars: 0, O, I, l)

---

## Summary

This implementation provides a complete, production-ready interface for linking physical IoT sensors to the Solana blockchain. The flow guides users through secure claim token generation and wallet linking while maintaining excellent UX with real-time validation, helpful messaging, and clear visual feedback.

The system is designed to scale from prototype testing (mock sensors) to production deployment (real sensors with blockchain integration), all within the same unified interface.
