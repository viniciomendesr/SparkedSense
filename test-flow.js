import fetch from "node-fetch";
import elliptic from "elliptic";
import { sha256 } from "js-sha256";

const ec = new elliptic.ec("secp256k1");

// --- Configurações ---
const REGISTER_URL = "http://localhost:3000/api/register-device";
const SENSOR_DATA_URL = "http://localhost:3000/api/sensor-data";
const macAddress = "AA:BB:CC:DD:EE:FF";

// --- Private key do dispositivo (hex) ---
const privateKeyHex = "3s1nX1TndKDHAPv4p4rxtBwCAVtG71AJjNkCo6mg38cuGtjNDPALJLgSeKaoNEFpY69fUKjvJb1HPnYRSx8PAZ1t";
const keyPair = ec.keyFromPrivate(privateKeyHex, "hex");

// --- Public key para backend (prefixo 04 + X+Y) ---
const pubKeyXY = keyPair.getPublic(false, "hex");
const publicKeyToBackend = "04" + pubKeyXY;

async function main() {
  try {
    // ===============================
    // 1️⃣ Solicitar challenge
    // ===============================
    const challengeResp = await fetch(REGISTER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ macAddress, publicKey: publicKeyToBackend })
    });
    const challengeData = await challengeResp.json();

    if (!challengeData.challenge) {
      console.error("❌ Falha ao obter challenge:", challengeData);
      return;
    }

    const challengeHex = challengeData.challenge;
    console.log("✅ Challenge recebido:", challengeHex);

    // ===============================
    // 2️⃣ Assinar challenge
    // ===============================
    const hashHex = sha256(Buffer.from(challengeHex, "hex"));
    const sigObj = keyPair.sign(hashHex);

    const rHex = sigObj.r.toString(16).padStart(64, "0");
    const sHex = sigObj.s.toString(16).padStart(64, "0");
    const signatureHex = rHex + sHex;

    // ===============================
    // 3️⃣ Verificação local (opcional)
    // ===============================
    const pub = ec.keyFromPublic(pubKeyXY, "hex");
    const verified = pub.verify(hashHex, { r: sigObj.r, s: sigObj.s });
    console.log("🔎 Verificação local da assinatura:", verified ? "✅ Válida" : "❌ Inválida");

    if (!verified) {
      console.error("Assinatura inválida. Não enviando ao backend.");
      return;
    }

    // ===============================
    // 4️⃣ Enviar assinatura ao backend
    // ===============================
    const regResp = await fetch(REGISTER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        macAddress,
        publicKey: publicKeyToBackend,
        challenge: challengeHex,
        signature: signatureHex
      })
    });

    const regData = await regResp.json();
    if (!regData.nftAddress) {
      console.error("❌ Falha ao registrar dispositivo:", regData);
      return;
    }

    console.log("🎉 Dispositivo registrado com sucesso! NFT:", regData.nftAddress);

    // ===============================
    // 5️⃣ Enviar dado de sensor
    // ===============================
    const sensorPayload = {
      ts: Math.floor(Date.now() / 1000),
      velocidade: 50,
      volume: 100
    };

    const payloadString = JSON.stringify(sensorPayload);
    const hashPayload = sha256(payloadString);
    const sigPayload = keyPair.sign(hashPayload);

    const rHexPayload = sigPayload.r.toString(16).padStart(64, "0");
    const sHexPayload = sigPayload.s.toString(16).padStart(64, "0");
    const signaturePayloadHex = rHexPayload + sHexPayload;

    const dataResp = await fetch(SENSOR_DATA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nftAddress: regData.nftAddress,
        payloadString,
        signature: signaturePayloadHex
      })
    });

    const dataResult = await dataResp.json();
    console.log("📡 Resposta do envio de dados:", dataResult);

  } catch (err) {
    console.error("Erro no fluxo completo:", err);
  }
}

// Executa o fluxo completo
main();
