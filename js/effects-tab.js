const EffectsTab = {
  activeMode: null,
  customFadeRunning: false,
  customFadeTimer: null,
  customStrobeRunning: false,
  customStrobeTimer: null,
  speed: 5,

  // Preset colors for selection rows
  colorPalette: [
    { name: 'Red', hex: '#ff0000' },
    { name: 'Orange', hex: '#ff6b00' },
    { name: 'Yellow', hex: '#ffff00' },
    { name: 'Green', hex: '#00ff00' },
    { name: 'Cyan', hex: '#00ffff' },
    { name: 'Blue', hex: '#0066ff' },
    { name: 'Purple', hex: '#aa00ff' },
    { name: 'Pink', hex: '#ff00aa' },
    { name: 'White', hex: '#ffffff' }
  ],

  // Selected colors for gradual fade
  gradualSelected: [0, 5], // indices into colorPalette (Red, Blue default)

  // Selected colors for strobe
  strobeSelected: [0, 5],

  // Built-in Triones modes
  builtinModes: [
    { code: 0x25, name: 'Rainbow Fade', iconClass: 'rainbow-icon' },
    { code: 0x30, name: 'Rainbow Strobe', iconClass: 'rainbow-icon' },
    { code: 0x38, name: 'Rainbow Jump', iconClass: 'rainbow-icon' }
  ],

  init() {
    this.renderAll();
    this.bindSpeedSlider();
  },

  renderAll() {
    const container = document.querySelector('#tab-effects .effect-modes');
    if (!container) return;

    let html = '';

    // === Built-in Modes ===
    html += '<div class="effect-group-label">Built-in</div>';
    html += '<div class="effect-grid">';
    this.builtinModes.forEach(mode => {
      html += `<button class="effect-card" data-builtin="${mode.code}">
        <span class="effect-icon ${mode.iconClass || ''}">R</span>
        <span class="effect-label">${mode.name}</span>
      </button>`;
    });
    html += '<button class="effect-card" id="effect-static-card"><span class="effect-icon">&#x23FB;</span><span class="effect-label">Solid Color</span></button>';
    html += '</div>';

    // === Gradual Fade ===
    html += '<div class="effect-group-label">Gradual Fade</div>';
    html += '<p class="effect-hint">Select colors to fade between in order. Tap to toggle.</p>';
    html += '<div class="color-select-row" id="gradual-colors">';
    this.colorPalette.forEach((c, i) => {
      const selected = this.gradualSelected.includes(i);
      const order = selected ? this.gradualSelected.indexOf(i) + 1 : '';
      html += `<button class="color-select-btn ${selected ? 'selected' : ''}" data-index="${i}" data-section="gradual" style="background:${c.hex}">
        <span class="color-order">${order}</span>
      </button>`;
    });
    html += '</div>';
    html += '<div class="effect-action-row">';
    html += '<button class="primary-btn" id="gradual-start-btn">Start Fade</button>';
    html += '</div>';

    // === Strobe ===
    html += '<div class="effect-group-label">Strobe</div>';
    html += '<p class="effect-hint">Select colors to strobe in order. Tap to toggle.</p>';
    html += '<div class="color-select-row" id="strobe-colors">';
    this.colorPalette.forEach((c, i) => {
      const selected = this.strobeSelected.includes(i);
      const order = selected ? this.strobeSelected.indexOf(i) + 1 : '';
      html += `<button class="color-select-btn ${selected ? 'selected' : ''}" data-index="${i}" data-section="strobe" style="background:${c.hex}">
        <span class="color-order">${order}</span>
      </button>`;
    });
    html += '</div>';
    html += '<div class="effect-action-row">';
    html += '<button class="primary-btn" id="strobe-start-btn">Start Strobe</button>';
    html += '</div>';

    container.innerHTML = html;
    this.bindAll();
  },

  bindAll() {
    // Built-in mode buttons
    document.querySelectorAll('.effect-card[data-builtin]').forEach(card => {
      card.addEventListener('click', () => {
        this.stopAll();
        const mode = parseInt(card.dataset.builtin);
        this.activeMode = mode;
        document.querySelectorAll('.effect-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        if (typeof BLE !== 'undefined' && BLE.sendEffect) {
          BLE.sendEffect(mode, { speed: this.speed });
        }
      });
    });

    // Static color button
    document.getElementById('effect-static-card')?.addEventListener('click', () => {
      this.stopAll();
      this.goStatic();
    });

    // Gradual color selection
    document.querySelectorAll('#gradual-colors .color-select-btn').forEach(btn => {
      btn.addEventListener('click', () => this.toggleColor('gradual', parseInt(btn.dataset.index)));
    });

    // Strobe color selection
    document.querySelectorAll('#strobe-colors .color-select-btn').forEach(btn => {
      btn.addEventListener('click', () => this.toggleColor('strobe', parseInt(btn.dataset.index)));
    });

    // Start buttons
    document.getElementById('gradual-start-btn')?.addEventListener('click', () => {
      if (this.customFadeRunning) {
        this.stopCustomFade();
      } else {
        this.startCustomFade();
      }
    });

    document.getElementById('strobe-start-btn')?.addEventListener('click', () => {
      if (this.customStrobeRunning) {
        this.stopCustomStrobe();
      } else {
        this.startCustomStrobe();
      }
    });
  },

  toggleColor(section, colorIndex) {
    const arr = section === 'gradual' ? this.gradualSelected : this.strobeSelected;
    const pos = arr.indexOf(colorIndex);
    if (pos >= 0) {
      arr.splice(pos, 1);
    } else {
      if (arr.length >= 5) return; // max 5 colors
      arr.push(colorIndex);
    }
    this.renderAll();

    // Restart effect if running
    if (section === 'gradual' && this.customFadeRunning) {
      this.stopCustomFade();
      this.startCustomFade();
    }
    if (section === 'strobe' && this.customStrobeRunning) {
      this.stopCustomStrobe();
      this.startCustomStrobe();
    }
  },

  bindSpeedSlider() {
    const slider = document.getElementById('effect-speed-slider');
    const label = document.getElementById('effect-speed-val');
    if (!slider) return;

    slider.addEventListener('input', (e) => {
      this.speed = parseInt(e.target.value);
      label.textContent = this.speed;

      // Update running effects
      if (this.customFadeRunning) {
        this.stopCustomFade();
        this.startCustomFade();
      } else if (this.customStrobeRunning) {
        this.stopCustomStrobe();
        this.startCustomStrobe();
      } else if (this.activeMode !== null && typeof BLE !== 'undefined' && BLE.sendEffect) {
        BLE.sendEffect(this.activeMode, { speed: this.speed });
      }
    });
  },

  // ======= Custom Gradual Fade =======
  startCustomFade() {
    const colors = this.gradualSelected.map(i => this.colorPalette[i]);
    if (colors.length < 2) return;

    this.stopAll();
    this.customFadeRunning = true;
    const btn = document.getElementById('gradual-start-btn');
    if (btn) { btn.textContent = 'Stop Fade'; btn.classList.add('running'); }

    const rgbColors = colors.map(c => ({
      r: parseInt(c.hex.slice(1, 3), 16),
      g: parseInt(c.hex.slice(3, 5), 16),
      b: parseInt(c.hex.slice(5, 7), 16)
    }));

    // Speed slider: 1=fastest fade, 10=slowest fade
    // Logarithmic: 1->15ms/step, 10->150ms/step
    const steps = 40;
    const interval = Math.round(15 * Math.pow(1.28, this.speed - 1));
    let step = 0;
    const totalSteps = steps * rgbColors.length;

    const tick = () => {
      const pairIndex = Math.floor(step / steps) % rgbColors.length;
      const nextIndex = (pairIndex + 1) % rgbColors.length;
      const t = (step % steps) / steps;

      const c1 = rgbColors[pairIndex];
      const c2 = rgbColors[nextIndex];
      const r = Math.round(c1.r + (c2.r - c1.r) * t);
      const g = Math.round(c1.g + (c2.g - c1.g) * t);
      const b = Math.round(c1.b + (c2.b - c1.b) * t);

      if (typeof BLE !== 'undefined' && BLE.sendColor) {
        BLE.sendColor('all', r, g, b, 100);
      }

      step = (step + 1) % totalSteps;
      this.customFadeTimer = setTimeout(tick, interval);
    };
    tick();
  },

  stopCustomFade() {
    this.customFadeRunning = false;
    clearTimeout(this.customFadeTimer);
    this.customFadeTimer = null;
    const btn = document.getElementById('gradual-start-btn');
    if (btn) { btn.textContent = 'Start Fade'; btn.classList.remove('running'); }
  },

  // ======= Custom Strobe =======
  startCustomStrobe() {
    const colors = this.strobeSelected.map(i => this.colorPalette[i]);
    if (colors.length < 1) return;

    this.stopAll();
    this.customStrobeRunning = true;
    const btn = document.getElementById('strobe-start-btn');
    if (btn) { btn.textContent = 'Stop Strobe'; btn.classList.add('running'); }

    const rgbColors = colors.map(c => ({
      r: parseInt(c.hex.slice(1, 3), 16),
      g: parseInt(c.hex.slice(3, 5), 16),
      b: parseInt(c.hex.slice(5, 7), 16)
    }));

    let colorIndex = 0;
    let isOn = true;

    // Speed slider: 1=fastest (50ms), 10=slowest (1000ms)
    // Logarithmic scale: feels natural
    const getInterval = () => {
      // 1->50ms, 2->70ms, 3->100ms, 5->200ms, 7->400ms, 10->1000ms
      return Math.round(50 * Math.pow(1.35, this.speed - 1));
    };

    const tick = () => {
      const c = rgbColors[colorIndex];
      if (typeof BLE !== 'undefined' && BLE.sendColor) {
        BLE.sendColor('all', c.r, c.g, c.b, 100);
      }
      // Quick off-flash (half the interval, minimum 30ms)
      const onTime = Math.max(30, Math.round(getInterval() * 0.5));
      setTimeout(() => {
        if (!this.customStrobeRunning) return;
        if (typeof BLE !== 'undefined' && BLE.sendColor) {
          BLE.sendColor('all', 0, 0, 0, 100);
        }
      }, onTime);
      colorIndex = (colorIndex + 1) % rgbColors.length;
      this.customStrobeTimer = setTimeout(tick, getInterval());
    };
    tick();
  },

  stopCustomStrobe() {
    this.customStrobeRunning = false;
    clearTimeout(this.customStrobeTimer);
    this.customStrobeTimer = null;
    const btn = document.getElementById('strobe-start-btn');
    if (btn) { btn.textContent = 'Start Strobe'; btn.classList.remove('running'); }
  },

  // ======= Stop All =======
  stopAll() {
    this.stopCustomFade();
    this.stopCustomStrobe();
    this.activeMode = null;
    document.querySelectorAll('.effect-card').forEach(c => c.classList.remove('active'));
  },

  goStatic() {
    this.stopAll();
    if (typeof ColorsTab !== 'undefined' && ColorsTab.sendCurrentColor) {
      ColorsTab.sendCurrentColor();
    }
  }
};

document.addEventListener('DOMContentLoaded', () => EffectsTab.init());
