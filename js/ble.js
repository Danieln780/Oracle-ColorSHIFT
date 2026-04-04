const BLE = {
  device: null,
  server: null,
  services: [],
  characteristics: new Map(),
  writeChar: null,

  // Oracle-B1E4 confirmed UUIDs (from nRF Connect scan)
  SERVICE_UUID: '0000ffd5-0000-1000-8000-00805f9b34fb',       // Write service
  CHAR_UUID: '0000ffd9-0000-1000-8000-00805f9b34fb',          // Write characteristic
  NOTIFY_SERVICE_UUID: '0000ffd0-0000-1000-8000-00805f9b34fb', // Notify service
  NOTIFY_CHAR_UUID: '0000ffd4-0000-1000-8000-00805f9b34fb',    // Notify characteristic
  notifyChar: null,

  // Device name prefixes — Oracle BC2 uses generic BLE LED chipset
  // These are the known names these controllers broadcast as
  DEVICE_FILTERS: ['Oracle', 'ELK', 'LEDBLE', 'LEDnet', 'Triones', 'LEDBlue', 'QHM', 'BC', 'MELK', 'Dream'],

  async connect() {
    // Try specific name filters first, fall back to accepting all devices
    let device;
    const optServices = [this.SERVICE_UUID, this.NOTIFY_SERVICE_UUID];
    try {
      device = await navigator.bluetooth.requestDevice({
        filters: this.DEVICE_FILTERS.map(name => ({ namePrefix: name })),
        optionalServices: optServices
      });
    } catch (err) {
      // If no matching device found with filters, let user pick any device
      if (err.name === 'NotFoundError') {
        device = await navigator.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: optServices
        });
      } else {
        throw err;
      }
    }
    this.device = device;
    device.addEventListener('gattserverdisconnected', () => this.onDisconnect());
    this.server = await device.gatt.connect();
    await this.discoverServices();
    return device;
  },

  async discoverServices() {
    this.writeChar = null;
    this.notifyChar = null;
    this.characteristics.clear();
    this.services = [];

    // Try known Oracle UUIDs first (FFD5 write service, FFD0 notify service)
    try {
      const writeService = await this.server.getPrimaryService(this.SERVICE_UUID);
      this.services.push(writeService);
      const writeChar = await writeService.getCharacteristic(this.CHAR_UUID);
      this.writeChar = writeChar;
      this.characteristics.set(writeChar.uuid, writeChar);
      console.log('[BLE] Found write characteristic: FFD9');
    } catch (e) {
      console.log('[BLE] FFD5/FFD9 not found, will scan all services');
    }

    // Try notify service
    try {
      const notifyService = await this.server.getPrimaryService(this.NOTIFY_SERVICE_UUID);
      this.services.push(notifyService);
      const notifyChar = await notifyService.getCharacteristic(this.NOTIFY_CHAR_UUID);
      this.notifyChar = notifyChar;
      this.characteristics.set(notifyChar.uuid, notifyChar);
      // Subscribe to notifications
      await notifyChar.startNotifications();
      notifyChar.addEventListener('characteristicvaluechanged', (event) => {
        const value = new Uint8Array(event.target.value.buffer);
        const hex = Array.from(value).map(b => b.toString(16).padStart(2, '0')).join(' ');
        console.log('[BLE] Notify <-', hex);
      });
      console.log('[BLE] Subscribed to notify characteristic: FFD4');
    } catch (e) {
      console.log('[BLE] FFD0/FFD4 notify not available:', e.message);
    }

    // Fallback: enumerate all services if we didn't find the write char
    if (!this.writeChar) {
      console.log('[BLE] Falling back to full service discovery...');
      const services = await this.server.getPrimaryServices();
      this.services = services;
      for (const service of services) {
        const chars = await service.getCharacteristics();
        for (const char of chars) {
          this.characteristics.set(char.uuid, char);
          if (!this.writeChar && (char.properties.write || char.properties.writeWithoutResponse)) {
            this.writeChar = char;
          }
        }
      }
    }

    console.log(`[BLE] Discovered ${this.services.length} services, ${this.characteristics.size} characteristics`);
    if (this.writeChar) {
      console.log('[BLE] Write characteristic:', this.writeChar.uuid);
    }
  },

  async write(charUuid, data) {
    const char = this.characteristics.get(charUuid);
    if (!char) throw new Error(`Characteristic ${charUuid} not found`);
    const bytes = new Uint8Array(data);
    if (char.properties.writeWithoutResponse) {
      await char.writeValueWithoutResponse(bytes);
    } else {
      await char.writeValueWithResponse(bytes);
    }
  },

  async read(charUuid) {
    const char = this.characteristics.get(charUuid);
    if (!char) throw new Error(`Characteristic ${charUuid} not found`);
    return await char.readValue();
  },

  async sendRaw(data) {
    if (!this.writeChar) {
      console.warn('[BLE] No writable characteristic found');
      return;
    }
    const bytes = new Uint8Array(data);
    try {
      if (this.writeChar.properties.writeWithoutResponse) {
        await this.writeChar.writeValueWithoutResponse(bytes);
      } else {
        await this.writeChar.writeValueWithResponse(bytes);
      }
    } catch (err) {
      console.error('[BLE] Write failed:', err);
    }
  },

  // ======= Protocol: 9-byte packets =======
  // Format: 0x7E 0x00 [CMD] [SUB] [ARG1] [ARG2] [ARG3] 0x00 0xEF

  // Power on/off
  sendPower(on) {
    const cmd = on
      ? [0x7E, 0x00, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0xEF]
      : [0x7E, 0x00, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0xEF];
    console.log(`[BLE] Power ${on ? 'ON' : 'OFF'}`);
    this.sendRaw(cmd);
  },

  // Set RGB color: 7E 00 05 03 RR GG BB 00 EF
  sendColor(zone, r, g, b, brightness) {
    const scale = (brightness || 100) / 100;
    const sr = Math.min(255, Math.round(r * scale));
    const sg = Math.min(255, Math.round(g * scale));
    const sb = Math.min(255, Math.round(b * scale));
    const cmd = [0x7E, 0x00, 0x05, 0x03, sr, sg, sb, 0x00, 0xEF];
    console.log(`[BLE] Color -> ${zone}: rgb(${sr},${sg},${sb}) cmd=[${cmd.map(x => '0x' + x.toString(16).padStart(2, '0')).join(' ')}]`);
    this.sendRaw(cmd);
  },

  // Set brightness: 7E 00 01 [0-100] 00 00 00 00 EF
  sendBrightness(level) {
    const val = Math.max(0, Math.min(100, Math.round(level)));
    const cmd = [0x7E, 0x00, 0x01, val, 0x00, 0x00, 0x00, 0x00, 0xEF];
    console.log(`[BLE] Brightness -> ${val}%`);
    this.sendRaw(cmd);
  },

  // Set effect speed: 7E 00 02 [0-100] 00 00 00 00 EF
  sendSpeed(speed) {
    const val = Math.max(0, Math.min(100, Math.round(speed)));
    const cmd = [0x7E, 0x00, 0x02, val, 0x00, 0x00, 0x00, 0x00, 0xEF];
    console.log(`[BLE] Speed -> ${val}`);
    this.sendRaw(cmd);
  },

  // Set effect mode: 7E 00 03 [mode] [speed] 00 00 00 EF
  sendEffect(type, params) {
    // Mode byte mapping for built-in effects
    const modeMap = {
      fade: 0x25,
      pulse: 0x26,
      phase: 0x27,
      chase: 0x28,
      strobe: 0x30,
      rainbow: 0x25  // rainbow = multi-color fade
    };
    const mode = modeMap[type] || 0x25;
    const speed = params?.speed ? Math.min(100, Math.round(params.speed * 10)) : 50;
    const cmd = [0x7E, 0x00, 0x03, mode, speed, 0x00, 0x00, 0x00, 0xEF];
    console.log(`[BLE] Effect -> ${type} (mode 0x${mode.toString(16)}, speed ${speed})`);
    this.sendRaw(cmd);
  },

  onDisconnect() {
    this.writeChar = null;
    document.getElementById('ble-status').textContent = 'Disconnected';
    document.getElementById('ble-status').className = 'status disconnected';
  },

  isConnected() {
    return this.device?.gatt?.connected ?? false;
  }
};
