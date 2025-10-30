import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import * as kv from "./kv_store.ts";
import { crypto } from "jsr:@std/crypto@1.0.3";

const app = new Hono();

// Create Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
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

// Helper to generate IDs
const generateId = () => crypto.randomUUID();

// Helper to calculate Merkle root from readings
const calculateMerkleRoot = async (readings: any[]) => {
  if (readings.length === 0) {
    return crypto.randomUUID().replace(/-/g, '');
  }
  
  // Sort readings by timestamp
  const sortedReadings = [...readings].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  // Concatenate all hashes
  const combined = sortedReadings.map(r => r.hash || '').join('');
  
  // Hash the combined string to create Merkle root
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(combined));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Helper to generate mock readings for a sensor
const generateMockReading = async (sensor: any) => {
  const typeConfigs: Record<string, { min: number; max: number; unit: string; variable: string }> = {
    temperature: { min: 15, max: 30, unit: '°C', variable: 'temperature' },
    humidity: { min: 30, max: 80, unit: '%', variable: 'humidity' },
    ph: { min: 6.5, max: 8.5, unit: 'pH', variable: 'ph_level' },
    pressure: { min: 980, max: 1020, unit: 'hPa', variable: 'pressure' },
    light: { min: 100, max: 1000, unit: 'lux', variable: 'light_intensity' },
    co2: { min: 400, max: 1000, unit: 'ppm', variable: 'co2_level' },
  };

  const config = typeConfigs[sensor.type] || typeConfigs.temperature;
  const value = config.min + Math.random() * (config.max - config.min);
  const timestamp = new Date();
  
  const readingData = JSON.stringify({
    sensorId: sensor.id,
    timestamp: timestamp.toISOString(),
    value: parseFloat(value.toFixed(2)),
    unit: config.unit,
  });

  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(readingData));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  const reading = {
    id: generateId(),
    sensorId: sensor.id,
    timestamp: timestamp.toISOString(),
    variable: config.variable,
    value: parseFloat(value.toFixed(2)),
    unit: config.unit,
    verified: true,
    hash,
    signature: `mock_sig_${hash.substring(0, 16)}`,
  };

  await kv.set(`reading:${sensor.id}:${reading.id}`, reading);
  return reading;
};

// Helper to get user from token
const getUserFromToken = async (request: Request) => {
  const accessToken = request.headers.get('Authorization')?.split(' ')[1];
  if (!accessToken || accessToken === Deno.env.get('SUPABASE_ANON_KEY')) {
    return null;
  }
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (error || !user) {
    return null;
  }
  return user;
};

// Health check endpoint
app.get("/make-server-4a89e1c9/health", (c) => {
  return c.json({ status: "ok" });
});

// ======================
// Authentication Routes
// ======================

app.post("/make-server-4a89e1c9/auth/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true,
    });

    if (error) {
      console.error('Sign up error:', error);
      
      // Check if user already exists
      if (error.message.includes('already been registered') || error.status === 422) {
        return c.json({ 
          error: 'This email is already registered. Please sign in instead.' 
        }, 409);
      }
      
      return c.json({ error: error.message }, 400);
    }

    return c.json({ user: data.user });
  } catch (error) {
    console.error('Sign up error:', error);
    return c.json({ error: 'Sign up failed' }, 500);
  }
});

app.post("/make-server-4a89e1c9/auth/signin", async (c) => {
  try {
    const { email, password } = await c.req.json();
    
    const client = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Sign in error:', error);
      return c.json({ error: error.message }, 400);
    }

    return c.json({ 
      accessToken: data.session?.access_token,
      user: data.user 
    });
  } catch (error) {
    console.error('Sign in error:', error);
    return c.json({ error: 'Sign in failed' }, 500);
  }
});

app.post("/make-server-4a89e1c9/auth/signout", async (c) => {
  try {
    const user = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const client = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    await client.auth.admin.signOut(accessToken ?? '');
    return c.json({ success: true });
  } catch (error) {
    console.error('Sign out error:', error);
    return c.json({ error: 'Sign out failed' }, 500);
  }
});

app.get("/make-server-4a89e1c9/auth/session", async (c) => {
  try {
    const user = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ session: null });
    }
    return c.json({ session: { user } });
  } catch (error) {
    console.error('Session check error:', error);
    return c.json({ session: null });
  }
});

// ======================
// Sensor Routes
// ======================

// Generate claim token
app.post("/make-server-4a89e1c9/sensors/generate-claim-token", async (c) => {
  try {
    const user = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Generate a cryptographically secure claim token
    const tokenBytes = new Uint8Array(16);
    crypto.getRandomValues(tokenBytes);
    const claimToken = `CLAIM_${Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase()}`;

    return c.json({ claimToken });
  } catch (error) {
    console.error('Failed to generate claim token:', error);
    return c.json({ error: 'Failed to generate claim token' }, 500);
  }
});

// Retrieve claim token (mocked for now)
app.post("/make-server-4a89e1c9/sensors/retrieve-claim-token", async (c) => {
  try {
    const user = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { wallet_public_key, mac_address, device_public_key } = body;

    // Validate inputs
    if (!wallet_public_key || !mac_address || !device_public_key) {
      return c.json({ error: 'Missing wallet_public_key, mac_address, or device_public_key' }, 400);
    }

    // Validate Solana public key format (base58, 32-44 chars)
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    if (!base58Regex.test(wallet_public_key)) {
      return c.json({ error: 'Invalid Solana wallet public key format' }, 400);
    }

    // Validate Device public key format (base58, 32-44 chars)
    if (!base58Regex.test(device_public_key)) {
      return c.json({ error: 'Invalid device public key format' }, 400);
    }

    // Validate MAC address format
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    if (!macRegex.test(mac_address)) {
      return c.json({ error: 'Invalid MAC address format' }, 400);
    }

    // For now, generate a mocked claim token
    // In a real implementation, this would query a database or blockchain
    // to retrieve an existing token associated with this wallet, device key, and MAC address
    const tokenBytes = new Uint8Array(16);
    crypto.getRandomValues(tokenBytes);
    const claim_token = `SPARKED-${Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase().substring(0, 12)}`;

    // Store the association in KV store for future reference
    const tokenKey = `claim_token:${user.id}:${mac_address}`;
    await kv.set(tokenKey, {
      claim_token,
      wallet_public_key,
      device_public_key,
      mac_address,
      user_id: user.id,
      created_at: new Date().toISOString(),
    });

    return c.json({ claim_token });
  } catch (error) {
    console.error('Failed to retrieve claim token:', error);
    return c.json({ error: 'Failed to retrieve claim token' }, 500);
  }
});

app.get("/make-server-4a89e1c9/sensors", async (c) => {
  try {
    const user = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const sensors = await kv.getByPrefix(`sensor:${user.id}:`);
    return c.json({ sensors: sensors || [] });
  } catch (error) {
    console.error('Failed to fetch sensors:', error);
    return c.json({ error: 'Failed to fetch sensors' }, 500);
  }
});

app.get("/make-server-4a89e1c9/sensors/:id", async (c) => {
  try {
    const user = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const id = c.req.param('id');
    const sensor = await kv.get(`sensor:${user.id}:${id}`);
    
    if (!sensor) {
      return c.json({ error: 'Sensor not found' }, 404);
    }

    // Calculate hourly Merkle root
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const readings = await kv.getByPrefix(`reading:${id}:`);
    const lastHourReadings = readings.filter((r: any) => new Date(r.timestamp) >= oneHourAgo);
    const hourlyMerkleRoot = await calculateMerkleRoot(lastHourReadings);

    // Calculate total verified (sum of dataset accesses + sensor views)
    const datasets = await kv.getByPrefix(`dataset:${id}:`);
    const totalVerified = datasets.reduce((sum: number, d: any) => sum + (d.accessCount || 0), 0) + 1;

    return c.json({ 
      sensor: {
        ...sensor,
        hourlyMerkleRoot,
        totalVerified,
        totalReadings: readings.length
      }
    });
  } catch (error) {
    console.error('Failed to fetch sensor:', error);
    return c.json({ error: 'Failed to fetch sensor' }, 500);
  }
});

// Get hourly Merkle root for a sensor
app.get("/make-server-4a89e1c9/sensors/:id/hourly-merkle", async (c) => {
  try {
    const user = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const id = c.req.param('id');
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const readings = await kv.getByPrefix(`reading:${id}:`);
    const lastHourReadings = readings.filter((r: any) => new Date(r.timestamp) >= oneHourAgo);
    const merkleRoot = await calculateMerkleRoot(lastHourReadings);

    return c.json({ 
      merkleRoot,
      readingsCount: lastHourReadings.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to calculate hourly Merkle root:', error);
    return c.json({ error: 'Failed to calculate hourly Merkle root' }, 500);
  }
});

app.post("/make-server-4a89e1c9/sensors", async (c) => {
  try {
    const user = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { name, type, description, visibility, mode, claimToken, walletPublicKey } = await c.req.json();
    const id = generateId();
    
    // Use provided claim token or generate a new one
    const finalClaimToken = claimToken || generateId();

    const sensor = {
      id,
      name,
      type,
      description,
      visibility,
      mode: mode || 'real', // Default to 'real' if not specified
      status: mode === 'mock' ? 'active' : 'inactive', // Mock sensors are immediately active
      owner: user.id,
      claimToken: finalClaimToken,
      walletPublicKey: walletPublicKey || null, // Store wallet public key if provided
      thumbnailUrl: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`sensor:${user.id}:${id}`, sensor);
    
    // If mock mode, initialize with some mock readings
    if (mode === 'mock') {
      console.log(`Initializing mock sensor ${id} with sample readings`);
      // We'll generate readings via a separate background process
    }
    
    console.log(`Created sensor ${id} (mode: ${mode}, wallet: ${walletPublicKey ? 'linked' : 'none'})`);
    
    return c.json({ sensor });
  } catch (error) {
    console.error('Failed to create sensor:', error);
    return c.json({ error: 'Failed to create sensor' }, 500);
  }
});

app.put("/make-server-4a89e1c9/sensors/:id", async (c) => {
  try {
    const user = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const id = c.req.param('id');
    const updates = await c.req.json();
    
    const existing = await kv.get(`sensor:${user.id}:${id}`);
    if (!existing) {
      return c.json({ error: 'Sensor not found' }, 404);
    }

    const sensor = { 
      ...existing, 
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`sensor:${user.id}:${id}`, sensor);
    
    return c.json({ sensor });
  } catch (error) {
    console.error('Failed to update sensor:', error);
    return c.json({ error: 'Failed to update sensor' }, 500);
  }
});

app.delete("/make-server-4a89e1c9/sensors/:id", async (c) => {
  try {
    const user = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const id = c.req.param('id');
    
    // Delete the main sensor
    await kv.del(`sensor:${user.id}:${id}`);
    
    // Get all readings and datasets by prefix to find their keys
    // Note: getByPrefix returns the values, and each reading/dataset has an id field
    const readingValues = await kv.getByPrefix(`reading:${id}:`);
    const datasetValues = await kv.getByPrefix(`dataset:${id}:`);
    
    // Build the list of keys to delete
    const keysToDelete: string[] = [];
    
    // Add reading keys
    for (const reading of readingValues) {
      if (reading && reading.id) {
        keysToDelete.push(`reading:${id}:${reading.id}`);
      }
    }
    
    // Add dataset keys
    for (const dataset of datasetValues) {
      if (dataset && dataset.id) {
        keysToDelete.push(`dataset:${id}:${dataset.id}`);
      }
    }
    
    // Delete all associated readings and datasets
    if (keysToDelete.length > 0) {
      await kv.mdel(keysToDelete);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Failed to delete sensor:', error);
    return c.json({ error: 'Failed to delete sensor', details: error.message }, 500);
  }
});

// ======================
// Reading Routes
// ======================

app.get("/make-server-4a89e1c9/readings/:sensorId", async (c) => {
  try {
    const user = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const sensorId = c.req.param('sensorId');
    const limit = parseInt(c.req.query('limit') || '100');
    
    const readings = await kv.getByPrefix(`reading:${sensorId}:`);
    const sortedReadings = (readings || [])
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    return c.json({ readings: sortedReadings });
  } catch (error) {
    console.error('Failed to fetch readings:', error);
    return c.json({ error: 'Failed to fetch readings' }, 500);
  }
});

app.get("/make-server-4a89e1c9/readings/:sensorId/historical", async (c) => {
  try {
    const user = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const sensorId = c.req.param('sensorId');
    const start = new Date(c.req.query('start') || '');
    const end = new Date(c.req.query('end') || '');
    
    const readings = await kv.getByPrefix(`reading:${sensorId}:`);
    const filteredReadings = (readings || []).filter((r: any) => {
      const timestamp = new Date(r.timestamp);
      return timestamp >= start && timestamp <= end;
    });

    return c.json({ readings: filteredReadings });
  } catch (error) {
    console.error('Failed to fetch historical readings:', error);
    return c.json({ error: 'Failed to fetch historical readings' }, 500);
  }
});

app.post("/make-server-4a89e1c9/readings", async (c) => {
  try {
    const user = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { sensorId, variable, value, unit, signature } = await c.req.json();
    const id = generateId();
    const timestamp = new Date().toISOString();

    // Generate hash for the reading
    const hashInput = `${sensorId}-${timestamp}-${value}-${variable}`;
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(hashInput));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const reading = {
      id,
      sensorId,
      timestamp,
      variable,
      value,
      unit,
      verified: !!signature,
      signature,
      hash,
    };

    await kv.set(`reading:${sensorId}:${id}`, reading);
    
    // Update sensor's last reading and status
    const sensor = await kv.get(`sensor:${user.id}:${sensorId}`);
    if (sensor) {
      sensor.lastReading = reading;
      sensor.status = 'active';
      await kv.set(`sensor:${user.id}:${sensorId}`, sensor);
    }

    return c.json({ reading });
  } catch (error) {
    console.error('Failed to create reading:', error);
    return c.json({ error: 'Failed to create reading' }, 500);
  }
});

// ======================
// Dataset Routes
// ======================

app.get("/make-server-4a89e1c9/datasets/:sensorId", async (c) => {
  try {
    const user = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const sensorId = c.req.param('sensorId');
    const datasets = await kv.getByPrefix(`dataset:${sensorId}:`);
    
    return c.json({ datasets: datasets || [] });
  } catch (error) {
    console.error('Failed to fetch datasets:', error);
    return c.json({ error: 'Failed to fetch datasets' }, 500);
  }
});

app.get("/make-server-4a89e1c9/datasets/detail/:id", async (c) => {
  try {
    const user = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const id = c.req.param('id');
    const datasets = await kv.getByPrefix(`dataset:`);
    const dataset = datasets.find((d: any) => d.id === id);
    
    if (!dataset) {
      return c.json({ error: 'Dataset not found' }, 404);
    }

    // Get preview readings from last hour within dataset period
    const readings = await kv.getByPrefix(`reading:${dataset.sensorId}:`);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const datasetStart = new Date(dataset.startDate);
    const datasetEnd = new Date(dataset.endDate);
    
    const previewReadings = readings.filter((r: any) => {
      const timestamp = new Date(r.timestamp);
      return timestamp >= oneHourAgo && timestamp >= datasetStart && timestamp <= datasetEnd;
    }).slice(0, 50); // Limit to 50 readings

    // Increment access count
    const currentAccessCount = dataset.accessCount || 0;
    dataset.accessCount = currentAccessCount + 1;
    await kv.set(`dataset:${dataset.sensorId}:${id}`, dataset);

    return c.json({ 
      dataset: {
        ...dataset,
        previewReadings
      }
    });
  } catch (error) {
    console.error('Failed to fetch dataset:', error);
    return c.json({ error: 'Failed to fetch dataset' }, 500);
  }
});

app.post("/make-server-4a89e1c9/datasets", async (c) => {
  try {
    const user = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { name, sensorId, startDate, endDate, isPublic } = await c.req.json();
    const id = generateId();

    // Count readings in range
    const readings = await kv.getByPrefix(`reading:${sensorId}:`);
    const start = new Date(startDate);
    const end = new Date(endDate);
    const readingsInRange = readings.filter((r: any) => {
      const timestamp = new Date(r.timestamp);
      return timestamp >= start && timestamp <= end;
    });

    const dataset = {
      id,
      name,
      sensorId,
      startDate,
      endDate,
      readingsCount: readingsInRange.length,
      status: 'preparing',
      isPublic: isPublic || false,
      createdAt: new Date().toISOString(),
      accessCount: 0,
    };

    await kv.set(`dataset:${sensorId}:${id}`, dataset);
    return c.json({ dataset });
  } catch (error) {
    console.error('Failed to create dataset:', error);
    return c.json({ error: 'Failed to create dataset' }, 500);
  }
});

app.put("/make-server-4a89e1c9/datasets/:id", async (c) => {
  try {
    const user = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const id = c.req.param('id');
    const updates = await c.req.json();
    
    const datasets = await kv.getByPrefix(`dataset:`);
    const dataset = datasets.find((d: any) => d.id === id);
    
    if (!dataset) {
      return c.json({ error: 'Dataset not found' }, 404);
    }

    const updatedDataset = { ...dataset, ...updates };
    await kv.set(`dataset:${dataset.sensorId}:${id}`, updatedDataset);
    
    return c.json({ dataset: updatedDataset });
  } catch (error) {
    console.error('Failed to update dataset:', error);
    return c.json({ error: 'Failed to update dataset' }, 500);
  }
});

app.post("/make-server-4a89e1c9/datasets/:id/anchor", async (c) => {
  try {
    const user = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const id = c.req.param('id');
    const datasets = await kv.getByPrefix(`dataset:`);
    const dataset = datasets.find((d: any) => d.id === id);
    
    if (!dataset) {
      return c.json({ error: 'Dataset not found' }, 404);
    }

    // Get readings in dataset range and calculate actual Merkle root
    const readings = await kv.getByPrefix(`reading:${dataset.sensorId}:`);
    const start = new Date(dataset.startDate);
    const end = new Date(dataset.endDate);
    const readingsInRange = readings.filter((r: any) => {
      const timestamp = new Date(r.timestamp);
      return timestamp >= start && timestamp <= end;
    });

    const merkleRoot = await calculateMerkleRoot(readingsInRange);
    const transactionId = generateId().replace(/-/g, '');

    dataset.status = 'anchoring';
    dataset.merkleRoot = merkleRoot;
    dataset.transactionId = transactionId;
    dataset.accessCount = dataset.accessCount || 0;
    
    await kv.set(`dataset:${dataset.sensorId}:${id}`, dataset);

    // Simulate async anchoring process
    setTimeout(async () => {
      dataset.status = 'anchored';
      await kv.set(`dataset:${dataset.sensorId}:${id}`, dataset);
    }, 3000);

    return c.json({ dataset });
  } catch (error) {
    console.error('Failed to anchor dataset:', error);
    return c.json({ error: 'Failed to anchor dataset' }, 500);
  }
});

// Increment dataset access count
app.post("/make-server-4a89e1c9/datasets/:id/access", async (c) => {
  try {
    const user = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const id = c.req.param('id');
    const datasets = await kv.getByPrefix(`dataset:`);
    const dataset = datasets.find((d: any) => d.id === id);
    
    if (!dataset) {
      return c.json({ error: 'Dataset not found' }, 404);
    }

    dataset.accessCount = (dataset.accessCount || 0) + 1;
    await kv.set(`dataset:${dataset.sensorId}:${id}`, dataset);

    return c.json({ success: true, accessCount: dataset.accessCount });
  } catch (error) {
    console.error('Failed to increment access count:', error);
    return c.json({ error: 'Failed to increment access count' }, 500);
  }
});

// Delete dataset
app.delete("/make-server-4a89e1c9/datasets/:id", async (c) => {
  try {
    const user = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const id = c.req.param('id');
    
    // Find the dataset
    const datasets = await kv.getByPrefix(`dataset:`);
    const dataset = datasets.find((d: any) => d.id === id);
    
    if (!dataset) {
      return c.json({ error: 'Dataset not found' }, 404);
    }

    // Check ownership - verify user owns the sensor
    const sensor = await kv.get(`sensor:${user.id}:${dataset.sensorId}`);
    if (!sensor) {
      return c.json({ error: 'Unauthorized: You do not own this sensor' }, 403);
    }

    // Delete the dataset
    await kv.del(`dataset:${dataset.sensorId}:${id}`);

    console.log(`Dataset ${id} deleted by user ${user.id}`);
    return c.json({ success: true, message: 'Dataset successfully deleted' });
  } catch (error) {
    console.error('Failed to delete dataset:', error);
    return c.json({ error: 'Failed to delete dataset' }, 500);
  }
});

// ======================
// Verification Routes
// ======================

// Verify single hash
app.post("/make-server-4a89e1c9/verify/hash", async (c) => {
  try {
    const user = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { sensorId, hash } = await c.req.json();
    
    // Search for the hash in recent readings
    const readings = await kv.getByPrefix(`reading:${sensorId}:`);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentReadings = readings.filter((r: any) => new Date(r.timestamp) >= oneHourAgo);
    const found = recentReadings.find((r: any) => r.hash === hash);

    if (found) {
      return c.json({ 
        verified: true, 
        reading: found,
        message: 'Hash verified! Reading is authentic.'
      });
    } else {
      return c.json({ 
        verified: false, 
        message: 'Hash not found in recent readings'
      });
    }
  } catch (error) {
    console.error('Failed to verify hash:', error);
    return c.json({ error: 'Failed to verify hash' }, 500);
  }
});

// Verify hourly Merkle root
app.post("/make-server-4a89e1c9/verify/merkle", async (c) => {
  try {
    const user = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { sensorId, merkleRoot } = await c.req.json();
    
    // Calculate current hourly Merkle root
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const readings = await kv.getByPrefix(`reading:${sensorId}:`);
    const lastHourReadings = readings.filter((r: any) => new Date(r.timestamp) >= oneHourAgo);
    const currentMerkleRoot = await calculateMerkleRoot(lastHourReadings);

    if (currentMerkleRoot === merkleRoot) {
      return c.json({ 
        verified: true, 
        readingsCount: lastHourReadings.length,
        message: `Merkle root verified for ${lastHourReadings.length} readings from the last hour`
      });
    } else {
      return c.json({ 
        verified: false, 
        expected: currentMerkleRoot,
        received: merkleRoot,
        message: 'Merkle root does not match'
      });
    }
  } catch (error) {
    console.error('Failed to verify Merkle root:', error);
    return c.json({ error: 'Failed to verify Merkle root' }, 500);
  }
});

// ======================
// Stats Route
// ======================

app.get("/make-server-4a89e1c9/stats", async (c) => {
  try {
    const user = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const sensors = await kv.getByPrefix(`sensor:${user.id}:`);
    const activeSensors = sensors.filter((s: any) => s.status === 'active').length;
    
    let totalReadings = 0;
    let totalDatasets = 0;
    
    for (const sensor of sensors) {
      const readings = await kv.getByPrefix(`reading:${sensor.id}:`);
      const datasets = await kv.getByPrefix(`dataset:${sensor.id}:`);
      totalReadings += readings.length;
      totalDatasets += datasets.length;
    }

    return c.json({
      totalSensors: sensors.length,
      activeSensors,
      totalReadings,
      totalDatasets,
    });
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    return c.json({ error: 'Failed to fetch stats' }, 500);
  }
});

// ======================
// Public API Routes (No Authentication Required)
// ======================

// Get all public sensors
app.get("/make-server-4a89e1c9/public/sensors", async (c) => {
  try {
    const allSensors = await kv.getByPrefix('sensor:');
    console.log(`Found ${allSensors.length} total sensors in database`);
    
    // Filter sensors with visibility = 'public'
    const publicSensors = allSensors.filter((sensor: any) => sensor.visibility === 'public');
    
    console.log(`Returning ${publicSensors.length} public sensors (filtered by visibility='public')`);
    return c.json({ sensors: publicSensors });
  } catch (error) {
    console.error('Failed to fetch public sensors:', error);
    return c.json({ error: 'Failed to fetch public sensors' }, 500);
  }
});

// Get top 3 featured public sensors with metrics
app.get("/make-server-4a89e1c9/public/sensors/featured", async (c) => {
  try {
    const allSensors = await kv.getByPrefix('sensor:');
    console.log(`Processing ${allSensors.length} sensors for featured list`);
    const sensorsWithMetrics = [];
    
    for (const sensor of allSensors) {
      // Only include sensors with visibility='public'
      if (sensor.visibility !== 'public') {
        continue;
      }
      
      const datasets = await kv.getByPrefix(`dataset:${sensor.id}:`);
      const publicDatasets = datasets.filter((d: any) => d.isPublic === true);
      
      if (true) { // Always include public sensors, even without datasets
        const readings = await kv.getByPrefix(`reading:${sensor.id}:`);
        const verifiedDatasets = publicDatasets.filter((d: any) => d.status === 'anchored');
        
        // Calculate total verified (sum of all dataset accesses)
        const totalVerified = datasets.reduce((sum: number, d: any) => sum + (d.accessCount || 0), 0);
        
        // Get last reading
        const sortedReadings = readings.sort((a: any, b: any) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        // Calculate hourly Merkle root
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const lastHourReadings = readings.filter((r: any) => new Date(r.timestamp) >= oneHourAgo);
        const hourlyMerkleRoot = await calculateMerkleRoot(lastHourReadings);
        
        sensorsWithMetrics.push({
          id: sensor.id,
          name: sensor.name,
          type: sensor.type,
          status: sensor.status,
          lastReading: sortedReadings[0] || null,
          publicDatasetsCount: publicDatasets.length,
          totalReadingsCount: readings.length,
          verifiedDatasetsCount: verifiedDatasets.length,
          totalVerified,
          hourlyMerkleRoot,
          lastActivity: sortedReadings[0]?.timestamp || sensor.createdAt,
        });
      }
    }
    
    console.log(`Found ${sensorsWithMetrics.length} sensors with public datasets`);
    
    // Sort by activity and take top 3
    const featured = sensorsWithMetrics
      .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
      .slice(0, 3);

    console.log(`Returning ${featured.length} featured sensors`);
    return c.json({ sensors: featured });
  } catch (error) {
    console.error('Failed to fetch featured sensors:', error);
    return c.json({ error: 'Failed to fetch featured sensors' }, 500);
  }
});

// Get a specific public sensor
app.get("/make-server-4a89e1c9/public/sensors/:id", async (c) => {
  try {
    const sensorId = c.req.param('id');
    const allSensors = await kv.getByPrefix('sensor:');
    const sensor = allSensors.find((s: any) => s.id === sensorId);
    
    if (!sensor) {
      return c.json({ error: 'Sensor not found' }, 404);
    }
    
    // Check if sensor visibility is public
    if (sensor.visibility !== 'public') {
      return c.json({ error: 'Sensor is not public' }, 403);
    }

    return c.json({ sensor });
  } catch (error) {
    console.error('Failed to fetch public sensor:', error);
    return c.json({ error: 'Failed to fetch public sensor' }, 500);
  }
});

// Get public datasets for a sensor
app.get("/make-server-4a89e1c9/public/datasets/:sensorId", async (c) => {
  try {
    const sensorId = c.req.param('sensorId');
    
    // Check if sensor visibility is public
    const allSensors = await kv.getByPrefix('sensor:');
    const sensor = allSensors.find((s: any) => s.id === sensorId);
    
    if (!sensor) {
      return c.json({ error: 'Sensor not found' }, 404);
    }
    
    if (sensor.visibility !== 'public') {
      return c.json({ error: 'Sensor datasets are not public' }, 403);
    }
    
    const datasets = await kv.getByPrefix(`dataset:${sensorId}:`);
    const publicDatasets = datasets.filter((d: any) => d.isPublic === true);

    return c.json({ datasets: publicDatasets });
  } catch (error) {
    console.error('Failed to fetch public datasets:', error);
    return c.json({ error: 'Failed to fetch public datasets' }, 500);
  }
});

// Get public readings for a sensor
app.get("/make-server-4a89e1c9/public/readings/:sensorId", async (c) => {
  try {
    const sensorId = c.req.param('sensorId');
    const limit = parseInt(c.req.query('limit') || '100');
    
    // Check if sensor visibility is public
    const allSensors = await kv.getByPrefix('sensor:');
    const sensor = allSensors.find((s: any) => s.id === sensorId);
    
    if (!sensor) {
      return c.json({ error: 'Sensor not found' }, 404);
    }
    
    if (sensor.visibility !== 'public') {
      return c.json({ error: 'Sensor readings are not public' }, 403);
    }
    
    const readings = await kv.getByPrefix(`reading:${sensorId}:`);
    const sortedReadings = readings
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    return c.json({ readings: sortedReadings });
  } catch (error) {
    console.error('Failed to fetch public readings:', error);
    return c.json({ error: 'Failed to fetch public readings' }, 500);
  }
});

// Get public hourly Merkle root for a sensor
app.get("/make-server-4a89e1c9/public/sensors/:sensorId/hourly-merkle", async (c) => {
  try {
    const sensorId = c.req.param('sensorId');
    
    // Check if sensor visibility is public
    const allSensors = await kv.getByPrefix('sensor:');
    const sensor = allSensors.find((s: any) => s.id === sensorId);
    
    if (!sensor) {
      return c.json({ error: 'Sensor not found' }, 404);
    }
    
    if (sensor.visibility !== 'public') {
      return c.json({ error: 'Sensor data is not public' }, 403);
    }
    
    // Calculate hourly Merkle root
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const readings = await kv.getByPrefix(`reading:${sensorId}:`);
    const lastHourReadings = readings.filter((r: any) => new Date(r.timestamp) >= oneHourAgo);
    const merkleRoot = await calculateMerkleRoot(lastHourReadings);

    return c.json({ 
      merkleRoot,
      readingsCount: lastHourReadings.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to fetch public hourly Merkle root:', error);
    return c.json({ error: 'Failed to fetch public hourly Merkle root' }, 500);
  }
});

// ======================
// Mock Data Generation
// ======================

// Generate mock readings for all mock sensors
app.post("/make-server-4a89e1c9/internal/generate-mock-data", async (c) => {
  try {
    const allSensors = await kv.getByPrefix('sensor:');
    const mockSensors = allSensors.filter((s: any) => s.mode === 'mock');
    
    console.log(`Generating mock data for ${mockSensors.length} mock sensors`);
    
    const results = [];
    for (const sensor of mockSensors) {
      const reading = await generateMockReading(sensor);
      results.push({ sensorId: sensor.id, readingId: reading.id });
      
      // Update sensor status to active and set last reading
      sensor.status = 'active';
      sensor.updatedAt = new Date().toISOString();
      await kv.set(`sensor:${sensor.owner}:${sensor.id}`, sensor);
    }
    
    return c.json({ 
      success: true, 
      generated: results.length,
      readings: results 
    });
  } catch (error) {
    console.error('Failed to generate mock data:', error);
    return c.json({ error: 'Failed to generate mock data' }, 500);
  }
});

// Start periodic mock data generation (every 5 seconds)
setInterval(async () => {
  try {
    const allSensors = await kv.getByPrefix('sensor:');
    
    if (!allSensors || allSensors.length === 0) {
      return; // No sensors found, skip this cycle
    }
    
    const mockSensors = allSensors.filter((s: any) => s.mode === 'mock' && s.status === 'active');
    
    if (mockSensors.length > 0) {
      console.log(`Auto-generating mock data for ${mockSensors.length} active mock sensors`);
      
      for (const sensor of mockSensors) {
        try {
          await generateMockReading(sensor);
        } catch (sensorError) {
          console.error(`Failed to generate reading for sensor ${sensor.id}:`, sensorError);
          // Continue with next sensor instead of failing entire batch
        }
      }
    }
  } catch (error) {
    // Log error but don't crash - database might be temporarily unavailable
    console.error('Error in periodic mock data generation:', error instanceof Error ? error.message : String(error));
  }
}, 5000); // Every 5 seconds

Deno.serve(app.fetch);