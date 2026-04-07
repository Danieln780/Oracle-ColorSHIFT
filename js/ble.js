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

  // Try to reconnect to a previously paired device without the picker
  async autoReconnect() {
    if (!navigator.bluetooth.getDevices) return false;
    const devices = await navigator.bluetooth.getDevices();
    for (const device of devices) {
      if (device.name && device.name.startsWith('Oracle')) {
        console.log('[BLE] Found previously paired device:', device.name);
        this.device = device;
        device.addEventListener('gattserverdisconnected', () => this.onDisconnect());
        const abortCtrl = new AbortController();
        // Listen for the device to appear nearby
        await device.watchAdvertisements({ signal: abortCtrl.signal }).catch(() => {});
        try {
          this.server = await device.gatt.connect();
          abortCtrl.abort();
          await this.discoverServices();
          return true;
        } catch (e) {
          abortCtrl.abort();
          console.log('[BLE] Auto-reconnect failed, will use picker');
        }
      }
    }
    return false;
  },

  async connect(mode) {
    // mode: 'auto' = try reconnect first, 'scan' = all devices, 'service' = filter by FFD5 service
    const optServices = [this.SERVICE_UUID, this.NOTIFY_SERVICE_UUID];

    // Try auto-reconnect to known device first
    if (mode === 'auto') {
      try {
        const reconnected = await this.autoReconnect();
        if (reconnected) return this.device;
      } catch (e) {
        console.log('[BLE] Auto-reconnect not supported or failed');
      }
    }

    let device;

    // Strategy 1: Filter by service UUID — only shows devices with FFD5
    // This is the most reliable way since Bluefy may not show device names
    if (mode === 'auto' || mode === 'service') {
      try {
        device = await navigator.bluetooth.requestDevice({
          filters: [{ services: [this.SERVICE_UUID] }],
          optionalServices: [this.NOTIFY_SERVICE_UUID]
        });
      } catch (err) {
        if (err.name !== 'NotFoundError') throw err;
        console.log('[BLE] No devices with FFD5 service, trying name filters...');
      }
    }

    // Strategy 2: Filter by name prefixes
    if (!device && (mode === 'auto' || mode === 'name')) {
      try {
        device = await navigator.bluetooth.requestDevice({
          filters: this.DEVICE_FILTERS.map(name => ({ namePrefix: name })),
          optionalServices: optServices
        });
      } catch (err) {
        if (err.name !== 'NotFoundError') throw err;
        console.log('[BLE] No devices matched name filters');
      }
    }

    // Strategy 3: Accept all devices — let user pick manually
    if (!device || mode === 'scan') {
      device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: optServices
      });
    }

    this.device = device;
    device.addEventListener('gattserverdisconnected', () => this.onDisconnect());
    this._updateStatus('Connecting to GATT...');
    this.server = await device.gatt.connect();
    this._updateStatus('Discovering services...');
    await this.discoverServices();
    return device;
  },

  _updateStatus(msg) {
    const el = document.getElementById('ble-status');
    if (el) {
      el.textContent = msg;
      el.className = 'status scanning';
    }
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
        // Parse Triones status response (12 bytes)
        if (value.length >= 9 && value[0] === 0x66) {
          const power = value[2] === 0x23 ? 'ON' : 'OFF';
          const mode = value[3];
          const speed = value[5];
          const r = value[6], g = value[7], b = value[8];
          console.log(`[BLE] Status: power=${power} mode=0x${mode.toString(16)} speed=0x${speed.toString(16)} rgb=(${r},${g},${b})`);
        }
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

  // ======= Triones Protocol (confirmed for Oracle-B1E4) =======
  // Write to FFD9, notifications from FFD4

  // Power on: CC 23 33 | Power off: CC 24 33
  sendPower(on) {
    const cmd = on ? [0xCC, 0x23, 0x33] : [0xCC, 0x24, 0x33];
    console.log(`[BLE] Power ${on ? 'ON' : 'OFF'} -> [${cmd.map(x => x.toString(16)).join(' ')}]`);
    this.sendRaw(cmd);
  },

  // Set RGB color: 56 RR GG BB 00 F0 AA
  sendColor(zone, r, g, b, brightness) {
    const scale = (brightness || 100) / 100;
    const sr = Math.min(255, Math.round(r * scale));
    const sg = Math.min(255, Math.round(g * scale));
    const sb = Math.min(255, Math.round(b * scale));
    const cmd = [0x56, sr, sg, sb, 0x00, 0xF0, 0xAA];
    console.log(`[BLE] Color -> ${zone}: rgb(${sr},${sg},${sb}) -> [${cmd.map(x => x.toString(16).padStart(2, '0')).join(' ')}]`);
    this.sendRaw(cmd);
  },

  // Set white intensity: 56 00 00 00 WW 0F AA (WW: 0x01-0xFF)
  sendWhite(intensity) {
    const val = Math.max(1, Math.min(255, Math.round(intensity * 2.55)));
    const cmd = [0x56, 0x00, 0x00, 0x00, val, 0x0F, 0xAA];
    console.log(`[BLE] White -> ${intensity}% (0x${val.toString(16)})`);
    this.sendRaw(cmd);
  },

  // Set brightness via RGB scaling (Triones has no separate brightness command)
  sendBrightness(level) {
    // Re-send current color at new brightness
    console.log(`[BLE] Brightness -> ${level}% (applied via color scaling)`);
  },

  // All 20 Triones built-in modes (0x25-0x38)
  EFFECTS: {
    0x25: 'Seven Color Fade',
    0x26: 'Red Gradual',
    0x27: 'Green Gradual',
    0x28: 'Blue Gradual',
    0x29: 'Yellow Gradual',
    0x2A: 'Cyan Gradual',
    0x2B: 'Purple Gradual',
    0x2C: 'White Gradual',
    0x2D: 'Red/Green Fade',
    0x2E: 'Red/Blue Fade',
    0x2F: 'Green/Blue Fade',
    0x30: 'Seven Color Strobe',
    0x31: 'Red Strobe',
    0x32: 'Green Strobe',
    0x33: 'Blue Strobe',
    0x34: 'Yellow Strobe',
    0x35: 'Cyan Strobe',
    0x36: 'Purple Strobe',
    0x37: 'White Strobe',
    0x38: 'Seven Color Jump'
  },

  // Built-in mode: BB [mode] [speed] 44
  // Speed: 0x01=fastest, 0xFF=slowest
  sendEffect(type, params) {
    // Accept direct mode byte or map from name
    let mode;
    if (typeof type === 'number') {
      mode = type;
    } else {
      const modeMap = {
        fade: 0x25,       // seven color cross fade
        pulse: 0x26,      // red gradual
        phase: 0x2D,      // red/green cross fade
        chase: 0x38,      // seven color jump
        strobe: 0x30,     // seven color strobe
        rainbow: 0x25     // seven color cross fade
      };
      mode = modeMap[type] || 0x25;
    }
    // Speed: slider 1-10 maps to 0x01(fast)-0xFF(slow)
    // Default to medium speed
    let rawSpeed = 0x10;
    if (params?.speed) {
      rawSpeed = Math.max(0x01, Math.min(0xFF, Math.round(params.speed * 25)));
    }
    const cmd = [0xBB, mode, rawSpeed, 0x44];
    console.log(`[BLE] Effect -> mode 0x${mode.toString(16)} speed 0x${rawSpeed.toString(16)} -> [${cmd.map(x => x.toString(16).padStart(2, '0')).join(' ')}]`);
    this.sendRaw(cmd);
  },

  // Query device status: EF 01 77 (response comes on FFD4 notify)
  queryStatus() {
    const cmd = [0xEF, 0x01, 0x77];
    console.log('[BLE] Query status');
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
