# Sparked Sense API Quick Reference

## Base URL
```
https://your-project.supabase.co/functions/v1/make-server-4a89e1c9
```

## Authentication

All protected endpoints require an `Authorization` header:
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

## Quick Start Examples

### 1. Create Account
```bash
POST /auth/signup
{
  "email": "user@example.com",
  "password": "password123",
  "name": "Your Name"
}
```

### 2. Sign In
```bash
POST /auth/signin
{
  "email": "user@example.com",
  "password": "password123"
}
# Returns: { "accessToken": "...", "user": {...} }
```

### 3. Create Mock Sensor (for testing)
```bash
POST /sensors
Authorization: Bearer TOKEN
{
  "name": "Test Sensor",
  "type": "temperature",
  "description": "My test sensor",
  "visibility": "public",
  "mode": "mock"
}
```

### 4. Create Real Sensor (for IoT devices)
```bash
# Step 1: Generate claim token
POST /sensors/generate-claim-token
Authorization: Bearer TOKEN
# Returns: { "claimToken": "CLAIM_..." }

# Step 2: Register sensor
POST /sensors
Authorization: Bearer TOKEN
{
  "name": "Real Sensor",
  "type": "temperature",
  "mode": "real",
  "visibility": "public",
  "claimToken": "CLAIM_...",
  "walletPublicKey": "SolanaAddress..."
}
```

### 5. Get Your Sensors
```bash
GET /sensors
Authorization: Bearer TOKEN
```

### 6. View Public Sensors (no auth)
```bash
GET /public/sensors
# No authentication required
```

### 7. Get Sensor Readings
```bash
# Your sensors
GET /readings/:sensorId?limit=100
Authorization: Bearer TOKEN

# Public sensors
GET /public/readings/:sensorId?limit=100
# No authentication required
```

### 8. Create Dataset
```bash
POST /datasets
Authorization: Bearer TOKEN
{
  "name": "October 2024 Dataset",
  "sensorId": "sensor-uuid",
  "startDate": "2024-10-01T00:00:00Z",
  "endDate": "2024-10-31T23:59:59Z",
  "isPublic": true
}
```

### 9. Anchor Dataset to Blockchain
```bash
POST /datasets/:datasetId/anchor
Authorization: Bearer TOKEN
```

### 10. Verify Reading Hash
```bash
POST /verify/hash
Authorization: Bearer TOKEN
{
  "sensorId": "sensor-uuid",
  "hash": "abc123..."
}
```

## Sensor Types

- `temperature` (°C)
- `humidity` (%)
- `ph` (pH)
- `pressure` (hPa)
- `light` (lux)
- `co2` (ppm)

## Sensor Modes

- `mock` - Auto-generates data every 5 seconds (for testing)
- `real` - Receives data from physical IoT devices

## Visibility Levels

- `public` - Anyone can view (no auth)
- `private` - Only owner can view
- `partial` - Owner can view all, others see limited data

## Dataset Status

- `preparing` - Initial state
- `anchoring` - Being anchored to blockchain
- `anchored` - Successfully anchored
- `failed` - Anchoring failed

## Common Response Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate email, etc.)
- `500` - Server Error

## Frontend Integration

### Using fetch:
```typescript
const response = await fetch(`${SUPABASE_URL}/functions/v1/make-server-4a89e1c9/sensors`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    name: 'My Sensor',
    type: 'temperature',
    mode: 'mock',
    visibility: 'public'
  })
});

const data = await response.json();
```

### Using the API client:
```typescript
import { api } from './lib/api';

// Create sensor
const sensor = await api.createSensor({
  name: 'My Sensor',
  type: 'temperature',
  mode: 'mock',
  visibility: 'public'
});

// Get readings
const readings = await api.getReadings(sensor.id, 100);

// Create dataset
const dataset = await api.createDataset({
  name: 'My Dataset',
  sensorId: sensor.id,
  startDate: new Date('2024-10-01'),
  endDate: new Date('2024-10-31'),
  isPublic: true
});
```

## Real-Time Updates (Supabase Subscriptions)

```typescript
import { supabase } from './utils/supabase/client';

// Subscribe to sensor changes
const channel = supabase
  .channel('sensor-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'devices',
    filter: `owner_user_id=eq.${userId}`
  }, (payload) => {
    console.log('Sensor changed:', payload);
  })
  .subscribe();

// Cleanup
supabase.removeChannel(channel);
```

## Error Handling

```typescript
try {
  const sensor = await api.createSensor(data);
  console.log('Success:', sensor);
} catch (error) {
  if (error.status === 401) {
    console.error('Not authenticated');
    // Redirect to login
  } else if (error.status === 400) {
    console.error('Validation error:', error.message);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Testing with cURL

### Health Check:
```bash
curl https://your-project.supabase.co/functions/v1/make-server-4a89e1c9/health
```

### Sign Up:
```bash
curl -X POST \
  https://your-project.supabase.co/functions/v1/make-server-4a89e1c9/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

### Create Sensor:
```bash
curl -X POST \
  https://your-project.supabase.co/functions/v1/make-server-4a89e1c9/sensors \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -d '{
    "name": "Temperature Sensor",
    "type": "temperature",
    "mode": "mock",
    "visibility": "public"
  }'
```

### Get Public Sensors:
```bash
curl https://your-project.supabase.co/functions/v1/make-server-4a89e1c9/public/sensors
```

## Rate Limits

- Development: No strict limits
- Production: Configure in Supabase settings

## Best Practices

1. **Cache Tokens**: Store access tokens securely
2. **Handle Errors**: Always catch and handle API errors
3. **Use Types**: Import TypeScript types from `/lib/types.ts`
4. **Pagination**: Use `limit` parameter for large datasets
5. **Real-Time**: Use Supabase subscriptions for live updates
6. **Public vs Private**: Check visibility before displaying data

## Debugging Tips

1. **Check Logs**: Supabase Dashboard → Edge Functions → Logs
2. **Inspect Network**: Browser DevTools → Network tab
3. **Verify Token**: Decode JWT at jwt.io
4. **Test Auth**: Try endpoints in Postman or cURL
5. **Check RLS**: Verify Row Level Security policies

## Common Gotchas

- ❌ Forgetting `Bearer` prefix in Authorization header
- ❌ Using wrong base URL (check your project URL)
- ❌ Token expired (tokens expire after 1 hour by default)
- ❌ Missing Content-Type header for POST/PUT requests
- ❌ Trying to access private sensors without auth

## Environment Variables

### Frontend (.env):
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

### Backend (automatically available in Edge Functions):
```bash
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

## Quick Links

- 📖 Full API Docs: `/BACKEND_INTEGRATION_GUIDE.md`
- 🚀 Setup Guide: `/supabase/SETUP_INSTRUCTIONS.md`
- ✅ Integration Status: `/INTEGRATION_COMPLETE.md`
- 🔗 Supabase Dashboard: https://supabase.com/dashboard
- 🌐 Solana Explorer: https://explorer.solana.com/?cluster=devnet

---

**Need Help?** Check the full integration guide or Edge Function logs in Supabase Dashboard.
