import { Connection, Keypair, PublicKey, clusterApiUrl, Transaction } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, createTransferInstruction, AccountLayout } from "@solana/spl-token"; 
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { createNft, mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { keypairIdentity, generateSigner, percentAmount } from '@metaplex-foundation/umi';
import bs58 from "bs58";

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const SERVER_SECRET_KEY_BASE58 = process.env.SERVER_SECRET_KEY_BASE58!;

const connection = new Connection(SOLANA_RPC_URL, "confirmed");
const serverKeypair = Keypair.fromSecretKey(bs58.decode(SERVER_SECRET_KEY_BASE58));
console.log("🔑 Server Wallet Address being used by API:", serverKeypair.publicKey.toBase58());

const umi = createUmi(SOLANA_RPC_URL).use(mplTokenMetadata());
const serverUmiSigner = umi.eddsa.createKeypairFromSecretKey(serverKeypair.secretKey);
umi.use(keypairIdentity(serverUmiSigner));


/**
 * Cria (minta) uma nova NFT para servir como a identidade digital soberana de um dispositivo.
 * A carteira do servidor será a dona inicial da NFT.
 * @returns {Promise<{nftAddress: string, txSignature: string}>} Um objeto contendo o endereço da nova NFT e a assinatura da transação de criação.
 */
export async function createAndMintNft() {
  const mint = generateSigner(umi);
  console.log("Mintando uma nova NFT para o dispositivo...");
  const result = await createNft(umi, {
    mint,
    name: "DePIN Device Identity",
    symbol: "DEPINID",
    uri: "https://shdw-drive.genesysgo.net/6t1m2L3N9s4z5x6A7B8C9d0E/metadata.json",
    sellerFeeBasisPoints: percentAmount(0),
  }).sendAndConfirm(umi);

  const nftAddress = mint.publicKey.toString();
  const txSignature = bs58.encode(result.signature);
  
  console.log(`NFT mintada com sucesso! Endereço: ${nftAddress}, Tx: ${txSignature}`);
  return { nftAddress, txSignature };
}


/**
 * Transfere a propriedade de uma NFT da carteira do servidor para a carteira de um novo dono (usuário final).
 * @param {string} nftMintAddress - O endereço da NFT (mint address) a ser transferida.
 * @param {string} newOwnerAddress - O endereço da carteira Solana do novo dono.
 * @returns {Promise<string>} A assinatura da transação de transferência.
 */
export async function transferNft(nftMintAddress: string, newOwnerAddress: string) {
  const mintPublicKey = new PublicKey(nftMintAddress);
  const newOwnerPublicKey = new PublicKey(newOwnerAddress);

  console.log(`Iniciando transferência da NFT ${nftMintAddress} para ${newOwnerAddress}`);

  const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    serverKeypair,
    mintPublicKey,
    serverKeypair.publicKey
  );

  const toTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    serverKeypair,
    mintPublicKey,
    newOwnerPublicKey
  );

  const transaction = new Transaction().add(
    createTransferInstruction(
      fromTokenAccount.address,
      toTokenAccount.address,
      serverKeypair.publicKey,
      1 
    )
  );

  const signature = await connection.sendTransaction(transaction, [serverKeypair]);

  await connection.confirmTransaction(signature, 'confirmed');

  console.log(`Transferência CONFIRMADA com sucesso! Assinatura: ${signature}`);
  return signature;
}


/**
 * Consulta a blockchain Solana para encontrar o endereço da carteira do dono atual de uma NFT.
 * Esta função é a "fonte da verdade" para a propriedade de um dispositivo.
 * @param {string} nftMintAddress - O endereço da NFT (mint address) a ser verificado.
 * @returns {Promise<string | null>} O endereço do dono atual como uma string, ou nulo se não for encontrado.
 */
export async function getNftOwner(nftMintAddress: string): Promise<string | null> {
  try {
    const mintPublicKey = new PublicKey(nftMintAddress);
    
    const largestAccounts = await connection.getTokenLargestAccounts(mintPublicKey);
    const tokenAccountAddress = largestAccounts.value[0]?.address;

    if (!tokenAccountAddress) {
      console.error(`Nenhuma conta de token encontrada para a NFT: ${nftMintAddress}`);
      return null;
    }

    const accountInfo = await connection.getAccountInfo(tokenAccountAddress);
    if (!accountInfo) {
      return null;
    }

    const decodedAccountInfo = AccountLayout.decode(accountInfo.data);
    const ownerAddress = new PublicKey(decodedAccountInfo.owner).toBase58();

    return ownerAddress;

  } catch (error) {
    console.error("Falha ao obter o dono da NFT da blockchain:", error);
    return null;
  }
}