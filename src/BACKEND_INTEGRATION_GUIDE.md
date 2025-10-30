# Backend Integration Guide - Sparked Sense

## Overview

This document describes the full backend integration for Sparked Sense, merging backend logic with the existing frontend repository into a single unified Supabase instance.

## Architecture

```
Frontend (React/TypeScript)
    ↓
Supabase Edge Functions (Hono Server)
    ↓
Supabase Database (PostgreSQL)
    ↓
Solana Blockchain (for anchoring)
```

## Folder Structure

```
/supabase/functions/server/
├── index.tsx                    # Main server with all API routes
├── kv_store.tsx                 # Key-value store helper
└── lib/
    ├── supabaseClient.ts        # Supabase client helpers
    ├── deviceRegistry.ts        # Device lifecycle management
    ├── solanaService.ts         # Blockchain anchoring service
    └── redis.ts                 # Cache layer (memory-based)

/supabase/migrations/
└── 001_initial_schema.sql       # Database schema

/lib/
├── api.ts                       # Frontend API client
├── types.ts                     # TypeScript types
└── ...
```

## Database Tables

### 1. `users`
Stores user wallet and identity information.

**Columns:**
- `id` (UUID, PK)
- `wallet_address` (TEXT, unique)
- `email` (TEXT, unique)
- `name` (TEXT)
- `created_at`, `updated_at` (TIMESTAMP)

### 2. `devices` (sensors)
Stores sensor/device metadata.

**Columns:**
- `id` (UUID, PK)
- `name`, `type`, `description` (TEXT)
- `visibility` ('public' | 'private' | 'partial')
- `mode` ('real' | 'mock')
- `status` ('active' | 'inactive' | 'reconnecting')
- `mac_address`, `public_key`, `claim_token` (TEXT)
- `owner_wallet`, `owner_user_id` (TEXT, UUID FK)
- `thumbnail_url` (TEXT)
- `created_at`, `updated_at` (TIMESTAMP)

### 3. `sensor_readings`
Stores individual sensor readings.

**Columns:**
- `id` (UUID, PK)
- `sensor_id` (UUID, FK → devices)
- `timestamp` (TIMESTAMP)
- `variable`, `value`, `unit` (TEXT/NUMERIC)
- `verified` (BOOLEAN)
- `verification_hash`, `signature` (TEXT)
- `created_at` (TIMESTAMP)

### 4. `datasets`
Stores dataset metadata with blockchain anchoring info.

**Columns:**
- `id` (UUID, PK)
- `sensor_id` (UUID, FK → devices)
- `name` (TEXT)
- `start_date`, `end_date` (TIMESTAMP)
- `readings_count` (INTEGER)
- `status` ('preparing' | 'anchoring' | 'anchored' | 'failed')
- `merkle_root`, `transaction_id`, `anchored_tx` (TEXT)
- `is_public` (BOOLEAN)
- `access_count` (INTEGER)
- `created_at`, `anchored_at` (TIMESTAMP)

### 5. `audit_logs`
Tracks dataset verification and access events.

**Columns:**
- `id` (UUID, PK)
- `action`, `entity_type`, `entity_id` (TEXT/UUID)
- `user_id` (UUID, FK → users)
- `wallet_address`, `ip_address` (TEXT)
- `verification_success` (BOOLEAN)
- `verification_data` (JSONB)
- `created_at` (TIMESTAMP)

## API Endpoints

### Authentication Routes

#### `POST /make-server-4a89e1c9/auth/signup`
Create a new user account.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "User Name"
}
```

#### `POST /make-server-4a89e1c9/auth/signin`
Sign in with credentials.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "accessToken": "...",
  "user": { ... }
}
```

#### `POST /make-server-4a89e1c9/auth/signout`
Sign out current user (requires auth).

#### `GET /make-server-4a89e1c9/auth/session`
Get current session (requires auth).

### Sensor Routes (Protected)

#### `GET /make-server-4a89e1c9/sensors`
Get all sensors for authenticated user.

#### `GET /make-server-4a89e1c9/sensors/:id`
Get specific sensor with metrics.

#### `POST /make-server-4a89e1c9/sensors`
Create a new sensor.

**Body:**
```json
{
  "name": "Temperature Sensor",
  "type": "temperature",
  "description": "Lab temperature sensor",
  "visibility": "public",
  "mode": "real",
  "claimToken": "CLAIM_ABC123...",
  "walletPublicKey": "SolanaAddress..."
}
```

#### `PUT /make-server-4a89e1c9/sensors/:id`
Update sensor details.

#### `DELETE /make-server-4a89e1c9/sensors/:id`
Delete sensor and all associated data.

#### `GET /make-server-4a89e1c9/sensors/:id/hourly-merkle`
Get hourly Merkle root for sensor readings.

#### `POST /make-server-4a89e1c9/sensors/generate-claim-token`
Generate a new claim token for device registration.

#### `POST /make-server-4a89e1c9/sensors/retrieve-claim-token`
Retrieve claim token for device with wallet and MAC address.

**Body:**
```json
{
  "wallet_public_key": "SolanaAddress...",
  "mac_address": "AA:BB:CC:DD:EE:FF",
  "device_public_key": "DevicePublicKey..."
}
```

### Reading Routes (Protected)

#### `GET /make-server-4a89e1c9/readings/:sensorId`
Get readings for a sensor (default limit: 100).

**Query Params:**
- `limit` (optional): Number of readings to return

#### `GET /make-server-4a89e1c9/readings/:sensorId/historical`
Get historical readings within date range.

**Query Params:**
- `start`: Start date (ISO 8601)
- `end`: End date (ISO 8601)

#### `POST /make-server-4a89e1c9/readings`
Create a new reading.

**Body:**
```json
{
  "sensorId": "uuid",
  "variable": "temperature",
  "value": 23.5,
  "unit": "°C",
  "signature": "device_signature..."
}
```

### Dataset Routes (Protected)

#### `GET /make-server-4a89e1c9/datasets/:sensorId`
Get all datasets for a sensor.

#### `GET /make-server-4a89e1c9/datasets/detail/:id`
Get dataset details with preview readings.

#### `POST /make-server-4a89e1c9/datasets`
Create a new dataset.

**Body:**
```json
{
  "name": "October 2024 Dataset",
  "sensorId": "uuid",
  "startDate": "2024-10-01T00:00:00Z",
  "endDate": "2024-10-31T23:59:59Z",
  "isPublic": true
}
```

#### `PUT /make-server-4a89e1c9/datasets/:id`
Update dataset (e.g., change visibility).

#### `DELETE /make-server-4a89e1c9/datasets/:id`
Delete a dataset.

#### `POST /make-server-4a89e1c9/datasets/:id/anchor`
Anchor dataset to blockchain.

#### `POST /make-server-4a89e1c9/datasets/:id/access`
Increment dataset access count (for analytics).

### Verification Routes (Protected)

#### `POST /make-server-4a89e1c9/verify/hash`
Verify a single reading hash.

**Body:**
```json
{
  "sensorId": "uuid",
  "hash": "abc123..."
}
```

#### `POST /make-server-4a89e1c9/verify/merkle`
Verify hourly Merkle root.

**Body:**
```json
{
  "sensorId": "uuid",
  "merkleRoot": "def456..."
}
```

### Public API Routes (No Auth Required)

#### `GET /make-server-4a89e1c9/public/sensors`
Get all public sensors.

#### `GET /make-server-4a89e1c9/public/sensors/featured`
Get top 3 featured public sensors with metrics.

#### `GET /make-server-4a89e1c9/public/sensors/:id`
Get specific public sensor.

#### `GET /make-server-4a89e1c9/public/datasets/:sensorId`
Get public datasets for a sensor.

#### `GET /make-server-4a89e1c9/public/readings/:sensorId`
Get public readings for a sensor.

**Query Params:**
- `limit` (optional): Number of readings to return

#### `GET /make-server-4a89e1c9/public/sensors/:sensorId/hourly-merkle`
Get public hourly Merkle root for sensor.

### Stats Route (Protected)

#### `GET /make-server-4a89e1c9/stats`
Get user statistics (total sensors, readings, datasets).

### Internal Routes

#### `POST /make-server-4a89e1c9/internal/generate-mock-data`
Manually trigger mock data generation for all mock sensors.

**Note:** Mock data is also auto-generated every 5 seconds for active mock sensors.

## Environment Variables

The system requires these environment variables in Supabase:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Optional: Solana Configuration (for production blockchain anchoring)
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_PRIVATE_KEY=...
```

## Setup Instructions

### 1. Run Database Migration

Execute the SQL migration file in your Supabase SQL Editor:

```bash
# In Supabase Dashboard:
# SQL Editor → New Query → Paste contents of /supabase/migrations/001_initial_schema.sql → Run
```

### 2. Verify Tables

Check that all tables were created:
- users
- devices
- sensor_readings
- datasets
- audit_logs

### 3. Update Frontend API Client

The frontend API client (`/lib/api.ts`) should already be configured to use the unified Supabase instance.

### 4. Test the Integration

1. **Sign Up**: Create a user account
2. **Sign In**: Log in and get access token
3. **Create Sensor**: Register a mock sensor
4. **View Readings**: Check that mock data is being generated
5. **Create Dataset**: Create and anchor a dataset
6. **Public View**: Access sensor via public API (no auth)

## Device Registration Flow

### For Real IoT Devices:

1. **Generate Claim Token** (Frontend):
   ```typescript
   const { claimToken } = await api.generateClaimToken();
   ```

2. **Register Sensor** (Frontend):
   ```typescript
   await api.createSensor({
     name: "My Sensor",
     type: "temperature",
     mode: "real",
     claimToken: claimToken
   });
   ```

3. **Device Claims Token** (Arduino/ESP):
   - Device sends claim token + device public key + MAC address
   - Backend verifies and links device to user
   - Device status becomes "active"

4. **Device Sends Data** (Arduino/ESP):
   - Device signs readings with private key
   - Backend verifies signature using device public key
   - Verified readings stored in database

### For Mock Sensors:

Mock sensors are immediately active and auto-generate data every 5 seconds.

## Key Features

### 1. Device Registry (`deviceRegistry.ts`)
- Register new devices
- Claim devices with tokens
- Revoke device ownership
- Verify device signatures

### 2. Solana Service (`solanaService.ts`)
- Anchor datasets to Solana blockchain
- Verify dataset proofs on-chain
- Generate and verify Merkle roots
- Get Solana explorer URLs

### 3. Redis Cache (`redis.ts`)
- In-memory caching for frequently accessed data
- TTL-based expiration
- Automatic cleanup of expired entries

### 4. Row Level Security (RLS)
- Users can only access their own devices/data
- Public devices/datasets accessible to everyone
- Service role bypasses RLS for backend operations

## Data Flow Example

### Creating a Sensor Reading:

```
IoT Device (Arduino/ESP)
    ↓ HTTP POST with signature
Edge Function (validate signature)
    ↓
KV Store (cache reading)
    ↓
Supabase Database (persist reading)
    ↓
Frontend (real-time update via subscription)
```

### Anchoring a Dataset:

```
User clicks "Anchor" (Frontend)
    ↓
Backend calculates Merkle root
    ↓
Solana Service anchors to blockchain
    ↓
Transaction ID stored in dataset
    ↓
Dataset status → "anchored"
    ↓
Public audit page available
```

## Security Considerations

1. **Authentication**: All protected routes require valid JWT token
2. **RLS Policies**: Database enforces row-level security
3. **Signature Verification**: Real device readings must be signed
4. **Public Data**: Only devices with `visibility='public'` are accessible publicly
5. **Claim Tokens**: One-time use tokens for device registration

## Monitoring & Debugging

### Check Server Logs:
```bash
# In Supabase Dashboard:
# Edge Functions → server → Logs
```

### Common Issues:

1. **"Unauthorized" errors**: Check JWT token in Authorization header
2. **"Sensor not found"**: Verify sensor exists and user has access
3. **Mock data not generating**: Check server logs for errors
4. **Database connection errors**: Verify environment variables

### Health Check:
```bash
GET /make-server-4a89e1c9/health
# Response: { "status": "ok" }
```

## Migration from Separate Backend

If you had a separate backend project:

1. ✅ Backend helper modules moved to `/supabase/functions/server/lib/`
2. ✅ All endpoints integrated into main `index.tsx`
3. ✅ Database tables created in single Supabase instance
4. ✅ Environment variables unified (same SUPABASE_URL)
5. ✅ Frontend API client uses unified backend

## Next Steps

1. **Production Deployment**:
   - Update environment variables for production
   - Configure actual Solana wallet for anchoring
   - Set up monitoring and alerts

2. **IoT Device Integration**:
   - Upload Arduino/ESP code to physical devices
   - Test device registration flow
   - Verify signature validation

3. **Frontend Updates**:
   - Connect all UI components to new backend
   - Test real-time subscriptions
   - Implement error handling

## Support

For issues or questions:
1. Check server logs in Supabase Dashboard
2. Review this documentation
3. Inspect network requests in browser DevTools
4. Check database records directly in Supabase Table Editor

## License

MIT License - Sparked Sense Project
