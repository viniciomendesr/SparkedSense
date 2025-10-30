# Sparked Sense - System Architecture

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                           USER INTERFACE                             │
│                         (React + Tailwind)                           │
├──────────────┬──────────────┬──────────────┬────────────────────────┤
│   Home       │  Dashboard   │  Public      │  Audit Pages           │
│   • Hero     │  • Sensors   │  Sensors     │  • Verification        │
│   • Featured │  • Datasets  │  • Browse    │  • Merkle Proofs       │
│   • Team     │  • Stats     │  • View      │  • Transaction Links   │
└──────┬───────┴──────┬───────┴──────┬───────┴────────┬───────────────┘
       │              │              │                │
       │ WebSocket    │ HTTP/REST    │ HTTP/REST      │ HTTP/REST
       │ (Real-time)  │ (Protected)  │ (Public)       │ (Public)
       ↓              ↓              ↓                ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    SUPABASE EDGE FUNCTIONS                           │
│                        (Hono Server)                                 │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                        Main Server                           │   │
│  │                      (index.tsx)                             │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │  • Authentication Routes                                     │   │
│  │  • Sensor Management                                         │   │
│  │  • Reading Operations                                        │   │
│  │  • Dataset Management                                        │   │
│  │  • Verification Services                                     │   │
│  │  • Public API                                                │   │
│  │  • Mock Data Generation                                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐   │
│  │  Supabase  │  │   Device   │  │   Solana   │  │   Redis    │   │
│  │   Client   │  │  Registry  │  │  Service   │  │   Cache    │   │
│  ├────────────┤  ├────────────┤  ├────────────┤  ├────────────┤   │
│  │ • Auth     │  │ • Register │  │ • Anchor   │  │ • Set/Get  │   │
│  │ • Admin    │  │ • Claim    │  │ • Verify   │  │ • Expire   │   │
│  │ • Client   │  │ • Revoke   │  │ • Merkle   │  │ • Stats    │   │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘   │
│                                                                       │
└───────┬───────────────────────────────────────────────────┬─────────┘
        │                                                   │
        ↓                                                   ↓
┌─────────────────────────────────────────┐   ┌─────────────────────┐
│      SUPABASE POSTGRESQL DATABASE       │   │  SOLANA BLOCKCHAIN  │
├─────────────────────────────────────────┤   ├─────────────────────┤
│  ┌────────────┐  ┌────────────────┐    │   │  • Dataset Proofs   │
│  │   users    │  │    devices     │    │   │  • Merkle Roots     │
│  └─────┬──────┘  └───────┬────────┘    │   │  • Transaction IDs  │
│        │                 │              │   │  • Public Audit     │
│        └────────┬────────┘              │   └─────────────────────┘
│                 │                       │
│        ┌────────┴──────────┐           │
│        │  sensor_readings  │           │
│        └────────┬──────────┘           │
│                 │                       │
│        ┌────────┴──────────┐           │
│        │     datasets      │           │
│        └────────┬──────────┘           │
│                 │                       │
│        ┌────────┴──────────┐           │
│        │    audit_logs     │           │
│        └───────────────────┘           │
│                                         │
│  • Row Level Security (RLS)            │
│  • Indexes for Performance             │
│  • Foreign Key Constraints             │
│  • Auto-updating Timestamps            │
└─────────────────────────────────────────┘
```

## 🔄 Data Flow Diagrams

### 1. User Authentication Flow

```
┌─────────┐                ┌──────────┐               ┌──────────┐
│  User   │                │  Server  │               │ Database │
└────┬────┘                └────┬─────┘               └────┬─────┘
     │                          │                          │
     │ POST /auth/signup        │                          │
     ├─────────────────────────>│                          │
     │  {email, password, name} │                          │
     │                          │                          │
     │                          │ Create User              │
     │                          ├─────────────────────────>│
     │                          │                          │
     │                          │ User Record              │
     │                          │<─────────────────────────┤
     │                          │                          │
     │ {user: {...}}            │                          │
     │<─────────────────────────┤                          │
     │                          │                          │
     │ POST /auth/signin        │                          │
     ├─────────────────────────>│                          │
     │  {email, password}       │                          │
     │                          │                          │
     │                          │ Verify Credentials       │
     │                          ├─────────────────────────>│
     │                          │                          │
     │                          │ Session + JWT            │
     │                          │<─────────────────────────┤
     │                          │                          │
     │ {accessToken, user}      │                          │
     │<─────────────────────────┤                          │
     │                          │                          │
```

### 2. Mock Sensor Data Generation

```
┌──────────────┐         ┌─────────────┐         ┌──────────┐
│ Auto-Timer   │         │   Server    │         │ Database │
│ (Every 5s)   │         │             │         │          │
└──────┬───────┘         └──────┬──────┘         └────┬─────┘
       │                        │                     │
       │ Trigger                │                     │
       ├───────────────────────>│                     │
       │                        │                     │
       │                        │ Find Mock Sensors   │
       │                        ├────────────────────>│
       │                        │                     │
       │                        │ [sensors]           │
       │                        │<────────────────────┤
       │                        │                     │
       │                        │ For each sensor:    │
       │                        │  • Generate value   │
       │                        │  • Calculate hash   │
       │                        │  • Create reading   │
       │                        │                     │
       │                        │ Store Readings      │
       │                        ├────────────────────>│
       │                        │                     │
       │                        │ Confirm             │
       │                        │<────────────────────┤
       │                        │                     │
       │                        │ Broadcast Update    │
       │                        ├──────────────┐      │
       │                        │              │      │
       │                        │ WebSocket    │      │
       │                        └──────────────┘      │
       │                               │              │
       │                               ↓              │
       │                        ┌──────────┐          │
       │                        │ Frontend │          │
       │                        │ Updates  │          │
       │                        └──────────┘          │
```

### 3. Real Sensor Registration & Data Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Frontend │     │  Server  │     │ Database │     │ Arduino  │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                 │                │
     │ Generate Token │                 │                │
     ├───────────────>│                 │                │
     │                │                 │                │
     │ {claimToken}   │                 │                │
     │<───────────────┤                 │                │
     │                │                 │                │
     │ Register       │                 │                │
     ├───────────────>│                 │                │
     │ {name, token}  │                 │                │
     │                │                 │                │
     │                │ Create Device   │                │
     │                ├────────────────>│                │
     │                │                 │                │
     │ {sensor}       │                 │                │
     │<───────────────┤                 │                │
     │                │                 │                │
     │ [User shares claim token with device]             │
     │                │                 │                │
     │                │                 │  Claim Device  │
     │                │                 │<───────────────┤
     │                │                 │  {token, key}  │
     │                │                 │                │
     │                │ Link Device     │                │
     │                │<────────────────┤                │
     │                │                 │                │
     │                │ Confirm         │                │
     │                ├────────────────>│                │
     │                │                 │                │
     │                │                 │  {success}     │
     │                │                 ├───────────────>│
     │                │                 │                │
     │                │                 │  Send Reading  │
     │                │                 │<───────────────┤
     │                │                 │  {signed data} │
     │                │                 │                │
     │                │ Verify & Store  │                │
     │                │<────────────────┤                │
     │                ├────────────────>│                │
     │                │                 │                │
     │ Real-time Update                 │                │
     │<───────────────┤                 │                │
```

### 4. Dataset Anchoring Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌─────────┐
│ Frontend │     │  Server  │     │ Database │     │ Solana  │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬────┘
     │                │                 │                │
     │ Create Dataset │                 │                │
     ├───────────────>│                 │                │
     │ {name, range}  │                 │                │
     │                │                 │                │
     │                │ Count Readings  │                │
     │                ├────────────────>│                │
     │                │                 │                │
     │                │ Create Dataset  │                │
     │                ├────────────────>│                │
     │                │ status:preparing│                │
     │                │                 │                │
     │ {dataset}      │                 │                │
     │<───────────────┤                 │                │
     │                │                 │                │
     │ Anchor         │                 │                │
     ├───────────────>│                 │                │
     │                │                 │                │
     │                │ Get Readings    │                │
     │                ├────────────────>│                │
     │                │                 │                │
     │                │ [readings]      │                │
     │                │<────────────────┤                │
     │                │                 │                │
     │                │ Calculate       │                │
     │                │ Merkle Root     │                │
     │                │                 │                │
     │                │ Update Dataset  │                │
     │                ├────────────────>│                │
     │                │ status:anchoring│                │
     │                │                 │                │
     │                │                 │  Anchor Proof  │
     │                │                 │───────────────>│
     │                │                 │  {merkleRoot}  │
     │                │                 │                │
     │                │                 │  {txId, sig}   │
     │                │                 │<───────────────┤
     │                │                 │                │
     │                │ Update Dataset  │                │
     │                ├────────────────>│                │
     │                │ status:anchored │                │
     │                │ txId: ...       │                │
     │                │                 │                │
     │ {updated}      │                 │                │
     │<───────────────┤                 │                │
     │                │                 │                │
     │ View Audit     │                 │                │
     │ Page           │                 │                │
```

## 🗄️ Database Schema

```
┌────────────────────────────────────────────────────────────┐
│                         users                               │
├────────────────────────────────────────────────────────────┤
│ PK  id                 UUID                                 │
│     wallet_address     TEXT                                 │
│     email              TEXT                                 │
│     name               TEXT                                 │
│     created_at         TIMESTAMP                            │
│     updated_at         TIMESTAMP                            │
└────────────┬───────────────────────────────────────────────┘
             │ 1
             │
             │ N
┌────────────┴───────────────────────────────────────────────┐
│                        devices                              │
├────────────────────────────────────────────────────────────┤
│ PK  id                 UUID                                 │
│     name               TEXT                                 │
│     type               TEXT                                 │
│     visibility         TEXT (public/private/partial)        │
│     mode               TEXT (real/mock)                     │
│     status             TEXT (active/inactive/reconnecting)  │
│     mac_address        TEXT                                 │
│     public_key         TEXT                                 │
│     claim_token        TEXT                                 │
│ FK  owner_user_id      UUID → users.id                      │
│     owner_wallet       TEXT                                 │
│     thumbnail_url      TEXT                                 │
│     created_at         TIMESTAMP                            │
│     updated_at         TIMESTAMP                            │
└────────────┬───────────────────────────────────────────────┘
             │ 1
             │
             ├────────────────────┐
             │ N                  │ N
┌────────────┴──────────┐  ┌─────┴─────────────────────────┐
│   sensor_readings      │  │        datasets                │
├────────────────────────┤  ├────────────────────────────────┤
│ PK  id          UUID   │  │ PK  id               UUID      │
│ FK  sensor_id   UUID   │  │ FK  sensor_id        UUID      │
│     timestamp   TIMESTAMP  │     name             TEXT      │
│     variable    TEXT   │  │     start_date       TIMESTAMP │
│     value       NUMERIC│  │     end_date         TIMESTAMP │
│     unit        TEXT   │  │     readings_count   INTEGER   │
│     verified    BOOLEAN│  │     status           TEXT      │
│     verification_hash TEXT │ merkle_root        TEXT      │
│     signature   TEXT   │  │     transaction_id   TEXT      │
│     created_at  TIMESTAMP  │     is_public        BOOLEAN   │
└────────────────────────┘  │     access_count     INTEGER   │
                             │     created_at       TIMESTAMP │
                             │     anchored_at      TIMESTAMP │
                             └────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                      audit_logs                           │
├──────────────────────────────────────────────────────────┤
│ PK  id                    UUID                            │
│     action                TEXT                            │
│     entity_type           TEXT                            │
│     entity_id             UUID                            │
│ FK  user_id               UUID → users.id                 │
│     wallet_address        TEXT                            │
│     ip_address            TEXT                            │
│     verification_success  BOOLEAN                         │
│     verification_data     JSONB                           │
│     created_at            TIMESTAMP                       │
└──────────────────────────────────────────────────────────┘
```

## 🔐 Security Architecture

```
┌────────────────────────────────────────────────────────────┐
│                    Security Layers                          │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  Layer 1: Network Security                                 │
│  ├─ HTTPS/TLS encryption                                   │
│  ├─ CORS configuration                                     │
│  └─ Rate limiting (to be implemented)                      │
│                                                             │
│  Layer 2: Authentication                                   │
│  ├─ JWT tokens via Supabase Auth                           │
│  ├─ Token expiration (1 hour default)                      │
│  ├─ Refresh token rotation                                 │
│  └─ Session management                                     │
│                                                             │
│  Layer 3: Authorization                                    │
│  ├─ Row Level Security (RLS) policies                      │
│  ├─ Owner-based access control                             │
│  ├─ Public/private data separation                         │
│  └─ Service role bypass for backend ops                    │
│                                                             │
│  Layer 4: Data Verification                                │
│  ├─ Device signature verification                          │
│  ├─ Cryptographic hashing (SHA-256)                        │
│  ├─ Merkle tree proofs                                     │
│  └─ Blockchain anchoring                                   │
│                                                             │
│  Layer 5: Input Validation                                 │
│  ├─ Request payload validation                             │
│  ├─ Type checking (TypeScript)                             │
│  ├─ SQL injection prevention (parameterized queries)       │
│  └─ XSS protection (sanitized outputs)                     │
│                                                             │
└──────────────────────────────────���─────────────────────────┘
```

## 📊 Performance Optimizations

```
┌────────────────────────────────────────────────────────────┐
│                   Performance Strategy                      │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  Frontend                                                   │
│  ├─ React component memoization                            │
│  ├─ Lazy loading of routes                                 │
│  ├─ Debounced API calls                                    │
│  └─ Optimistic UI updates                                  │
│                                                             │
│  API Layer                                                  │
│  ├─ Redis cache (in-memory)                                │
│  ├─ Response compression                                   │
│  ├─ Batch operations                                       │
│  └─ Connection pooling                                     │
│                                                             │
│  Database                                                   │
│  ├─ Indexes on frequently queried columns                  │
│  │   • owner_user_id                                       │
│  │   • sensor_id                                           │
│  │   • timestamp                                           │
│  │   • visibility                                          │
│  │   • verification_hash                                   │
│  ├─ Materialized views for complex queries                 │
│  ├─ Partitioning for large tables (future)                 │
│  └─ Query optimization                                     │
│                                                             │
│  Caching Strategy                                           │
│  ├─ Sensor metadata (5 min TTL)                            │
│  ├─ Public sensor list (1 min TTL)                         │
│  ├─ Dataset info (10 min TTL)                              │
│  └─ Automatic cache invalidation on updates                │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

## 🔄 Real-Time Data Flow

```
┌────────────────────────────────────────────────────────────┐
│                Real-Time Subscription Flow                  │
└────────────────────────────────────────────────────────────┘
                             │
                             ↓
              ┌──────────────────────────┐
              │   Supabase Realtime      │
              │   (PostgreSQL CDC)       │
              └─────────┬────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ↓               ↓               ↓
   ┌─────────┐    ┌─────────┐    ┌─────────┐
   │ devices │    │ sensor_ │    │ datasets│
   │ changes │    │ readings│    │ changes │
   └────┬────┘    └────┬────┘    └────┬────┘
        │              │              │
        │              │              │
        └──────┬───────┴────┬─────────┘
               │            │
               ↓            ↓
        ┌──────────────────────────┐
        │   WebSocket Connection   │
        │   (Client Subscribe)     │
        └──────────┬───────────────┘
                   │
                   ↓
        ┌──────────────────────────┐
        │   Frontend React State   │
        │   • useState/useEffect   │
        │   • Automatic re-render  │
        └──────────────────────────┘
```

## 📈 Scaling Strategy

```
┌────────────────────────────────────────────────────────────┐
│                    Current Capacity                         │
├────────────────────────────────────────────────────────────┤
│ • Single Supabase instance                                 │
│ • Auto-scaling Edge Functions                              │
│ • Connection pooling enabled                               │
│ • In-memory caching (per-instance)                         │
└────────────────────────────────────────────────────────────┘
                             │
                             ↓
┌────────────────────────────────────────────────────────────┐
│                   Scaling Path (Future)                     │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  Horizontal Scaling                                         │
│  ├─ Multiple Edge Function instances (automatic)           │
│  ├─ Read replicas for database                             │
│  └─ CDN for static assets                                  │
│                                                             │
│  Vertical Scaling                                           │
│  ├─ Increase database resources                            │
│  ├─ Optimize queries and indexes                           │
│  └─ Implement caching layers                               │
│                                                             │
│  Data Partitioning                                          │
│  ├─ Partition readings by date                             │
│  ├─ Archive old datasets                                   │
│  └─ Separate hot/cold storage                              │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

---

## 🎓 Key Architectural Decisions

### 1. Single Supabase Instance
**Why**: Simplifies management, reduces costs, easier to maintain consistency  
**Trade-off**: Single point of failure (mitigated by Supabase's infrastructure)

### 2. Edge Functions for API
**Why**: Serverless, auto-scaling, low latency, integrated with Supabase  
**Trade-off**: Cold starts (minimal impact), stateless (use cache)

### 3. PostgreSQL as Primary Database
**Why**: ACID compliance, strong consistency, powerful querying, JSON support  
**Trade-off**: May need sharding for extreme scale (not needed yet)

### 4. Row Level Security (RLS)
**Why**: Database-enforced security, prevents data leaks, simple to reason about  
**Trade-off**: Slight performance overhead (negligible for our use case)

### 5. In-Memory Cache (Redis-like)
**Why**: Fast, simple, no external dependencies  
**Trade-off**: Per-instance cache (not shared), lost on restart

### 6. Mocked Solana Integration
**Why**: Allows development without blockchain complexity  
**Trade-off**: Need to implement real blockchain later

---

## 📚 Additional Resources

- **Architecture Diagram**: This file
- **API Documentation**: `/BACKEND_INTEGRATION_GUIDE.md`
- **Setup Guide**: `/supabase/SETUP_INSTRUCTIONS.md`
- **Quick Reference**: `/API_QUICK_REFERENCE.md`
- **Integration Checklist**: `/INTEGRATION_CHECKLIST.md`

---

**Last Updated**: 2025-01-30  
**Status**: Architecture Complete ✅
