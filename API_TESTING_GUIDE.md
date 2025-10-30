# 🧪 Guia Completo de Testes de API

## 📋 Índice
1. [Registro de Dispositivo](#1-registro-de-dispositivo)
2. [Recuperar Claim Token](#2-recuperar-claim-token)
3. [Reivindicar Dispositivo](#3-reivindicar-dispositivo)
4. [Enviar Dados do Sensor (Vercel)](#4-enviar-dados-do-sensor-vercel)
5. [Enviar Leituras (Supabase)](#5-enviar-leituras-supabase)
6. [Revogar Dispositivo](#6-revogar-dispositivo)

---

## 1. Registro de Dispositivo

**Endpoint:** `POST https://sparked-three.vercel.app/api/register-device`

### Passo 1: Solicitar Challenge

```bash
curl -X POST https://sparked-three.vercel.app/api/register-device \
  -H "Content-Type: application/json" \
  -d '{
    "macAddress": "AA:BB:CC:DD:EE:FF",
    "publicKey": "04a1b2c3d4e5f6..."
  }'
```

**Resposta esperada:**
```json
{
  "challenge": "a1b2c3d4e5f6789..."
}
```

### Passo 2: Enviar Assinatura do Challenge

```bash
curl -X POST https://sparked-three.vercel.app/api/register-device \
  -H "Content-Type: application/json" \
  -d '{
    "macAddress": "AA:BB:CC:DD:EE:FF",
    "publicKey": "04a1b2c3d4e5f6...",
    "challenge": "a1b2c3d4e5f6789...",
    "signature": {
      "r": "1234567890abcdef...",
      "s": "fedcba0987654321..."
    }
  }'
```

**Resposta esperada:**
```json
{
  "nftAddress": "SolanaAddressHere123...",
  "txSignature": "TransactionSignatureHere...",
  "claimToken": "abc123def456"
}
```

---

## 2. Recuperar Claim Token

**Endpoint:** `POST https://sparked-three.vercel.app/api/get-claim-token`

```bash
curl -X POST https://sparked-three.vercel.app/api/get-claim-token \
  -H "Content-Type: application/json" \
  -d '{
    "publicKey": "04a1b2c3d4e5f6..."
  }'
```

**Resposta esperada:**
```json
{
  "nftAddress": "SolanaAddressHere123...",
  "claimToken": "abc123def456"
}
```

---

## 3. Reivindicar Dispositivo

**Endpoint:** `POST https://sparked-three.vercel.app/api/claim-device`

```bash
curl -X POST https://sparked-three.vercel.app/api/claim-device \
  -H "Content-Type: application/json" \
  -d '{
    "claimToken": "abc123def456",
    "ownerWalletAddress": "YourSolanaWalletAddress..."
  }'
```

**Resposta esperada:**
```json
{
  "success": true,
  "transactionSignature": "TransactionSignatureHere..."
}
```

---

## 4. Enviar Dados do Sensor (Vercel)

**Endpoint:** `POST https://sparked-three.vercel.app/api/sensor-data`

```bash
curl -X POST https://sparked-three.vercel.app/api/sensor-data \
  -H "Content-Type: application/json" \
  -d '{
    "nftAddress": "SolanaAddressHere123...",
    "payload": {
      "temperature": 23.5,
      "humidity": 65,
      "timestamp": 1730268000
    },
    "signature": {
      "r": "1234567890abcdef...",
      "s": "fedcba0987654321..."
    }
  }'
```

**Resposta esperada:**
```json
{
  "success": true,
  "message": "Dados recebidos e validados com sucesso."
}
```

---

## 5. Enviar Leituras (Supabase)

**Endpoint:** `POST https://djzexivvddzzduetmkel.supabase.co/functions/v1/make-server-4a89e1c9/readings`

```bash
curl -X POST https://djzexivvddzzduetmkel.supabase.co/functions/v1/make-server-4a89e1c9/readings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqemV4aXZ2ZGR6emR1ZXRta2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3ODYzMzAsImV4cCI6MjA3NzM2MjMzMH0.hW1SyZKQRzI-ghokMb-F5uccV52vxixE0aH78lNZ1F4" \
  -d '{
    "sensorId": "sensor-123",
    "value": 23.5,
    "unit": "°C",
    "variable": "temperature",
    "timestamp": "2025-10-30T01:00:00.000Z",
    "hash": "a1b2c3d4e5f6..."
  }'
```

**Resposta esperada:**
```json
{
  "reading": {
    "id": "reading-id-123",
    "sensorId": "sensor-123",
    "value": 23.5,
    "unit": "°C",
    "variable": "temperature",
    "timestamp": "2025-10-30T01:00:00.000Z",
    "hash": "a1b2c3d4e5f6..."
  }
}
```

---

## 6. Revogar Dispositivo

**Endpoint:** `POST https://sparked-three.vercel.app/api/revoke-device`

```bash
curl -X POST https://sparked-three.vercel.app/api/revoke-device \
  -H "Content-Type: application/json" \
  -d '{
    "nftAddress": "SolanaAddressHere123...",
    "ownerWalletAddress": "YourSolanaWalletAddress..."
  }'
```

**Resposta esperada:**
```json
{
  "success": true,
  "message": "Device revoked successfully"
}
```

---

## 📝 Exemplo Completo de Fluxo no Postman

### Collection: Sparked Sense API

#### 1. Register Device - Step 1 (Get Challenge)
- **Method:** POST
- **URL:** `https://sparked-three.vercel.app/api/register-device`
- **Body (JSON):**
```json
{
  "macAddress": "{{MAC_ADDRESS}}",
  "publicKey": "{{PUBLIC_KEY}}"
}
```
- **Tests (Save Challenge):**
```javascript
pm.environment.set("challenge", pm.response.json().challenge);
```

#### 2. Register Device - Step 2 (Submit Signature)
- **Method:** POST
- **URL:** `https://sparked-three.vercel.app/api/register-device`
- **Body (JSON):**
```json
{
  "macAddress": "{{MAC_ADDRESS}}",
  "publicKey": "{{PUBLIC_KEY}}",
  "challenge": "{{challenge}}",
  "signature": {
    "r": "{{SIGNATURE_R}}",
    "s": "{{SIGNATURE_S}}"
  }
}
```
- **Tests (Save NFT and Token):**
```javascript
pm.environment.set("nftAddress", pm.response.json().nftAddress);
pm.environment.set("claimToken", pm.response.json().claimToken);
```

#### 3. Claim Device
- **Method:** POST
- **URL:** `https://sparked-three.vercel.app/api/claim-device`
- **Body (JSON):**
```json
{
  "claimToken": "{{claimToken}}",
  "ownerWalletAddress": "{{WALLET_ADDRESS}}"
}
```

#### 4. Send Sensor Data
- **Method:** POST
- **URL:** `https://sparked-three.vercel.app/api/sensor-data`
- **Body (JSON):**
```json
{
  "nftAddress": "{{nftAddress}}",
  "payload": {
    "temperature": 23.5,
    "humidity": 65,
    "timestamp": {{$timestamp}}
  },
  "signature": {
    "r": "{{SIGNATURE_R}}",
    "s": "{{SIGNATURE_S}}"
  }
}
```

---

## 🔧 Variáveis de Ambiente do Postman

```
MAC_ADDRESS = AA:BB:CC:DD:EE:FF
PUBLIC_KEY = 04a1b2c3d4e5f6...
WALLET_ADDRESS = YourSolanaWalletAddress...
SIGNATURE_R = (gerado dinamicamente)
SIGNATURE_S = (gerado dinamicamente)
challenge = (salvo automaticamente)
nftAddress = (salvo automaticamente)
claimToken = (salvo automaticamente)
```

---

## 🐛 Códigos de Erro Comuns

| Código | Significado | Solução |
|--------|-------------|---------|
| 400 | Bad Request | Verifique se todos os campos obrigatórios estão presentes |
| 401 | Unauthorized | Assinatura inválida ou token expirado |
| 403 | Forbidden | Dispositivo foi revogado |
| 404 | Not Found | Dispositivo não encontrado |
| 409 | Conflict | Dispositivo já foi reivindicado |
| 429 | Too Many Requests | Aguarde antes de enviar novos dados (rate limit) |
| 500 | Internal Server Error | Erro no servidor, verifique logs |

---

## 📊 Formato de Dados do Sensor

### Payload Mínimo
```json
{
  "timestamp": 1730268000,
  "value": 23.5
}
```

### Payload Completo
```json
{
  "sensorId": "sensor-123",
  "timestamp": 1730268000,
  "variable": "temperature",
  "value": 23.5,
  "unit": "°C",
  "location": {
    "lat": -23.5505,
    "lon": -46.6333
  },
  "metadata": {
    "battery": 85,
    "signal": -65
  }
}
```

---

## 🔐 Notas de Segurança

1. **Nunca compartilhe sua chave privada**
2. **O claim token é de uso único** - após reivindicar, ele é invalidado
3. **Rate limit:** 1 envio de dados a cada 60 segundos por dispositivo
4. **Timestamp:** Dados com mais de 5 minutos são rejeitados
5. **Assinatura:** Todos os dados devem ser assinados com a chave privada do dispositivo
