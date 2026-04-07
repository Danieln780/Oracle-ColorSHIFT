const EffectsTab = {
  activeMode: null,
  customFadeColors: ['#ff0000', '#0000ff'],
  customFadeRunning: false,
  customFadeTimer: null,
  sequencerSteps: [],
  previewInterval: null,
  speed: 5, // 1(slow)-10(fast)

  // Triones built-in modes grouped by category
  modeGroups: [
    {
      label: 'Fades',
      modes: [
        { code: 0x25, name: 'Rainbow', icon: 'R', iconClass: 'rainbow-icon' },
        { code: 0x2D, name: 'Red/Green', icon: '~' },
        { code: 0x2E, name: 'Red/Blue', icon: '~' },
        { code: 0x2F, name: 'Green/Blue', icon: '~' }
      ]
    },
    {
      label: 'Strobes',
      modes: [
        { code: 0x30, name: 'Rainbow', icon: '!', iconClass: 'rainbow-icon' },
        { code: 0x31, name: 'Red', icon: '!', color: '#ff0000' },
        { code: 0x32, name: 'Green', icon: '!', color: '#00ff00' },
        { code: 0x33, name: 'Blue', icon: '!', color: '#0066ff' },
        { code: 0x34, name: 'Yellow', icon: '!', color: '#ffff00' },
        { code: 0x35, name: 'Cyan', icon: '!', color: '#00ffff' },
        { code: 0x36, name: 'Purple', icon: '!', color: '#aa00ff' },
        { code: 0x37, name: 'White', icon: '!', color: '#ffffff' }
      ]
    },
    {
      label: 'Other',
      modes: [
        { code: 0x38, name: 'Jump', icon: '>', iconClass: 'rainbow-icon' },
        { code: 0x2C, name: 'White Pulse', icon: 'O', color: '#ffffff' }
      ]
    }
  ],

  init() {
    this.renderModes();
    this.bindSpeedSlider();
    this.bindCustomFade();
    this.bindSequencer();
  },

  renderModes() {
    const container = document.querySelector('#tab-effects .effect-modes');
    if (!container) return;

    let html = '';
    this.modeGroups.forEach(group => {
      html += `<div class="effect-group-label">${group.label}</div>`;
      html += '<div class="effect-grid">';
      group.modes.forEach(mode => {
        const colorStyle = mode.color ? `color:${mode.color}` : '';
        const iconClass = mode.iconClass || '';
        html += `<button class="effect-card" data-mode="${mode.code}">
          <span class="effect-icon ${iconClass}" style="${colorStyle}">${mode.icon}</span>
          <span class="effect-label">${mode.name}</span>
        </button>`;
      });
      html += '</div>';
    });

    container.innerHTML = html;

    container.querySelectorAll('.effect-card').forEach(card => {
      card.addEventListener('click', () => {
        const mode = parseInt(card.dataset.mode);
        this.stopCustomFade();
        this.selectMode(mode, card);
      });
    });
  },

  selectMode(modeCode, cardElement) {
    this.activeMode = modeCode;
    document.querySelectorAll('.effect-card').forEach(c => c.classList.remove('active'));
    if (cardElement) cardElement.classList.add('active');
    document.getElementById('custom-fade-btn')?.classList.remove('active');

    if (typeof BLE !== 'undefined' && BLE.sendEffect) {
      BLE.sendEffect(modeCode, { speed: this.speed });
    }
  },

  bindSpeedSlider() {
    const slider = document.getElementById('effect-speed-slider');
    const label = document.getElementById('effect-speed-val');
    if (!slider) return;

    slider.addEventListener('input', (e) => {
      this.speed = parseInt(e.target.value);
      label.textContent = this.speed;

      // Re-send current effect at new speed, or update custom fade interval
      if (this.customFadeRunning) {
        this.stopCustomFade();
        this.startCustomFade();
      } else if (this.activeMode !== null && typeof BLE !== 'undefined' && BLE.sendEffect) {
        BLE.sendEffect(this.activeMode, { speed: this.speed });
      }
    });
  },

  // ======= Custom Color Fade =======
  // User picks 2-3 colors, app smoothly fades between them by sending rapid color commands

  bindCustomFade() {
    document.getElementById('custom-fade-btn')?.addEventListener('click', () => {
      if (this.customFadeRunning) {
        this.stopCustomFade();
      } else {
        this.startCustomFade();
      }
    });

    document.getElementById('cf-add-color')?.addEventListener('click', () => {
      if (this.customFadeColors.length < 5) {
        this.customFadeColors.push('#ffffff');
        this.renderCustomFadeColors();
      }
    });

    this.renderCustomFadeColors();
  },

  renderCustomFadeColors() {
    const container = document.getElementById('cf-color-list');
    if (!container) return;

    container.innerHTML = this.customFadeColors.map((c, i) => {
      const canRemove = this.customFadeColors.length > 2;
      return `<div class="cf-color-item">
        <input type="color" value="${c}" data-index="${i}" class="cf-color-input">
        ${canRemove ? `<button class="cf-remove-btn" data-index="${i}">&times;</button>` : ''}
      </div>`;
    }).join('');

    container.querySelectorAll('.cf-color-input').forEach(input => {
      input.addEventListener('input', (e) => {
        this.customFadeColors[parseInt(e.target.dataset.index)] = e.target.value;
        // Restart fade if running to pick up new colors
        if (this.customFadeRunning) {
          this.stopCustomFade();
          this.startCustomFade();
        }
      });
    });

    container.querySelectorAll('.cf-remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.customFadeColors.splice(parseInt(e.target.dataset.index), 1);
        this.renderCustomFadeColors();
        if (this.customFadeRunning) {
          this.stopCustomFade();
          this.startCustomFade();
        }
      });
    });
  },

  startCustomFade() {
    if (this.customFadeColors.length < 2) return;

    this.customFadeRunning = true;
    this.activeMode = null;
    document.querySelectorAll('.effect-card').forEach(c => c.classList.remove('active'));
    const btn = document.getElementById('custom-fade-btn');
    if (btn) {
      btn.classList.add('active');
      btn.textContent = 'Stop Fade';
    }

    const colors = this.customFadeColors.map(hex => ({
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16)
    }));

    // Speed 1-10: interval per step in ms
    // Speed 1 = 100ms per step (slow), Speed 10 = 10ms per step (fast)
    // Total fade time between colors = steps * interval
    const steps = 50; // interpolation steps between each color pair
    const interval = Math.max(10, Math.round(110 - (this.speed * 10))); // 10=100ms, 1=10ms
    let step = 0;
    const totalSteps = steps * colors.length;

    const tick = () => {
      const pairIndex = Math.floor(step / steps) % colors.length;
      const nextIndex = (pairIndex + 1) % colors.length;
      const t = (step % steps) / steps;

      const c1 = colors[pairIndex];
      const c2 = colors[nextIndex];
      const r = Math.round(c1.r + (c2.r - c1.r) * t);
      const g = Math.round(c1.g + (c2.g - c1.g) * t);
      const b = Math.round(c1.b + (c2.b - c1.b) * t);

      if (typeof BLE !== 'undefined' && BLE.sendColor) {
        BLE.sendColor('all', r, g, b, 100);
      }

      // Update preview indicator
      const indicator = document.getElementById('cf-preview');
      if (indicator) {
        indicator.style.backgroundColor = `rgb(${r},${g},${b})`;
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
    const btn = document.getElementById('custom-fade-btn');
    if (btn) {
      btn.classList.remove('active');
      btn.textContent = 'Start Fade';
    }
  },

  // Static color button
  goStatic() {
    this.stopCustomFade();
    if (typeof ColorsTab !== 'undefined' && ColorsTab.sendCurrentColor) {
      ColorsTab.sendCurrentColor();
    }
    this.activeMode = null;
    document.querySelectorAll('.effect-card').forEach(c => c.classList.remove('active'));
  },

  // ======= Custom Sequencer =======
  bindSequencer() {
    document.getElementById('seq-add-btn')?.addEventListener('click', () => this.addStep());
    document.getElementById('seq-preview-btn')?.addEventListener('click', () => this.preview());
    document.getElementById('seq-stop-btn')?.addEventListener('click', () => this.stopPreview());
  },

  addStep() {
    this.sequencerSteps.push({ color: '#ff6b00', duration: 500 });
    this.renderStepList();
  },

  removeStep(index) {
    this.sequencerSteps.splice(index, 1);
    this.renderStepList();
  },

  renderStepList() {
    const container = document.getElementById('seq-steps');
    if (!container) return;
    container.innerHTML = this.sequencerSteps.map((step, i) => {
      return `<div class="seq-step" data-index="${i}">
        <input type="color" value="${step.color}" data-index="${i}" class="seq-color-input">
        <input type="number" value="${step.duration}" min="50" max="5000" step="50" data-index="${i}" class="seq-duration-input">
        <span class="seq-unit">ms</span>
        <button class="remove-step-btn" data-index="${i}">&times;</button>
      </div>`;
    }).join('');

    container.querySelectorAll('.seq-color-input').forEach(input => {
      input.addEventListener('input', (e) => {
        this.sequencerSteps[parseInt(e.target.dataset.index)].color = e.target.value;
      });
    });
    container.querySelectorAll('.seq-duration-input').forEach(input => {
      input.addEventListener('change', (e) => {
        this.sequencerSteps[parseInt(e.target.dataset.index)].duration = Math.max(50, parseInt(e.target.value) || 50);
      });
    });
    container.querySelectorAll('.remove-step-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.removeStep(parseInt(e.target.dataset.index));
      });
    });
  },

  preview() {
    if (this.previewInterval) this.stopPreview();
    if (this.sequencerSteps.length === 0) return;
    this.stopCustomFade();
    let i = 0;
    const indicator = document.getElementById('seq-preview-indicator');
    const runStep = () => {
      if (this.sequencerSteps.length === 0) { this.stopPreview(); return; }
      const stepIndex = i % this.sequencerSteps.length;
      const step = this.sequencerSteps[stepIndex];
      indicator.style.backgroundColor = step.color;

      const hex = step.color;
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      if (typeof BLE !== 'undefined' && BLE.sendColor) {
        BLE.sendColor('all', r, g, b, 100);
      }

      document.querySelectorAll('.seq-step').forEach((el, idx) => {
        el.classList.toggle('active', idx === stepIndex);
      });
      i++;
      this.previewInterval = setTimeout(runStep, step.duration);
    };
    runStep();
  },

  stopPreview() {
    clearTimeout(this.previewInterval);
    this.previewInterval = null;
    const indicator = document.getElementById('seq-preview-indicator');
    if (indicator) indicator.style.backgroundColor = '#333';
    document.querySelectorAll('.seq-step').forEach(el => el.classList.remove('active'));
  }
};

document.addEventListener('DOMContentLoaded', () => EffectsTab.init());
