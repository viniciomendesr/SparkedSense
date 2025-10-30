# 🔧 Troubleshooting - Registro de Dispositivo ESP

## ❌ Problema: Challenge resolvido mas NFT/Claim Token não retornados

### Possíveis Causas:

#### 1. **Dispositivo já registrado anteriormente**
Se o dispositivo já foi registrado antes, a API não cria um novo NFT.

**Solução:**
- Verifique se o dispositivo já existe no banco de dados
- Use a API `/api/get-claim-token` para recuperar o token existente

```bash
curl -X POST https://sparked-three.vercel.app/api/get-claim-token \
  -H "Content-Type: application/json" \
  -d '{
    "publicKey": "SUA_PUBLIC_KEY_AQUI"
  }'
```

#### 2. **Erro na criação do NFT na Solana**
A criação do NFT pode falhar por problemas de rede ou saldo insuficiente.

**Verificar logs do servidor:**
- Acesse os logs do Vercel
- Procure por erros relacionados a `createAndMintNft`
- Verifique se há erros de conexão com a Solana

#### 3. **Resposta JSON malformada**
O ESP pode não estar parseando corretamente a resposta.

**Debug no ESP:**
O código atualizado agora inclui debug detalhado:
```cpp
Serial.println("📋 Registration Response:");
serializeJsonPretty(respDoc, Serial);
```

#### 4. **Timeout ou conexão interrompida**
A criação do NFT pode demorar e causar timeout.

**Solução:**
- Aumentar o timeout do HTTPClient no ESP
- Verificar estabilidade da conexão WiFi

---

## 🔍 Passos de Debug

### 1. Verificar se o dispositivo já existe

```bash
# Substitua pela sua public key
curl -X POST https://sparked-three.vercel.app/api/get-claim-token \
  -H "Content-Type: application/json" \
  -d '{
    "publicKey": "04a1b2c3d4..."
  }'
```

**Resposta se já existe:**
```json
{
  "nftAddress": "SolanaAddress...",
  "claimToken": "abc123def456"
}
```

**Resposta se não existe:**
```json
{
  "error": "Device not found for the given publicKey"
}
```

### 2. Verificar logs do Serial Monitor

Com o código atualizado, você verá:

```
📡 Step 1: Requesting challenge from server...
✅ Challenge received
📡 Step 2: Signing challenge and registering device...
📋 Registration Response:
{
  "nftAddress": "...",
  "claimToken": "...",
  "txSignature": "..."
}
🔍 Checking response fields:
  nftAddress: SolanaAddress...
  claimToken: abc123def456
  txSignature: TxSig...
```

### 3. Verificar estrutura da resposta da API

A API `/api/register-device` deve retornar:

```json
{
  "nftAddress": "string",
  "txSignature": "string",
  "claimToken": "string"  // Apenas na primeira vez
}
```

**Importante:** O `claimToken` só é retornado se o NFT foi criado agora. Se o dispositivo já existia, o campo pode estar ausente.

---

## 🛠️ Soluções

### Solução 1: Limpar EEPROM e re-registrar

Se você quer forçar um novo registro, limpe a EEPROM:

```cpp
void clearEEPROM() {
  for (int i = 0; i < EEPROM_SIZE; i++) {
    EEPROM.write(i, 0);
  }
  EEPROM.commit();
  Serial.println("EEPROM cleared!");
}
```

Adicione no `setup()` antes de tudo:
```cpp
// clearEEPROM(); // Descomente para limpar
```

### Solução 2: Recuperar claim token existente

Adicione esta função ao ESP.ino:

```cpp
bool retrieveExistingClaimToken() {
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;
  
  uECC_compute_public_key(privateKey, publicKey, uECC_secp256k1());
  uint8_t formattedPublicKey[65];
  formattedPublicKey[0] = 0x04;
  memcpy(&formattedPublicKey[1], publicKey, 64);
  String pubHex = bytesToHexString(formattedPublicKey, sizeof(formattedPublicKey));
  
  Serial.println("🔄 Attempting to retrieve existing claim token...");
  
  DynamicJsonDocument doc(256);
  doc["publicKey"] = pubHex;
  String payload;
  serializeJson(doc, payload);
  
  http.begin(client, getClaimTokenEndpoint);
  http.addHeader("Content-Type", "application/json");
  int code = http.POST(payload);
  String resp = http.getString();
  http.end();
  
  if (code != 200) {
    Serial.printf("❌ Failed to retrieve claim token: %d\n", code);
    return false;
  }
  
  DynamicJsonDocument respDoc(512);
  deserializeJson(respDoc, resp);
  
  const char* nftAddress = respDoc["nftAddress"];
  const char* claimToken = respDoc["claimToken"];
  
  if (nftAddress && claimToken) {
    saveDeviceData(String(nftAddress), String(claimToken));
    Serial.println("✅ Retrieved existing registration!");
    Serial.println("🎨 NFT Address: " + String(nftAddress));
    Serial.println("🔑 Claim Token: " + String(claimToken));
    return true;
  }
  
  return false;
}
```

Use no `setup()`:
```cpp
if (!loadDeviceData()) {
  Serial.println("No device registration found...");
  
  // Tenta recuperar registro existente primeiro
  if (!retrieveExistingClaimToken()) {
    // Se não existe, registra novo
    Serial.println("Registering new device...");
    while (!registerDevice()) {
      Serial.println("❌ Registration failed, retrying in 10s...");
      delay(10000);
    }
  }
}
```

### Solução 3: Aumentar timeout HTTP

No ESP.ino, adicione após `http.begin()`:

```cpp
http.begin(client, registerDeviceEndpoint);
http.setTimeout(30000); // 30 segundos
http.addHeader("Content-Type", "application/json");
```

### Solução 4: Verificar resposta da API manualmente

Use curl para testar manualmente:

```bash
# Passo 1: Obter challenge
RESPONSE=$(curl -X POST https://sparked-three.vercel.app/api/register-device \
  -H "Content-Type: application/json" \
  -d '{
    "macAddress": "AA:BB:CC:DD:EE:FF",
    "publicKey": "SUA_PUBLIC_KEY"
  }')

echo $RESPONSE

# Extrair challenge
CHALLENGE=$(echo $RESPONSE | jq -r '.challenge')
echo "Challenge: $CHALLENGE"

# Passo 2: Assinar e enviar (você precisa gerar a assinatura)
curl -X POST https://sparked-three.vercel.app/api/register-device \
  -H "Content-Type: application/json" \
  -d '{
    "macAddress": "AA:BB:CC:DD:EE:FF",
    "publicKey": "SUA_PUBLIC_KEY",
    "challenge": "'$CHALLENGE'",
    "signature": {
      "r": "SIGNATURE_R",
      "s": "SIGNATURE_S"
    }
  }'
```

---

## 📊 Checklist de Verificação

- [ ] WiFi conectado e estável
- [ ] NTP sincronizado
- [ ] Chave privada gerada/carregada
- [ ] Challenge recebido com sucesso (código 200)
- [ ] Assinatura gerada sem erros
- [ ] Resposta do registro recebida (código 200)
- [ ] JSON da resposta parseado sem erros
- [ ] Campos `nftAddress` e `claimToken` presentes na resposta
- [ ] Dados salvos no EEPROM com sucesso

---

## 🔗 Recursos Adicionais

- **Logs do Vercel:** https://vercel.com/dashboard
- **Explorer Solana Devnet:** https://explorer.solana.com/?cluster=devnet
- **Documentação API:** Ver `API_TESTING_GUIDE.md`

---

## 💡 Dicas

1. **Sempre verifique os logs do Serial Monitor** - O debug detalhado mostrará exatamente o que está acontecendo
2. **Use Postman/curl para testar as APIs** - Isso ajuda a isolar se o problema é no ESP ou na API
3. **Verifique o saldo da carteira Solana** - A criação de NFTs requer SOL
4. **Monitore os logs do Vercel** - Erros do lado do servidor aparecem lá
5. **Teste em etapas** - Primeiro teste o challenge, depois a assinatura, depois o registro completo
