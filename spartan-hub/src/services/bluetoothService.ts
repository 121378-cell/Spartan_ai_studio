import { HeartRateData } from '../types/wearable';

/**
 * Service to handle Web Bluetooth interactions with heart rate monitors
 */
class BluetoothService {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;

  /**
   * Request a heart rate monitor device from the user
   */
  async requestDevice(): Promise<BluetoothDevice> {
    try {
      if (!navigator.bluetooth) {
        throw new Error('Web Bluetooth is not supported in this browser.');
      }

      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['heart_rate'] }],
        optionalServices: ['battery_service', 'device_information']
      });

      return this.device;
    } catch (error) {
      console.error('Error requesting bluetooth device:', error);
      throw error;
    }
  }

  /**
   * Connect to the selected device and start heart rate notifications
   */
  async connect(
    device: BluetoothDevice,
    onData: (data: HeartRateData) => void,
    onDisconnect: () => void
  ): Promise<void> {
    try {
      if (!device.gatt) {
        throw new Error('Device GATT is not available.');
      }

      this.server = await device.gatt.connect();
      device.addEventListener('gattserverdisconnected', onDisconnect);

      const service = await this.server.getPrimaryService('heart_rate');
      this.characteristic = await service.getCharacteristic('heart_rate_measurement');

      this.characteristic.addEventListener('characteristicvaluechanged', (event: any) => {
        const value = event.target.value;
        const heartRateData = this.parseHeartRate(value);
        onData(heartRateData);
      });

      await this.characteristic.startNotifications();
      console.log('Heart rate notifications started');
    } catch (error) {
      console.error('Error connecting to heart rate monitor:', error);
      throw error;
    }
  }

  /**
   * Disconnect from the current device
   */
  async disconnect(): Promise<void> {
    if (this.server && this.server.connected) {
      this.server.disconnect();
    }
    this.device = null;
    this.server = null;
    this.characteristic = null;
  }

  /**
   * Parse the Heart Rate Measurement characteristic value
   * Specification: https://www.bluetooth.com/specifications/gatt/viewer?attributeXmlFile=org.bluetooth.characteristic.heart_rate_measurement.xml
   */
  private parseHeartRate(value: DataView): HeartRateData {
    const flags = value.getUint8(0);
    const rate16Bits = flags & 0x1;
    let index = 1;
    let heartRate: number;

    if (rate16Bits) {
      heartRate = value.getUint16(index, true);
      index += 2;
    } else {
      heartRate = value.getUint8(index);
      index += 1;
    }

    const contactDetected = !!(flags & 0x2);
    const energyExpendedPresent = !!(flags & 0x8);
    let energyExpended: number | undefined;

    if (energyExpendedPresent) {
      energyExpended = value.getUint16(index, true);
      index += 2;
    }

    const rrIntervalPresent = !!(flags & 0x10);
    const rrIntervals: number[] = [];

    if (rrIntervalPresent) {
      while (index + 1 < value.byteLength) {
        rrIntervals.push(value.getUint16(index, true));
        index += 2;
      }
    }

    return {
      heartRate,
      timestamp: Date.now(),
      contactDetected,
      energyExpended,
      rrIntervals
    };
  }
}

export const bluetoothService = new BluetoothService();
