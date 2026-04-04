const PresetsTab = {
  STORAGE_KEY: 'oculus_presets',
  presets: [],
  builtins: [
    {
      id: 'builtin-1', name: 'Off-Road Amber', builtin: true,
      zones: {
        outer: { r: 255, g: 191, b: 0, brightness: 100 },
        inner: { r: 255, g: 140, b: 0, brightness: 80 },
        demon: { r: 255, g: 60, b: 0, brightness: 100 }
      },
      effect: null
    },
    {
      id: 'builtin-2', name: 'Night Cruise', builtin: true,
      zones: {
        outer: { r: 0, g: 100, b: 255, brightness: 40 },
        inner: { r: 0, g: 60, b: 200, brightness: 30 },
        demon: { r: 0, g: 40, b: 180, brightness: 50 }
      },
      effect: null
    },
    {
      id: 'builtin-3', name: 'Show Mode', builtin: true,
      zones: {
        outer: { r: 255, g: 0, b: 255, brightness: 100 },
        inner: { r: 0, g: 255, b: 255, brightness: 100 },
        demon: { r: 255, g: 0, b: 0, brightness: 100 }
      },
      effect: null
    }
  ],

  init() {
    this.loadFromStorage();
    this.render();
    document.getElementById('preset-save-btn').addEventListener('click', () => this.saveCurrent());
  },

  loadFromStorage() {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    this.presets = stored ? JSON.parse(stored) : [];
  },

  saveToStorage() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.presets));
  },

  saveCurrent() {
    const nameInput = document.getElementById('preset-name-input');
    const name = nameInput.value.trim();
    if (!name) return;

    // Capture current state from ColorsTab if available
    const currentColor = (typeof ColorsTab !== 'undefined') ? ColorsTab.currentColor : { r: 255, g: 107, b: 0 };
    const brightness = (typeof ColorsTab !== 'undefined') ? ColorsTab.brightness : 100;

    const preset = {
      id: Date.now().toString(),
      name,
      zones: {
        outer: { ...currentColor, brightness },
        inner: { ...currentColor, brightness },
        demon: { ...currentColor, brightness }
      },
      effect: null
    };

    this.presets.unshift(preset);
    this.saveToStorage();
    this.render();
    nameInput.value = '';
  },

  loadPreset(id) {
    const all = [...this.builtins, ...this.presets];
    const preset = all.find(p => p.id === id);
    if (!preset) return;

    // Apply to ColorsTab if available
    if (typeof ColorsTab !== 'undefined') {
      const zone = preset.zones.outer;
      ColorsTab.currentColor = { r: zone.r, g: zone.g, b: zone.b, hex: '#' + [zone.r, zone.g, zone.b].map(v => v.toString(16).padStart(2, '0')).join('') };
      ColorsTab.brightness = zone.brightness;
    }

    // Send to BLE
    Object.entries(preset.zones).forEach(([zone, color]) => {
      if (typeof BLE !== 'undefined' && BLE.sendColor) {
        BLE.sendColor(zone, color.r, color.g, color.b, color.brightness);
      }
    });

    // Visual feedback
    document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('loaded'));
    const card = document.querySelector(`.preset-card[data-id="${id}"]`);
    if (card) card.classList.add('loaded');
  },

  deletePreset(id) {
    this.presets = this.presets.filter(p => p.id !== id);
    this.saveToStorage();
    this.render();
  },

  render() {
    const container = document.getElementById('preset-list');
    const all = [...this.builtins, ...this.presets];
    container.innerHTML = all.map(p => `
      <div class="preset-card ${p.builtin ? 'builtin' : ''}" data-id="${p.id}">
        <div class="preset-colors">
          <span class="preset-dot" style="background: rgb(${p.zones.outer.r},${p.zones.outer.g},${p.zones.outer.b})"></span>
          <span class="preset-dot" style="background: rgb(${p.zones.inner.r},${p.zones.inner.g},${p.zones.inner.b})"></span>
          <span class="preset-dot" style="background: rgb(${p.zones.demon.r},${p.zones.demon.g},${p.zones.demon.b})"></span>
        </div>
        <span class="preset-name">${p.name}</span>
        ${p.builtin ? '' : '<button class="preset-delete-btn">&times;</button>'}
      </div>
    `).join('');

    // Wire events
    container.querySelectorAll('.preset-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.classList.contains('preset-delete-btn')) {
          this.deletePreset(card.dataset.id);
        } else {
          this.loadPreset(card.dataset.id);
        }
      });
    });
  }
};

document.addEventListener('DOMContentLoaded', () => PresetsTab.init());
