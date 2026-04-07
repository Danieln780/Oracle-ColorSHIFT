const PresetsTab = {
  STORAGE_KEY: 'oculus_presets',
  presets: [],
  builtins: [
    // Solid colors
    { id: 'b-amber', name: 'Off-Road Amber', builtin: true, type: 'color', color: { r: 255, g: 140, b: 0 }, brightness: 100 },
    { id: 'b-white', name: 'Pure White', builtin: true, type: 'white', brightness: 100 },
    { id: 'b-ice', name: 'Ice Blue', builtin: true, type: 'color', color: { r: 0, g: 100, b: 255 }, brightness: 60 },
    { id: 'b-red', name: 'Demon Red', builtin: true, type: 'color', color: { r: 255, g: 0, b: 0 }, brightness: 100 },
    { id: 'b-green', name: 'Emerald', builtin: true, type: 'color', color: { r: 0, g: 255, b: 50 }, brightness: 80 },
    { id: 'b-purple', name: 'Purple Haze', builtin: true, type: 'color', color: { r: 170, g: 0, b: 255 }, brightness: 90 },
    { id: 'b-teal', name: 'Teal Glow', builtin: true, type: 'color', color: { r: 0, g: 200, b: 200 }, brightness: 70 },
    { id: 'b-pink', name: 'Hot Pink', builtin: true, type: 'color', color: { r: 255, g: 0, b: 128 }, brightness: 100 },
    { id: 'b-stealth', name: 'Stealth', builtin: true, type: 'color', color: { r: 10, g: 10, b: 30 }, brightness: 20 },
    // Effects
    { id: 'b-rainbow', name: 'Rainbow Cruise', builtin: true, type: 'effect', effectCode: 0x25, speed: 4 },
    { id: 'b-cop', name: 'Red/Blue Flash', builtin: true, type: 'strobe', colors: ['#ff0000', '#0000ff'], speed: 2 },
    { id: 'b-fire', name: 'Fire Strobe', builtin: true, type: 'strobe', colors: ['#ff0000', '#ff6b00', '#ffff00'], speed: 3 },
    { id: 'b-chill', name: 'Ocean Fade', builtin: true, type: 'fade', colors: ['#0044ff', '#00cccc', '#004488'], speed: 6 },
    { id: 'b-usa', name: 'USA', builtin: true, type: 'strobe', colors: ['#ff0000', '#ffffff', '#0044ff'], speed: 4 },
    { id: 'b-sunset', name: 'Sunset Fade', builtin: true, type: 'fade', colors: ['#ff4400', '#ff0066', '#aa00ff'], speed: 5 },
    { id: 'b-rave', name: 'Rave', builtin: true, type: 'effect', effectCode: 0x30, speed: 1 },
    { id: 'b-nightride', name: 'Night Rider', builtin: true, type: 'fade', colors: ['#ff0000', '#000000'], speed: 3 },
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
    if (!name) {
      nameInput.placeholder = 'Enter a name first!';
      nameInput.classList.add('error');
      setTimeout(() => { nameInput.placeholder = 'Preset name...'; nameInput.classList.remove('error'); }, 2000);
      return;
    }

    // Capture current color from ColorsTab
    const currentColor = (typeof ColorsTab !== 'undefined' && ColorsTab.currentColor)
      ? { ...ColorsTab.currentColor }
      : { r: 255, g: 107, b: 0 };
    const brightness = (typeof ColorsTab !== 'undefined') ? (ColorsTab.brightness || 100) : 100;

    const preset = {
      id: Date.now().toString(),
      name,
      type: 'color',
      color: { r: currentColor.r, g: currentColor.g, b: currentColor.b },
      brightness
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

    // Stop ALL running effects — effects tab, presets custom timers, breathing, music
    this._stopCustom();
    if (typeof EffectsTab !== 'undefined') EffectsTab.stopAll();
    if (typeof stopBreathing === 'function') stopBreathing();
    if (typeof MusicTab !== 'undefined' && MusicTab.isListening) {
      MusicTab.stop();
      const musicBtn = document.getElementById('music-toggle-btn');
      if (musicBtn) { musicBtn.classList.remove('on'); musicBtn.classList.add('off'); }
    }

    if (preset.type === 'color') {
      const c = preset.color;
      if (typeof BLE !== 'undefined' && BLE.sendColor) {
        BLE.sendColor('all', c.r, c.g, c.b, preset.brightness || 100);
      }
    } else if (preset.type === 'white') {
      if (typeof BLE !== 'undefined' && BLE.sendWhite) {
        BLE.sendWhite(preset.brightness || 100);
      }
    } else if (preset.type === 'effect') {
      if (typeof BLE !== 'undefined' && BLE.sendEffect) {
        BLE.sendEffect(preset.effectCode, { speed: preset.speed || 5 });
      }
    } else if (preset.type === 'fade') {
      // Run custom fade with preset colors
      if (typeof EffectsTab !== 'undefined') {
        // Map hex colors to palette indices or run directly
        this._runFade(preset.colors, preset.speed || 5);
      }
    } else if (preset.type === 'strobe') {
      this._runStrobe(preset.colors, preset.speed || 3);
    }

    // Visual feedback
    document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('loaded'));
    const card = document.querySelector(`.preset-card[data-id="${id}"]`);
    if (card) card.classList.add('loaded');
  },

  // Run a custom fade directly (bypass EffectsTab selection)
  _fadeTimer: null,
  _strobeTimer: null,

  _stopCustom() {
    if (this._fadeTimer) { clearTimeout(this._fadeTimer); this._fadeTimer = null; }
    if (this._strobeTimer) { clearTimeout(this._strobeTimer); this._strobeTimer = null; }
  },

  _runFade(hexColors, speed) {
    this._stopCustom();
    const colors = hexColors.map(h => ({
      r: parseInt(h.slice(1, 3), 16),
      g: parseInt(h.slice(3, 5), 16),
      b: parseInt(h.slice(5, 7), 16)
    }));
    if (colors.length < 2) return;

    const steps = 40;
    const interval = Math.round(15 * Math.pow(1.28, speed - 1));
    let step = 0;
    const totalSteps = steps * colors.length;

    const tick = () => {
      const pi = Math.floor(step / steps) % colors.length;
      const ni = (pi + 1) % colors.length;
      const t = (step % steps) / steps;
      const c1 = colors[pi], c2 = colors[ni];
      const r = Math.round(c1.r + (c2.r - c1.r) * t);
      const g = Math.round(c1.g + (c2.g - c1.g) * t);
      const b = Math.round(c1.b + (c2.b - c1.b) * t);
      if (typeof BLE !== 'undefined' && BLE.sendColor) BLE.sendColor('all', r, g, b, 100);
      step = (step + 1) % totalSteps;
      this._fadeTimer = setTimeout(tick, interval);
    };
    tick();
  },

  _runStrobe(hexColors, speed) {
    this._stopCustom();
    const colors = hexColors.map(h => ({
      r: parseInt(h.slice(1, 3), 16),
      g: parseInt(h.slice(3, 5), 16),
      b: parseInt(h.slice(5, 7), 16)
    }));
    if (colors.length < 1) return;

    let ci = 0, isOn = true;
    const getInterval = () => Math.round(50 * Math.pow(1.35, speed - 1));

    const tick = () => {
      if (isOn) {
        const c = colors[ci];
        if (typeof BLE !== 'undefined' && BLE.sendColor) BLE.sendColor('all', c.r, c.g, c.b, 100);
      } else {
        if (typeof BLE !== 'undefined' && BLE.sendColor) BLE.sendColor('all', 0, 0, 0, 100);
        ci = (ci + 1) % colors.length;
      }
      isOn = !isOn;
      this._strobeTimer = setTimeout(tick, getInterval());
    };
    tick();
  },

  deletePreset(id) {
    this.presets = this.presets.filter(p => p.id !== id);
    this.saveToStorage();
    this.render();
  },

  _getPresetIcon(preset) {
    if (preset.type === 'white') return { bg: '#ffffff', label: 'W' };
    if (preset.type === 'color') return { bg: `rgb(${preset.color.r},${preset.color.g},${preset.color.b})`, label: '' };
    if (preset.type === 'effect') return { bg: '#111', label: '~' };
    if (preset.type === 'fade') return { bg: `linear-gradient(90deg, ${preset.colors.join(',')})`, label: '' };
    if (preset.type === 'strobe') return { bg: `linear-gradient(90deg, ${preset.colors.join(',')})`, label: '!' };
    return { bg: '#333', label: '?' };
  },

  render() {
    const container = document.getElementById('preset-list');
    const all = [...this.builtins, ...this.presets];

    container.innerHTML = all.map(p => {
      const icon = this._getPresetIcon(p);
      const isGradient = icon.bg.includes('gradient');
      const dotStyle = isGradient ? `background:${icon.bg}` : `background-color:${icon.bg}`;
      const typeLabel = p.type === 'fade' ? 'Fade' : p.type === 'strobe' ? 'Strobe' : p.type === 'effect' ? 'Effect' : '';

      return `<div class="preset-card ${p.builtin ? 'builtin' : ''}" data-id="${p.id}">
        <div class="preset-icon-dot" style="${dotStyle}">
          ${icon.label ? `<span>${icon.label}</span>` : ''}
        </div>
        <div class="preset-info">
          <span class="preset-name">${p.name}</span>
          ${typeLabel ? `<span class="preset-type">${typeLabel}</span>` : ''}
        </div>
        ${p.builtin ? '' : '<button class="preset-delete-btn">&times;</button>'}
      </div>`;
    }).join('');

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
