import { supabaseAdmin } from './supabaseClient.ts';
import * as kv from '../kv_store.tsx';

export interface Device {
  id: string;
  name: string;
  type: string;
  visibility: 'public' | 'private' | 'partial';
  mode: 'mock' | 'real';
  mac_address?: string;
  public_key?: string;
  claim_token?: string;
  owner_wallet?: string;
  owner_user_id?: string;
  status: 'active' | 'inactive' | 'reconnecting';
  created_at: string;
  updated_at: string;
}

export class DeviceRegistry {
  /**
   * Register a new device in the system
   */
  static async registerDevice(deviceData: Partial<Device>): Promise<Device> {
    const deviceId = crypto.randomUUID();
    const now = new Date().toISOString();

    const device: Device = {
      id: deviceId,
      name: deviceData.name || 'Unnamed Device',
      type: deviceData.type || 'temperature',
      visibility: deviceData.visibility || 'private',
      mode: deviceData.mode || 'real',
      mac_address: deviceData.mac_address,
      public_key: deviceData.public_key,
      claim_token: deviceData.claim_token,
      owner_wallet: deviceData.owner_wallet,
      owner_user_id: deviceData.owner_user_id,
      status: 'inactive',
      created_at: now,
      updated_at: now,
    };

    // Store in KV for quick access
    await kv.set(`device:${deviceId}`, device);

    // Also store in devices table
    const { error } = await supabaseAdmin
      .from('devices')
      .insert({
        id: device.id,
        name: device.name,
        type: device.type,
        visibility: device.visibility,
        mode: device.mode,
        mac_address: device.mac_address,
        public_key: device.public_key,
        claim_token: device.claim_token,
        owner_wallet: device.owner_wallet,
        owner_user_id: device.owner_user_id,
        status: device.status,
        created_at: device.created_at,
        updated_at: device.updated_at,
      });

    if (error) {
      console.error('Failed to insert device into table:', error);
      throw new Error(`Failed to register device: ${error.message}`);
    }

    console.log(`Device registered: ${deviceId}`);
    return device;
  }

  /**
   * Claim a device using a claim token
   */
  static async claimDevice(
    claimToken: string,
    walletAddress: string,
    userId?: string
  ): Promise<Device> {
    // Find device by claim token
    const devices = await kv.getByPrefix('device:');
    const device = devices.find(
      (d: Device) => d.claim_token === claimToken && !d.owner_wallet
    );

    if (!device) {
      throw new Error('Invalid claim token or device already claimed');
    }

    // Update device with owner info
    device.owner_wallet = walletAddress;
    device.owner_user_id = userId;
    device.status = 'active';
    device.updated_at = new Date().toISOString();
    device.claim_token = undefined; // Remove claim token after claiming

    // Update KV store
    await kv.set(`device:${device.id}`, device);

    // Update database
    const { error } = await supabaseAdmin
      .from('devices')
      .update({
        owner_wallet: device.owner_wallet,
        owner_user_id: device.owner_user_id,
        status: device.status,
        updated_at: device.updated_at,
        claim_token: null,
      })
      .eq('id', device.id);

    if (error) {
      console.error('Failed to claim device:', error);
      throw new Error(`Failed to claim device: ${error.message}`);
    }

    console.log(`Device claimed: ${device.id} by ${walletAddress}`);
    return device;
  }

  /**
   * Revoke device ownership
   */
  static async revokeDevice(deviceId: string, walletAddress: string): Promise<void> {
    const device = await kv.get(`device:${deviceId}`);

    if (!device) {
      throw new Error('Device not found');
    }

    if (device.owner_wallet !== walletAddress) {
      throw new Error('Unauthorized: You do not own this device');
    }

    // Generate new claim token
    const newClaimToken = crypto.randomUUID();

    device.owner_wallet = undefined;
    device.owner_user_id = undefined;
    device.claim_token = newClaimToken;
    device.status = 'inactive';
    device.updated_at = new Date().toISOString();

    // Update KV store
    await kv.set(`device:${deviceId}`, device);

    // Update database
    const { error } = await supabaseAdmin
      .from('devices')
      .update({
        owner_wallet: null,
        owner_user_id: null,
        claim_token: newClaimToken,
        status: 'inactive',
        updated_at: device.updated_at,
      })
      .eq('id', deviceId);

    if (error) {
      console.error('Failed to revoke device:', error);
      throw new Error(`Failed to revoke device: ${error.message}`);
    }

    console.log(`Device revoked: ${deviceId}`);
  }

  /**
   * Get device by ID
   */
  static async getDevice(deviceId: string): Promise<Device | null> {
    const device = await kv.get(`device:${deviceId}`);
    return device || null;
  }

  /**
   * Get all devices for a user
   */
  static async getDevicesByOwner(walletAddress: string): Promise<Device[]> {
    const devices = await kv.getByPrefix('device:');
    return devices.filter((d: Device) => d.owner_wallet === walletAddress);
  }

  /**
   * Verify device signature
   */
  static async verifyDeviceSignature(
    deviceId: string,
    data: string,
    signature: string
  ): Promise<boolean> {
    const device = await this.getDevice(deviceId);
    if (!device || !device.public_key) {
      return false;
    }

    // TODO: Implement actual signature verification using device.public_key
    // This would use crypto.subtle.verify with the device's public key
    console.log('Verifying signature for device:', deviceId);
    return true; // Placeholder
  }
}
