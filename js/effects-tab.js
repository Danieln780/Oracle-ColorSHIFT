const EffectsTab = {
  activeMode: null,
  sequencerSteps: [],
  previewInterval: null,

  // All 20 Triones built-in modes grouped by category
  modeGroups: [
    {
      label: 'Fades',
      modes: [
        { code: 0x25, name: 'Rainbow Fade', icon: 'R', iconClass: 'rainbow-icon' },
        { code: 0x2D, name: 'Red/Green', icon: '~' },
        { code: 0x2E, name: 'Red/Blue', icon: '~' },
        { code: 0x2F, name: 'Green/Blue', icon: '~' }
      ]
    },
    {
      label: 'Graduals',
      modes: [
        { code: 0x26, name: 'Red Pulse', icon: 'O', color: '#ff0000' },
        { code: 0x27, name: 'Green Pulse', icon: 'O', color: '#00ff00' },
        { code: 0x28, name: 'Blue Pulse', icon: 'O', color: '#0066ff' },
        { code: 0x29, name: 'Yellow Pulse', icon: 'O', color: '#ffff00' },
        { code: 0x2A, name: 'Cyan Pulse', icon: 'O', color: '#00ffff' },
        { code: 0x2B, name: 'Purple Pulse', icon: 'O', color: '#aa00ff' },
        { code: 0x2C, name: 'White Pulse', icon: 'O', color: '#ffffff' }
      ]
    },
    {
      label: 'Strobes',
      modes: [
        { code: 0x30, name: 'Rainbow Strobe', icon: '!', iconClass: 'rainbow-icon' },
        { code: 0x31, name: 'Red Strobe', icon: '!', color: '#ff0000' },
        { code: 0x32, name: 'Green Strobe', icon: '!', color: '#00ff00' },
        { code: 0x33, name: 'Blue Strobe', icon: '!', color: '#0066ff' },
        { code: 0x34, name: 'Yellow Strobe', icon: '!', color: '#ffff00' },
        { code: 0x35, name: 'Cyan Strobe', icon: '!', color: '#00ffff' },
        { code: 0x36, name: 'Purple Strobe', icon: '!', color: '#aa00ff' },
        { code: 0x37, name: 'White Strobe', icon: '!', color: '#ffffff' }
      ]
    },
    {
      label: 'Jumps',
      modes: [
        { code: 0x38, name: 'Rainbow Jump', icon: '>', iconClass: 'rainbow-icon' }
      ]
    }
  ],

  speed: 5, // 1-10 slider value

  init() {
    this.renderModes();
    this.bindSpeedSlider();
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

    // Bind click events
    container.querySelectorAll('.effect-card').forEach(card => {
      card.addEventListener('click', () => {
        const mode = parseInt(card.dataset.mode);
        this.selectMode(mode, card);
      });
    });
  },

  selectMode(modeCode, cardElement) {
    this.activeMode = modeCode;

    // Update card highlights
    document.querySelectorAll('.effect-card').forEach(c => c.classList.remove('active'));
    if (cardElement) cardElement.classList.add('active');

    // Send effect command immediately
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

      // Re-send current effect at new speed
      if (this.activeMode !== null && typeof BLE !== 'undefined' && BLE.sendEffect) {
        BLE.sendEffect(this.activeMode, { speed: this.speed });
      }
    });
  },

  // Static color button — returns to solid color mode (exits effects)
  goStatic() {
    // Send current color to exit effect mode
    if (typeof ColorsTab !== 'undefined' && ColorsTab.sendCurrentColor) {
      ColorsTab.sendCurrentColor();
    }
    this.activeMode = null;
    document.querySelectorAll('.effect-card').forEach(c => c.classList.remove('active'));
  },

  // Sequencer
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
    let i = 0;
    const indicator = document.getElementById('seq-preview-indicator');
    const runStep = () => {
      if (this.sequencerSteps.length === 0) { this.stopPreview(); return; }
      const stepIndex = i % this.sequencerSteps.length;
      const step = this.sequencerSteps[stepIndex];
      indicator.style.backgroundColor = step.color;

      // Send color to BLE
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
