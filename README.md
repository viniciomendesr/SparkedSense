# 🌍 Sparked Sense

> **An open-source infrastructure connecting Arduino-powered IoT devices, Supabase, and the Solana blockchain — enabling verifiable, auditable, and real-time environmental data.**

---

## 🚀 Overview

**Sparked Sense** bridges **IoT**, **blockchain**, and **open data** to create a decentralized trust layer for physical-world information.

The system allows anyone to connect IoT devices (Arduino or ESP boards), stream environmental readings in real time, anchor datasets on Solana for verification, and share public proofs of authenticity.

🔗 **Live MVP:** [sparkedsensemvp.vercel.app](https://sparkedsensemvp.vercel.app/)  
🐦 **Follow updates:** [@sparkedsense](https://x.com/sparkedsense)

---

## 🧩 Key Features

- **IoT Integration:** Register and link real Arduino-based devices or mock sensors  
- **Real-Time Readings:** Stream environmental variables (temperature, humidity, pH, etc.)  
- **On-Chain Verification:** Anchor datasets to Solana using Merkle proofs  
- **Supabase-Driven Backend:** Edge Functions, real-time Postgres, and RLS security  
- **Public Data Access:** Browse and verify datasets via transparent audit pages  
- **Web3 Identity:** Solana wallet integration for ownership and authentication  
- **Open Source Stack:** Everything — firmware, backend, frontend — is open and reproducible  

---

## 🏗️ System Architecture

```text
┌───────────────────────────────────────────────────────────────┐
│                       SPARKED SENSE SYSTEM                    │
├───────────────────────────────────────────────────────────────┤
│  FRONTEND: Next.js + Tailwind (User Dashboard)                │
│     • Home / Dashboard / Sensors / Datasets / Audit Pages     │
│                                                               │
│  BACKEND: Supabase Edge Functions                             │
│     • Authentication / Sensor Registry / Dataset Proofs       │
│     • Real-time events via PostgreSQL CDC                     │
│                                                               │
│  DATABASE: Supabase PostgreSQL                                │
│     • users / devices / sensor_readings / datasets / logs     │
│                                                               │
│  BLOCKCHAIN: Solana                                           │
│     • Merkle root anchoring & proof validation                │
│                                                               │
│  DEVICES: Arduino / ESP8266 / ESP32                           │
│     • Send signed readings through REST API                   │
└───────────────────────────────────────────────────────────────┘
```

---

## ⚙️ Tech Stack

| Layer | Technology | Purpose |
|-------|-------------|----------|
| **Frontend** | Next.js + TypeScript + TailwindCSS | User interface and dashboard |
| **Backend** | Supabase Edge Functions (Hono) | API logic and validation |
| **Database** | Supabase PostgreSQL | Storage, RLS, and event streaming |
| **Blockchain** | Solana Devnet | Data anchoring and Merkle proofing |
| **IoT Devices** | Arduino / ESP8266 / ESP32 | Real-world data input |
| **Cache** | In-memory Redis-like layer | Optimized performance |
| **Auth** | Supabase Auth + Solana Wallet Adapter | Identity and access control |

---

## 🧠 Core Concepts

### 🛰️ Real vs Mock Sensors
- **Real sensors** transmit signed data directly from physical devices.  
- **Mock sensors** generate synthetic readings for testing and frontend validation.

### 🧾 Datasets
- Datasets aggregate readings and include:
  - Merkle Root hash
  - Solana transaction ID
  - Integrity proof

### 🔍 Public Auditing
- Public audit pages allow users to validate the authenticity of datasets.  
- Hourly Merkle proofs confirm real-time data consistency.

---

## 🧰 Installation Guide

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/your-username/SparkedSense.git
cd SparkedSense
```

### 2️⃣ Install Dependencies
```bash
pnpm install
```

### 3️⃣ Configure Environment Variables
Create a `.env.local` file in the project root:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_PRIVATE_KEY=...
```

### 4️⃣ Initialize Supabase Database
Run the schema migration from:  
[`/supabase/migrations/001_initial_schema.sql`](./supabase/migrations/001_initial_schema.sql)

### 5️⃣ Run Locally
```bash
pnpm dev
```

---

## 🔗 API Overview

Endpoints follow REST structure through Supabase Edge Functions.

📘 Full details: [`BACKEND_INTEGRATION_GUIDE.md`](./BACKEND_INTEGRATION_GUIDE.md)  
⚡ Quick summary: [`API_QUICK_REFERENCE.md`](./API_QUICK_REFERENCE.md)

Example:
```bash
POST /sensors
Authorization: Bearer TOKEN

{
  "name": "Temperature Sensor",
  "type": "temperature",
  "visibility": "public",
  "mode": "real",
  "claimToken": "CLAIM_123",
  "walletPublicKey": "SolanaAddress..."
}
```

---

## 🌐 Public API Routes

| Endpoint | Method | Description |
|-----------|--------|-------------|
| `/public/sensors` | GET | List all public sensors |
| `/public/sensors/:id` | GET | Get detailed sensor data |
| `/public/readings/:id` | GET | Fetch live sensor readings |
| `/public/datasets/:id` | GET | Retrieve dataset information |
| `/public/sensors/:id/hourly-merkle` | GET | Get Merkle proof for last hour |

---

## 🔄 Real-Time Data Flow

1. Device sends signed JSON payload  
2. Backend validates and saves it in `sensor_readings`  
3. Supabase emits real-time change event  
4. Frontend updates dashboard automatically  

Example (frontend subscription):
```typescript
supabase
  .channel('sensor-updates')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'sensor_readings' }, 
    (payload) => console.log('New reading:', payload)
  )
  .subscribe();
```

---

## 🧪 Mock Data & Testing

Generate mock readings manually for tests:
```bash
POST /internal/generate-mock-data
```

Mock sensors refresh automatically every **5 seconds**.

---

## 👥 Advisors & Team

### 🧭 Advisors
- **Prof. Marcos Zancul** — Scientific Advisor, Manufacturing Systems & Product Development (Poli-USP)  
- **Otávio Vacari** — Technical Advisor, Computer Engineer (Poli-USP), M.Sc. in Applied Cryptography and Distributed Systems  

### 💡 Core Team
| Member | Role | Background |
|---------|------|-------------|
| **Vinício Mendes** | Project Creator & Product Lead | Production Engineering student (Poli-USP); Founder of FireTheBox; Researcher in DePIN and Smart Infrastructure |
| **Nicolas Gabriel** | Project Creator & Lead Developer | Full-Stack Developer specialized in Web3, Supabase, and Frontend Integration |
| **Pedro Goularte** | Project Creator & Infrastructure Lead | Systems Engineer experienced in distributed systems and backend architecture |
| **Paulo Ricardo** | Project Creator & Communication Lead | Production Engineer (UFJF), specialized in project management and institutional communication |

---

## 🪪 License

This project is distributed under the **MIT License**.  
Feel free to use, modify, and contribute under the same principles of transparency and openness.

```
MIT License © 2025 Sparked Sense Project
```

---

## 🤝 Contributing

We welcome community contributions!

1. Fork the repository  
2. Create your feature branch (`git checkout -b feature/your-feature`)  
3. Commit your changes (`git commit -m 'Add new feature'`)  
4. Push the branch (`git push origin feature/your-feature`)  
5. Submit a Pull Request 🚀  

---

## 📫 Contact

🌐 **Website:** [sparkedsensemvp.vercel.app](https://sparkedsensemvp.vercel.app/)  
🐦 **Twitter/X:** [@sparkedsense](https://x.com/sparkedsense)  
📧 **Issues & Feedback:** [GitHub Issues](https://github.com/your-username/SparkedSense/issues)

---

> _Sparked Sense is an open-source movement to make environmental data verifiable, decentralized, and universally accessible — building the foundation for transparent DePIN ecosystems._
