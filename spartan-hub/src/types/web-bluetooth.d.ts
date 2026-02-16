interface BluetoothDevice extends EventTarget {
  id: string;
  name?: string;
  gatt?: BluetoothRemoteGATTServer;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
}

interface BluetoothRemoteGATTServer {
  device: BluetoothDevice;
  connected: boolean;
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(service: string | number): Promise<BluetoothRemoteGATTService>;
}

interface BluetoothRemoteGATTService extends EventTarget {
  device: BluetoothDevice;
  uuid: string;
  isPrimary: boolean;
  getCharacteristic(characteristic: string | number): Promise<BluetoothRemoteGATTCharacteristic>;
}

interface BluetoothRemoteGATTCharacteristic extends EventTarget {
  service: BluetoothRemoteGATTService;
  uuid: string;
  value?: DataView;
  startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
  stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
  readValue(): Promise<DataView>;
  writeValue(value: BufferSource): Promise<void>;
}

interface BluetoothLEScan {
  filters: BluetoothLEScanFilter[];
  keepRepeatedDevices?: boolean;
  acceptAllAdvertisements?: boolean;
}

interface BluetoothLEScanFilter {
  services?: (string | number)[];
  name?: string;
  namePrefix?: string;
}

interface Navigator {
  bluetooth: {
    requestDevice(options?: {
      filters?: BluetoothLEScanFilter[];
      optionalServices?: (string | number)[];
      acceptAllDevices?: boolean;
    }): Promise<BluetoothDevice>;
  };
}
