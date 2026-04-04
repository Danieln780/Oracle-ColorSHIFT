const BLE = {
  device: null,
  server: null,
  services: [],
  characteristics: new Map(),
  writeChar: null, // cached writable characteristic

  // Oracle BC1/BC2 device name patterns
  DEVICE_FILTERS: ['LEDnet', 'QHM', 'BC1', 'BC2'],

  async connect() {
    const device = await navigator.bluetooth.requestDevice({
      filters: this.DEVICE_FILTERS.map(name => ({ namePrefix: name })),
      optionalServices: [] // accept all discovered services
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
    this.writeChar = null;
    for (const service of services) {
      const chars = await service.getCharacteristics();
      for (const char of chars) {
        this.characteristics.set(char.uuid, char);
        // Cache first writable characteristic for sending commands
        if (!this.writeChar && (char.properties.write || char.properties.writeWithoutResponse)) {
          this.writeChar = char;
        }
      }
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

  // Send raw bytes to the cached write characteristic
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

  // Oracle BC1/BC2 protocol: 0x56 RR GG BB 0x00 0xF0 0xAA
  // Note: SK6812 uses GRB color order, but the controller handles reordering
  buildColorCommand(r, g, b) {
    return [0x56, r, g, b, 0x00, 0xF0, 0xAA];
  },

  // Send color to controller — applies brightness as scaling
  sendColor(zone, r, g, b, brightness) {
    const scale = (brightness || 100) / 100;
    const sr = Math.round(r * scale);
    const sg = Math.round(g * scale);
    const sb = Math.round(b * scale);
    const cmd = this.buildColorCommand(sr, sg, sb);
    console.log(`[BLE] Color -> ${zone}: rgb(${sr},${sg},${sb}) cmd=[${cmd.map(x => '0x' + x.toString(16).padStart(2, '0')).join(', ')}]`);
    if (this.isConnected() && this.writeChar) {
      this.sendRaw(cmd);
    }
  },

  // Power on/off: send black (off) or restore last color (on)
  sendPower(on) {
    if (on) {
      // Send white at full brightness as a "power on" default
      const cmd = this.buildColorCommand(255, 255, 255);
      console.log('[BLE] Power ON');
      if (this.isConnected() && this.writeChar) this.sendRaw(cmd);
    } else {
      // Send all zeros to turn off
      const cmd = this.buildColorCommand(0, 0, 0);
      console.log('[BLE] Power OFF');
      if (this.isConnected() && this.writeChar) this.sendRaw(cmd);
    }
  },

  // Send effect command — mode byte varies by effect type
  sendEffect(type, params) {
    // Effect mode commands use: 0xBB [mode_byte] [speed] 0x44
    const modeMap = {
      fade: 0x25,
      pulse: 0x26,
      chase: 0x28,
      strobe: 0x30,
      rainbow: 0x25,    // rainbow uses fade mode with full spectrum
      phase: 0x27       // phase shift pattern
    };
    const mode = modeMap[type] || 0x25;
    const speed = params?.speed || 0x03;
    const cmd = [0xBB, mode, speed, 0x44];
    console.log(`[BLE] Effect -> ${type}: cmd=[${cmd.map(x => '0x' + x.toString(16).padStart(2, '0')).join(', ')}]`);
    if (this.isConnected() && this.writeChar) {
      this.sendRaw(cmd);
    }
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
