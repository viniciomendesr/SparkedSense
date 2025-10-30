# Sparked Sense - Supabase Integration

## Overview
The application now uses Supabase for authentication, database operations, and real-time updates.

## Architecture

### Frontend (React)
- **Auth Context** (`/lib/auth-context.tsx`): Manages user authentication state
- **API Layer** (`/lib/api.ts`): Handles all server API calls
- **Supabase Client** (`/utils/supabase/client.ts`): Singleton Supabase client instance

### Backend (Deno Edge Functions)
- **Server** (`/supabase/functions/server/index.tsx`): Hono-based API server
- **KV Store** (`/supabase/functions/server/kv_store.tsx`): Key-value database interface

## Features Implemented

### Authentication
- **Sign Up**: Creates new users with auto-confirmed email
- **Sign In**: Email/password authentication
- **Sign Out**: Session management
- **Session Persistence**: Automatic session restoration on page load

### Database Operations

#### Sensors
- `GET /sensors` - List all sensors for authenticated user
- `GET /sensors/:id` - Get specific sensor details
- `POST /sensors` - Create new sensor
- `PUT /sensors/:id` - Update sensor
- `DELETE /sensors/:id` - Delete sensor and associated data

#### Readings
- `GET /readings/:sensorId` - Get recent readings (default: 100)
- `GET /readings/:sensorId/historical` - Get readings in date range
- `POST /readings` - Create new reading

#### Datasets
- `GET /datasets/:sensorId` - List datasets for sensor
- `GET /datasets/detail/:id` - Get specific dataset
- `POST /datasets` - Create new dataset
- `POST /datasets/:id/anchor` - Anchor dataset to blockchain (simulated)

#### Stats
- `GET /stats` - Get dashboard statistics

### Real-time Updates
- **Sensor Changes**: Dashboard subscribes to sensor updates via Supabase Realtime
- **Dataset Changes**: Sensor detail page subscribes to dataset updates
- **Live Streaming**: WebSocket simulation for real-time sensor readings

## Data Flow

### User Signs In
1. User enters credentials in Header dialog
2. Frontend calls Supabase auth
3. Access token stored in auth context
4. Dashboard loads with user's sensors

### Creating a Sensor
1. User fills out register sensor form
2. Frontend calls `sensorAPI.create()`
3. Server stores in KV store with key: `sensor:{userId}:{sensorId}`
4. Real-time subscription notifies dashboard of new sensor

### Creating a Dataset
1. User selects date range on sensor detail page
2. Frontend calls `datasetAPI.create()`
3. Server counts readings in range and stores dataset
4. Server simulates blockchain anchoring after delay
5. Real-time subscription updates UI with anchoring status

## Environment Variables (Server)
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Public anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (server-only)

## Key-Value Store Schema

### Sensors
Key: `sensor:{userId}:{sensorId}`
```json
{
  "id": "uuid",
  "name": "string",
  "type": "temperature|humidity|ph|pressure|light|co2",
  "description": "string",
  "visibility": "public|private|partial",
  "status": "active|inactive|reconnecting",
  "owner": "userId",
  "claimToken": "uuid",
  "createdAt": "ISO8601",
  "lastReading": { ... }
}
```

### Readings
Key: `reading:{sensorId}:{readingId}`
```json
{
  "id": "uuid",
  "sensorId": "uuid",
  "timestamp": "ISO8601",
  "variable": "string",
  "value": 123.45,
  "unit": "string",
  "verified": true,
  "signature": "string"
}
```

### Datasets
Key: `dataset:{sensorId}:{datasetId}`
```json
{
  "id": "uuid",
  "name": "string",
  "sensorId": "uuid",
  "startDate": "ISO8601",
  "endDate": "ISO8601",
  "readingsCount": 1234,
  "status": "preparing|anchoring|anchored|failed",
  "merkleRoot": "hex",
  "transactionId": "base58",
  "createdAt": "ISO8601"
}
```

## Testing the Integration

1. **Sign Up**: Create a new account in the header
2. **Create Sensors**: Use the "Register Sensor" button
3. **View Live Data**: Click "View Details" on any sensor
4. **Create Dataset**: On sensor detail page, create a dataset
5. **View Audit**: Once anchored, view the public audit page

## Mock Data vs Real Data
- The app uses mock data for live sensor streaming (WebSocket simulation)
- All CRUD operations use real Supabase backend
- Historical readings can be seeded using `/lib/seed-data.ts`

## Next Steps
To connect real IoT devices:
1. Implement proper WebSocket server for live data
2. Add device authentication with claim tokens
3. Implement actual Solana blockchain integration
4. Add Merkle tree generation for dataset proofs
