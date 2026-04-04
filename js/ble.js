const BLE = {
  device: null,
  server: null,
  services: [],
  characteristics: new Map(),

  async connect() {
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: 'BC' }],
      optionalServices: [] // Will add discovered services
    });
    this.device = device;
    device.addEventListener('gattserverdisconnected', () => this.onDisconnect());
    this.server = await device.gatt.connect();
    await this.discoverServices();
    return device;
  },

  async discoverServices() {
    const services = await this.server.getPrimaryServices();
    this.services = services;
    for (const service of services) {
      const chars = await service.getCharacteristics();
      for (const char of chars) {
        this.characteristics.set(char.uuid, char);
      }
    }
  },

  async write(charUuid, data) {
    const char = this.characteristics.get(charUuid);
    if (!char) throw new Error(`Characteristic ${charUuid} not found`);
    await char.writeValueWithResponse(new Uint8Array(data));
  },

  async read(charUuid) {
    const char = this.characteristics.get(charUuid);
    if (!char) throw new Error(`Characteristic ${charUuid} not found`);
    return await char.readValue();
  },

  onDisconnect() {
    document.getElementById('ble-status').textContent = 'Disconnected';
    document.getElementById('ble-status').className = 'status disconnected';
  },

  isConnected() {
    return this.device?.gatt?.connected ?? false;
  }
};
