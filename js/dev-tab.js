const DevTab = {
  log: [],

  init() {
    document.getElementById('dev-refresh-btn').addEventListener('click', () => this.refreshServices());
    document.getElementById('dev-write-btn').addEventListener('click', () => this.sendRaw());
    document.getElementById('dev-read-btn').addEventListener('click', () => this.readRaw());
    document.getElementById('dev-clear-log-btn').addEventListener('click', () => this.clearLog());
    document.getElementById('dev-find-btn')?.addEventListener('click', () => this.findOracle());
  },

  // Device finder — pick any BLE device, we'll probe it and tell you if it's the Oracle
  async findOracle() {
    const results = document.getElementById('finder-results');
    results.innerHTML = '<p class="dev-hint">Opening device picker... select ANY device</p>';

    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '0000ffd5-0000-1000-8000-00805f9b34fb',
          '0000ffd0-0000-1000-8000-00805f9b34fb',
          '0000fff0-0000-1000-8000-00805f9b34fb'
        ]
      });

      results.innerHTML = `<div class="finder-card probing">
        <div class="finder-name">${device.name || device.id}</div>
        <div class="finder-id">ID: ${device.id}</div>
        <div class="finder-status">Connecting & probing...</div>
      </div>`;

      const server = await device.gatt.connect();
      let isOracle = false;
      let serviceList = [];

      // Check for Oracle's FFD5 service
      try {
        const ffd5 = await server.getPrimaryService('0000ffd5-0000-1000-8000-00805f9b34fb');
        const ffd9 = await ffd5.getCharacteristic('0000ffd9-0000-1000-8000-00805f9b34fb');
        isOracle = true;
        serviceList.push('FFD5/FFD9 (Write) ✓');
      } catch (e) {
        serviceList.push('FFD5 — not found');
      }

      try {
        const ffd0 = await server.getPrimaryService('0000ffd0-0000-1000-8000-00805f9b34fb');
        serviceList.push('FFD0/FFD4 (Notify) ✓');
      } catch (e) {
        serviceList.push('FFD0 — not found');
      }

      // Also try generic LED service
      try {
        await server.getPrimaryService('0000fff0-0000-1000-8000-00805f9b34fb');
        serviceList.push('FFF0 (Generic LED) ✓');
        isOracle = true;
      } catch (e) {}

      if (isOracle) {
        // THIS IS THE ONE — auto-connect via BLE module
        server.disconnect();
        results.innerHTML = `<div class="finder-card found">
          <div class="finder-name">✓ ORACLE FOUND: ${device.name || device.id}</div>
          <div class="finder-id">ID: ${device.id}</div>
          <div class="finder-services">${serviceList.join('<br>')}</div>
          <div class="finder-status">This is your headlight controller!</div>
          <button class="primary-btn" id="finder-connect-btn">Connect & Use</button>
        </div>`;
        document.getElementById('finder-connect-btn').addEventListener('click', async () => {
          results.innerHTML = '<p class="dev-hint">Connecting...</p>';
          BLE.device = device;
          device.addEventListener('gattserverdisconnected', () => BLE.onDisconnect());
          BLE.server = await device.gatt.connect();
          await BLE.discoverServices();
          const status = document.getElementById('ble-status');
          status.textContent = `Connected: ${device.name || device.id} (FFD9 OK)`;
          status.className = 'status connected';
          results.innerHTML = `<div class="finder-card found"><div class="finder-name">✓ Connected and ready!</div></div>`;
          this.refreshServices();
        });
      } else {
        server.disconnect();
        results.innerHTML = `<div class="finder-card not-oracle">
          <div class="finder-name">✗ NOT Oracle: ${device.name || device.id}</div>
          <div class="finder-id">ID: ${device.id}</div>
          <div class="finder-services">${serviceList.join('<br>')}</div>
          <div class="finder-status">This device doesn't have FFD5/FFD9. Try another.</div>
          <button class="secondary-btn" id="finder-retry-btn">Try Another Device</button>
        </div>`;
        document.getElementById('finder-retry-btn').addEventListener('click', () => this.findOracle());
      }
    } catch (err) {
      results.innerHTML = `<div class="finder-card error">
        <div class="finder-status">Error: ${err.message}</div>
        <button class="secondary-btn" id="finder-retry-btn">Try Again</button>
      </div>`;
      document.getElementById('finder-retry-btn')?.addEventListener('click', () => this.findOracle());
    }
  },

  refreshServices() {
    const container = document.getElementById('service-tree');
    if (!BLE.isConnected()) {
      container.innerHTML = '<p class="dev-hint">Connect to a device first</p>';
      return;
    }

    let html = '';
    const charSelect = document.getElementById('char-select');
    charSelect.innerHTML = '';

    BLE.services.forEach(service => {
      html += `<div class="service-node">
        <div class="service-uuid">${service.uuid}</div>`;
      // Note: characteristics are stored in BLE.characteristics Map
      BLE.characteristics.forEach((char, uuid) => {
        const props = [];
        if (char.properties.read) props.push('R');
        if (char.properties.write) props.push('W');
        if (char.properties.writeWithoutResponse) props.push('Wn');
        if (char.properties.notify) props.push('N');
        html += `<div class="char-node">
          <span class="char-uuid">${uuid}</span>
          <span class="char-props">[${props.join(', ')}]</span>
        </div>`;

        const option = document.createElement('option');
        option.value = uuid;
        option.textContent = uuid.substring(0, 8) + '... [' + props.join(',') + ']';
        charSelect.appendChild(option);
      });
      html += '</div>';
    });

    container.innerHTML = html || '<p class="dev-hint">No services found</p>';
  },

  async sendRaw() {
    const hexInput = document.getElementById('raw-hex-input').value.trim();
    const charUuid = document.getElementById('char-select').value;
    if (!hexInput || !charUuid) return;

    const bytes = this.hexToBytes(hexInput);
    try {
      await BLE.write(charUuid, bytes);
      this.addLog('WRITE', charUuid, hexInput);
    } catch (err) {
      this.addLog('ERROR', charUuid, err.message);
    }
  },

  async readRaw() {
    const charUuid = document.getElementById('char-select').value;
    if (!charUuid) return;

    try {
      const value = await BLE.read(charUuid);
      const hex = Array.from(new Uint8Array(value.buffer)).map(b => b.toString(16).padStart(2, '0')).join(' ');
      this.addLog('READ', charUuid, hex);
    } catch (err) {
      this.addLog('ERROR', charUuid, err.message);
    }
  },

  hexToBytes(hex) {
    const clean = hex.replace(/\s+/g, '').replace(/0x/g, '');
    const bytes = [];
    for (let i = 0; i < clean.length; i += 2) {
      bytes.push(parseInt(clean.substring(i, i + 2), 16));
    }
    return bytes;
  },

  addLog(type, uuid, data) {
    const entry = {
      time: new Date().toLocaleTimeString(),
      type,
      uuid: uuid.substring(0, 8) + '...',
      data
    };
    this.log.unshift(entry);
    this.renderLog();
  },

  renderLog() {
    const container = document.getElementById('dev-log');
    container.innerHTML = this.log.map(e =>
      `<div class="log-entry log-${e.type.toLowerCase()}">
        <span class="log-time">${e.time}</span>
        <span class="log-type">${e.type}</span>
        <span class="log-uuid">${e.uuid}</span>
        <span class="log-data">${e.data}</span>
      </div>`
    ).join('');
  },

  clearLog() {
    this.log = [];
    this.renderLog();
  }
};

document.addEventListener('DOMContentLoaded', () => DevTab.init());
