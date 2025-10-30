import { supabase } from './supabaseClient';

/**
 * Define a estrutura de dados para um dispositivo no banco de dados Supabase.
 * Esta interface serve como o "cache" de informações do dispositivo.
 */
export interface DeviceEntry {
  macAddress: string;
  publicKey: string;
  nftAddress: string | null;
  txSignature: string | null;
  lastTsSeen: number | null;
  revoked?: boolean;
  challenge?: string;
  ownerAddress?: string | null;
  claimToken?: string | null;

  // --- Novos campos para Dispositivos Mock ---
  is_mock?: boolean;
  mock_sensor_type?: string | null;
  mock_private_key?: string | null; // Apenas para uso do backend!
}

/**
 * Busca um dispositivo pela sua chave pública (Primary Key).
 * @param publicKey A chave pública do dispositivo.
 * @returns O dispositivo ou null se não for encontrado.
 */
export async function getDeviceByPubKey(publicKey: string): Promise<DeviceEntry | null> {
  const { data, error } = await supabase
    .from('devices')
    .select('*')
    .eq('publicKey', publicKey)
    .single(); 

  if (error && error.code !== 'PGRST116') {
    console.error("Erro ao buscar dispositivo por publicKey:", error);
    throw error;
  }

  return data;
}

/**
 * Busca um dispositivo pelo endereço do seu NFT.
 * @param nftAddress O endereço do NFT associado ao dispositivo.
 * @returns O dispositivo ou null se não for encontrado.
 */
export async function getDeviceByNft(nftAddress: string): Promise<DeviceEntry | null> {
  const { data, error } = await supabase
    .from('devices')
    .select('*')
    .eq('nftAddress', nftAddress)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error("Erro ao buscar dispositivo por NFT:", error);
    throw error;
  }

  return data;
}

/**
 * [NOVA FUNÇÃO] Busca um dispositivo mock pelo NFT e pelo Dono.
 * Usado para verificar se o usuário pode submeter dados para o mock.
 * @param nftAddress O endereço do NFT.
 * @param ownerAddress O endereço da carteira do dono.
 * @returns O dispositivo (incluindo a private key) ou null.
 */
export async function getDeviceByNftAndOwner(nftAddress: string, ownerAddress: string): Promise<DeviceEntry | null> {
  const { data, error } = await supabase
    .from('devices')
    .select('*')
    .eq('nftAddress', nftAddress)
    .eq('ownerAddress', ownerAddress)
    .eq('is_mock', true) // Garante que é um mock
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error("Erro ao buscar dispositivo mock por dono e NFT:", error);
    throw error;
  }

  return data;
}

/**
 * [NOVA FUNÇÃO] Busca todos os dispositivos mock de um usuário.
 * Útil para o frontend listar os mocks que o usuário pode controlar.
 * NÃO retorna a chave privada por segurança.
 * @param ownerAddress O endereço da carteira do dono.
 * @returns Um array de dispositivos mock (parcial).
 */
export async function getMockDevicesByOwner(ownerAddress: string): Promise<Partial<DeviceEntry>[] | null> {
  const { data, error } = await supabase
    .from('devices')
    .select('publicKey, nftAddress, macAddress, mock_sensor_type') // Campos seguros para o frontend
    .eq('ownerAddress', ownerAddress)
    .eq('is_mock', true);

  if (error) {
    console.error("Erro ao buscar mocks por dono:", error);
    throw error;
  }

  return data;
}


/**
 * Adiciona um novo dispositivo ou atualiza um existente.
 * Usa o método `upsert` do Supabase para eficiência.
 * @param publicKey A chave pública do dispositivo a ser atualizado/inserido.
 * @param deviceData Os dados parciais para atualizar (incluindo campos mock).
 * @returns O dispositivo criado ou atualizado.
 */
export async function addOrUpdateDevice(publicKey: string, deviceData: Partial<DeviceEntry>): Promise<DeviceEntry> {
  const deviceToUpsert = {
    publicKey, 
    ...deviceData,
  };

  // Log para depuração ao criar mocks
  if ((deviceData as any).is_mock) {
    console.log("Upserting mock device:", deviceToUpsert);
  }

  const { data, error } = await supabase
    .from('devices')
    .upsert(deviceToUpsert)
    .select()
    .single(); 

  if (error || !data) {
    console.error("Erro ao adicionar ou atualizar dispositivo:", error);
    throw error || new Error("Não foi possível obter os dados do dispositivo após a operação.");
  }

  return data;
}

/**
 * Marca um dispositivo como revogado buscando-o pelo endereço do NFT.
 * @param nftAddress O endereço do NFT do dispositivo a ser revogado.
 */
export async function revokeDevice(nftAddress: string): Promise<void> {
  const { error, count } = await supabase
    .from('devices')
    .update({ revoked: true })
    .eq('nftAddress', nftAddress);

  if (error) {
    console.error("Erro ao revogar dispositivo:", error);
    throw error;
  }

  if (count === 0) {
    throw new Error("Dispositivo não encontrado para revogar.");
  }
}


/**
 * Busca um dispositivo no banco de dados usando o token de reivindicação.
 * @param {string} claimToken - O token de reivindicação do dispositivo.
 * @returns {Promise<DeviceEntry | null>} O registro do dispositivo ou nulo se não for encontrado.
 */
export async function getDeviceByClaimToken(claimToken: string): Promise<DeviceEntry | null> {
  const { data, error } = await supabase
    .from('devices')
    .select('*')
    .eq('claimToken', claimToken)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error("Error fetching device by claim token:", error);
    throw error;
  }
  return data;
}
