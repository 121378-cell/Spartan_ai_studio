/**
 * Bluetooth Wearable Types
 */

export interface BluetoothDevice {
  id: string;
  name: string;
  connected: boolean;
  gattServer?: BluetoothRemoteGATTServer;
}

export interface HeartRateData {
  heartRate: number;
  timestamp: number;
  contactDetected?: boolean;
  energyExpended?: number;
  rrIntervals?: number[];
}

export type WearableStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface WearableState {
  status: WearableStatus;
  device: BluetoothDevice | null;
  lastHeartRate: HeartRateData | null;
  error?: string;
}
