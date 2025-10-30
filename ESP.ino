#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <EEPROM.h>
#include <uECC.h>
#include <bearssl/bearssl_hash.h> // SHA-256
#include <NTPClient.h>
#include <WiFiUdp.h>
#include <vector>      
#include <algorithm>

// --- Network Configuration ---
const char* ssid = "BARROSO 420";
const char* password = "Barroso56@#";
const char* registerApiEndpoint = "https://sparked-three.vercel.app/api/register-device";
const char* dataApiEndpoint = "https://sparked-three.vercel.app/api/sensor-data";

// --- EEPROM Configuration ---
#define EEPROM_SIZE 128
#define STATE_KEY_GENERATED 0xAA

// --- Cryptography Globals ---
uint8_t privateKey[32];
uint8_t publicKey[64];
String nftAddressStored = "";
String currentChallenge = "";

// --- NTP (Time) Configuration ---
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org");

// --- RNG for Cryptography ---
int rng_function(uint8_t *dest, unsigned size) {
  for (unsigned i = 0; i < size; ++i) dest[i] = os_random();
  return 1;
}

// --- Utility: Bytes to Hex String ---
String bytesToHexString(const uint8_t* bytes, int len) {
  String str = "";
  for (int i = 0; i < len; i++) {
    char buf[3];
    sprintf(buf, "%02x", bytes[i]);
    str += buf;
  }
  return str;
}

// --- EEPROM Functions for Key and NFT ---
void savePrivateKey() {
  EEPROM.write(0, STATE_KEY_GENERATED);
  for (int i = 0; i < 32; i++) EEPROM.write(i + 1, privateKey[i]);
  EEPROM.commit();
}

bool loadPrivateKey() {
  if (EEPROM.read(0) != STATE_KEY_GENERATED) return false;
  for (int i = 0; i < 32; i++) privateKey[i] = EEPROM.read(i + 1);
  uECC_compute_public_key(privateKey, publicKey, uECC_secp256k1());
  return true;
}

void saveNFT(String nft) {
  for (int i = 0; i < 64; i++) {
    if (i < nft.length()) EEPROM.write(33 + i, nft[i]);
    else EEPROM.write(33 + i, 0);
  }
  EEPROM.commit();
  nftAddressStored = nft;
}

String loadNFT() {
  char buf[65];
  bool hasData = false;
  for (int i = 0; i < 64; i++) {
    buf[i] = EEPROM.read(33 + i);
    if (buf[i] != 0 && buf[i] != 0xFF) hasData = true;
  }
  buf[64] = '\0';
  if (!hasData) return "";
  nftAddressStored = String(buf);
  return nftAddressStored;
}

// --- Device Registration Logic ---
// (This function remains unchanged, it works correctly)
bool registerDevice() {
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;
  uECC_compute_public_key(privateKey, publicKey, uECC_secp256k1());
  uint8_t formattedPublicKey[65];
  formattedPublicKey[0] = 0x04;
  memcpy(&formattedPublicKey[1], publicKey, 64);
  String pubHex = bytesToHexString(formattedPublicKey, sizeof(formattedPublicKey));
  {
    Serial.println("📡 Requesting challenge from server...");
    DynamicJsonDocument doc(256);
    doc["macAddress"] = WiFi.macAddress();
    doc["publicKey"] = pubHex;
    String payload;
    serializeJson(doc, payload);
    http.begin(client, registerApiEndpoint);
    http.addHeader("Content-Type", "application/json");
    int code = http.POST(payload);
    String resp = http.getString();
    http.end();
    if (code != 200) {
      Serial.printf("❌ Failed to get challenge: %d\n⬅ Response: %s\n", code, resp.c_str());
      return false;
    }
    DynamicJsonDocument respDoc(256);
    deserializeJson(respDoc, resp);
    currentChallenge = String(respDoc["challenge"] | "");
    if (currentChallenge == "") {
      Serial.println("❌ Challenge missing in response");
      return false;
    }
  }
  uint8_t hash[32];
  br_sha256_context ctx;
  br_sha256_init(&ctx);
  br_sha256_update(&ctx, currentChallenge.c_str(), currentChallenge.length());
  br_sha256_out(&ctx, hash);
  uint8_t signature[64];
  if (!uECC_sign(privateKey, hash, sizeof(hash), signature, uECC_secp256k1())) {
    Serial.println("❌ Failed to sign challenge");
    return false;
  }
  {
    DynamicJsonDocument doc(512);
    doc["macAddress"] = WiFi.macAddress();
    doc["publicKey"] = pubHex;
    doc["challenge"] = currentChallenge;
    JsonObject sig = doc.createNestedObject("signature");
    sig["r"] = bytesToHexString(signature, 32);
    sig["s"] = bytesToHexString(signature + 32, 32);
    String payload;
    serializeJson(doc, payload);
    http.begin(client, registerApiEndpoint);
    http.addHeader("Content-Type", "application/json");
    int code = http.POST(payload);
    String resp = http.getString();
    http.end();
    if (code != 200) {
      Serial.printf("❌ Registration failed: %d\n%s\n", code, resp.c_str());
      return false;
    }

    DynamicJsonDocument respDoc(512);
    deserializeJson(respDoc, resp);
    if (respDoc["nftAddress"]) {
      String nft = String(respDoc["nftAddress"]);
      saveNFT(nft);
      Serial.println("✅ Device registered! NFT Address: " + nft);

      // Pega o claimToken da resposta
      const char* claimToken = respDoc["claimToken"];
      if (claimToken) {
        Serial.println("======================================================");
        Serial.println("🔑 YOUR TOKEN TO CLAIM THE NFT:");
        Serial.println(claimToken);
        Serial.println("======================================================");
        Serial.println("Copy this token and use it on the website to claim your NFT.");
      }
      return true;
    } else {
      Serial.println("❌ Registration failed, no NFT returned");
      return false;
    }
  }
}

void setup() {
  Serial.begin(115200);
  uECC_set_rng(&rng_function);
  EEPROM.begin(EEPROM_SIZE);

  WiFi.begin(ssid, password);
  Serial.print("Connecting WiFi");
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\nConnected!");

  // --- Initialize NTP Client to get current time ---
  Serial.println("Starting NTP client...");
  timeClient.begin();
  timeClient.update(); // Envia a primeira requisição

  Serial.print("Waiting for NTP time sync");
  while (timeClient.getEpochTime() < 1704067200) { 
    delay(1000);
    Serial.print(".");
    timeClient.update(); 
  }

  Serial.println("\nNTP time synced!");
  Serial.printf("Current Epoch Time: %lu\n", timeClient.getEpochTime());
 Serial.println("Current Formatted Time: " + timeClient.getFormattedTime());

  if (!loadPrivateKey()) {
    Serial.println("Generating new key...");
    if (uECC_make_key(publicKey, privateKey, uECC_secp256k1())) {
      savePrivateKey();
      Serial.println("Key generated and saved");
    } else {
      Serial.println("Key generation failed");
      delay(60000); ESP.restart();
    }
  } else {
    Serial.println("Key loaded from EEPROM");
  }

  uint8_t formattedPublicKey[65];
  formattedPublicKey[0] = 0x04;
  memcpy(&formattedPublicKey[1], publicKey, 64);
  String pubHex = bytesToHexString(formattedPublicKey, sizeof(formattedPublicKey));

  Serial.println("Device Public Key:");
  Serial.println(pubHex);

  

  if (loadNFT() == "") {
    Serial.println("No NFT found, registering device...");
    while (!registerDevice()) {
      Serial.println("❌ Registration failed, retrying in 10s...");
      delay(10000);
    }
  } else {
    Serial.println("Loaded NFT from EEPROM: " + nftAddressStored);
  }

  Serial.println("Setup complete. Ready to receive JSON via Serial.");
}

void loop() {
  timeClient.update();

  if (Serial.available()) {
    String inputJson = Serial.readStringUntil('\n');
    inputJson.trim();
    if (inputJson.length() == 0) return;

    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, inputJson);
    if (error) {
      Serial.println("Error: Invalid JSON received from Serial.");
      return;
    }

    doc["timestamp"] = timeClient.getEpochTime();
    
    JsonObject originalJson = doc.as<JsonObject>();
    JsonDocument sortedDoc; 
    JsonObject sortedJson = sortedDoc.to<JsonObject>();

    std::vector<const char*> keys;
    for (JsonPair kv : originalJson) {
      keys.push_back(kv.key().c_str());
    }

    std::sort(keys.begin(), keys.end(), [](const char* a, const char* b) {
      return strcmp(a, b) < 0;
    });

    for (const char* key : keys) {
      sortedJson[key] = originalJson[key];
    }

    String canonicalPayloadString;
    serializeJson(sortedDoc, canonicalPayloadString);

    uint8_t hash[32];
    br_sha256_context ctx;
    br_sha256_init(&ctx);
    br_sha256_update(&ctx, canonicalPayloadString.c_str(), canonicalPayloadString.length());
    br_sha256_out(&ctx, hash);

    uint8_t signature[64];
    if (!uECC_sign(privateKey, hash, sizeof(hash), signature, uECC_secp256k1())) {
      Serial.println("❌ Failed to sign payload.");
      return;
    }

    JsonDocument apiDoc;
    apiDoc["nftAddress"] = nftAddressStored;
    apiDoc["payload"] = sortedDoc; 
    JsonObject sigObj = apiDoc.createNestedObject("signature");
    sigObj["r"] = bytesToHexString(signature, 32);
    sigObj["s"] = bytesToHexString(signature + 32, 32);

    String finalJson;
    serializeJson(apiDoc, finalJson);
    
    WiFiClientSecure client;
    client.setInsecure();
    HTTPClient http;
    http.begin(client, dataApiEndpoint);
    http.addHeader("Content-Type", "application/json");
    int code = http.POST(finalJson);
    String response = http.getString();
    http.end();

    Serial.printf("📡 Payload sent! HTTP code: %d\n", code);
    if (code != 200) {
      Serial.printf("⬅  Response: %s\n", response.c_str());
    }
  }}
