import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

// Gera um novo par de chaves
const keypair = Keypair.generate();

// Codifica a secret key em base58 (para armazenar com segurança)
const secretKeyBase58 = bs58.encode(keypair.secretKey);

// Converte a public key em hexadecimal (prefixada com 04 opcionalmente)
const publicKeyHex = "04" + Buffer.from(keypair.publicKey.toBytes()).toString("hex");

console.log("✅ Chaves geradas com sucesso!");
console.log(`🔑 Secret key (base58): ${secretKeyBase58}`);
console.log(`📡 Public key (hex): ${publicKeyHex}`);