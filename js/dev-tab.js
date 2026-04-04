const DevTab = {
  log: [],

  init() {
    document.getElementById('dev-refresh-btn').addEventListener('click', () => this.refreshServices());
    document.getElementById('dev-write-btn').addEventListener('click', () => this.sendRaw());
    document.getElementById('dev-read-btn').addEventListener('click', () => this.readRaw());
    document.getElementById('dev-clear-log-btn').addEventListener('click', () => this.clearLog());
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
