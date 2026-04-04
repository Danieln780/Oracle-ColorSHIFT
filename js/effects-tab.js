const EffectsTab = {
  activeMode: null,
  sequencerSteps: [],
  previewInterval: null,

  modes: {
    fade: {
      label: 'Fade',
      icon: '~',
      defaults: { colors: ['#ff6b00', '#0066ff'], speed: 3 },
      renderControls() {
        const data = EffectsTab._getModeData('fade', { colors: [...this.defaults.colors], speed: this.defaults.speed });
        let html = '<div class="effect-control-group">';
        html += '<label class="effect-control-label">Colors</label>';
        html += '<div id="fade-color-list">';
        data.colors.forEach((c, i) => {
          html += `<div class="color-list-item">
            <input type="color" value="${c}" data-index="${i}" class="fade-color-input">
            <span class="color-hex">${c}</span>
            ${data.colors.length > 2 ? `<button class="remove-color-btn" data-index="${i}">&times;</button>` : ''}
          </div>`;
        });
        html += '</div>';
        html += '<button class="add-color-btn" id="fade-add-color">+ Add Color</button>';
        html += '<div class="slider-row" style="margin-top:12px">';
        html += '<label>Speed</label>';
        html += `<input type="range" id="fade-speed" min="0.5" max="10" step="0.5" value="${data.speed}">`;
        html += `<span id="fade-speed-val">${data.speed}s</span>`;
        html += '</div>';
        html += '</div>';
        return html;
      },
      bindEvents() {
        const data = EffectsTab._getModeData('fade');
        document.querySelectorAll('.fade-color-input').forEach(input => {
          input.addEventListener('input', (e) => {
            const idx = parseInt(e.target.dataset.index);
            data.colors[idx] = e.target.value;
            e.target.nextElementSibling.textContent = e.target.value;
          });
        });
        document.querySelectorAll('#fade-color-list .remove-color-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            data.colors.splice(parseInt(e.target.dataset.index), 1);
            EffectsTab._refreshControls();
          });
        });
        document.getElementById('fade-add-color')?.addEventListener('click', () => {
          data.colors.push('#ffffff');
          EffectsTab._refreshControls();
        });
        document.getElementById('fade-speed')?.addEventListener('input', (e) => {
          data.speed = parseFloat(e.target.value);
          document.getElementById('fade-speed-val').textContent = data.speed + 's';
        });
      }
    },
    strobe: {
      label: 'Strobe',
      icon: '!',
      defaults: { color: '#ffffff', frequency: 5 },
      renderControls() {
        const data = EffectsTab._getModeData('strobe', { color: this.defaults.color, frequency: this.defaults.frequency });
        let html = '<div class="effect-control-group">';
        html += '<label class="effect-control-label">Color</label>';
        html += `<div class="color-list-item">
          <input type="color" value="${data.color}" id="strobe-color">
          <span class="color-hex" id="strobe-color-hex">${data.color}</span>
        </div>`;
        html += '<div class="slider-row" style="margin-top:12px">';
        html += '<label>Frequency</label>';
        html += `<input type="range" id="strobe-freq" min="1" max="20" step="1" value="${data.frequency}">`;
        html += `<span id="strobe-freq-val">${data.frequency} Hz</span>`;
        html += '</div>';
        html += '</div>';
        return html;
      },
      bindEvents() {
        const data = EffectsTab._getModeData('strobe');
        document.getElementById('strobe-color')?.addEventListener('input', (e) => {
          data.color = e.target.value;
          document.getElementById('strobe-color-hex').textContent = e.target.value;
        });
        document.getElementById('strobe-freq')?.addEventListener('input', (e) => {
          data.frequency = parseInt(e.target.value);
          document.getElementById('strobe-freq-val').textContent = data.frequency + ' Hz';
        });
      }
    },
    chase: {
      label: 'Chase',
      icon: '>',
      defaults: { colors: ['#ff0000', '#00ff00', '#0000ff'], speed: 2, direction: 'forward' },
      renderControls() {
        const data = EffectsTab._getModeData('chase', { colors: [...this.defaults.colors], speed: this.defaults.speed, direction: this.defaults.direction });
        let html = '<div class="effect-control-group">';
        html += '<label class="effect-control-label">Colors</label>';
        html += '<div id="chase-color-list">';
        data.colors.forEach((c, i) => {
          html += `<div class="color-list-item">
            <input type="color" value="${c}" data-index="${i}" class="chase-color-input">
            <span class="color-hex">${c}</span>
            ${data.colors.length > 2 ? `<button class="remove-color-btn" data-index="${i}">&times;</button>` : ''}
          </div>`;
        });
        html += '</div>';
        html += '<button class="add-color-btn" id="chase-add-color">+ Add Color</button>';
        html += '<div class="slider-row" style="margin-top:12px">';
        html += '<label>Speed</label>';
        html += `<input type="range" id="chase-speed" min="0.5" max="10" step="0.5" value="${data.speed}">`;
        html += `<span id="chase-speed-val">${data.speed}s</span>`;
        html += '</div>';
        html += '<label class="effect-control-label" style="margin-top:12px">Direction</label>';
        html += '<div class="direction-toggle">';
        html += `<button class="direction-btn ${data.direction === 'forward' ? 'active' : ''}" data-dir="forward">Forward</button>`;
        html += `<button class="direction-btn ${data.direction === 'reverse' ? 'active' : ''}" data-dir="reverse">Reverse</button>`;
        html += '</div>';
        html += '</div>';
        return html;
      },
      bindEvents() {
        const data = EffectsTab._getModeData('chase');
        document.querySelectorAll('.chase-color-input').forEach(input => {
          input.addEventListener('input', (e) => {
            const idx = parseInt(e.target.dataset.index);
            data.colors[idx] = e.target.value;
            e.target.nextElementSibling.textContent = e.target.value;
          });
        });
        document.querySelectorAll('#chase-color-list .remove-color-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            data.colors.splice(parseInt(e.target.dataset.index), 1);
            EffectsTab._refreshControls();
          });
        });
        document.getElementById('chase-add-color')?.addEventListener('click', () => {
          data.colors.push('#ffffff');
          EffectsTab._refreshControls();
        });
        document.getElementById('chase-speed')?.addEventListener('input', (e) => {
          data.speed = parseFloat(e.target.value);
          document.getElementById('chase-speed-val').textContent = data.speed + 's';
        });
        document.querySelectorAll('.direction-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            data.direction = e.target.dataset.dir;
            document.querySelectorAll('.direction-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
          });
        });
      }
    },
    pulse: {
      label: 'Pulse',
      icon: 'O',
      defaults: { color: '#ff6b00', speed: 2, minBrightness: 10, maxBrightness: 100 },
      renderControls() {
        const data = EffectsTab._getModeData('pulse', { color: this.defaults.color, speed: this.defaults.speed, minBrightness: this.defaults.minBrightness, maxBrightness: this.defaults.maxBrightness });
        let html = '<div class="effect-control-group">';
        html += '<label class="effect-control-label">Color</label>';
        html += `<div class="color-list-item">
          <input type="color" value="${data.color}" id="pulse-color">
          <span class="color-hex" id="pulse-color-hex">${data.color}</span>
        </div>`;
        html += '<div class="slider-row" style="margin-top:12px">';
        html += '<label>Speed</label>';
        html += `<input type="range" id="pulse-speed" min="0.5" max="5" step="0.5" value="${data.speed}">`;
        html += `<span id="pulse-speed-val">${data.speed}s</span>`;
        html += '</div>';
        html += '<div class="slider-row">';
        html += '<label>Min Bright</label>';
        html += `<input type="range" id="pulse-min" min="0" max="50" step="5" value="${data.minBrightness}">`;
        html += `<span id="pulse-min-val">${data.minBrightness}%</span>`;
        html += '</div>';
        html += '<div class="slider-row">';
        html += '<label>Max Bright</label>';
        html += `<input type="range" id="pulse-max" min="50" max="100" step="5" value="${data.maxBrightness}">`;
        html += `<span id="pulse-max-val">${data.maxBrightness}%</span>`;
        html += '</div>';
        html += '</div>';
        return html;
      },
      bindEvents() {
        const data = EffectsTab._getModeData('pulse');
        document.getElementById('pulse-color')?.addEventListener('input', (e) => {
          data.color = e.target.value;
          document.getElementById('pulse-color-hex').textContent = e.target.value;
        });
        document.getElementById('pulse-speed')?.addEventListener('input', (e) => {
          data.speed = parseFloat(e.target.value);
          document.getElementById('pulse-speed-val').textContent = data.speed + 's';
        });
        document.getElementById('pulse-min')?.addEventListener('input', (e) => {
          data.minBrightness = parseInt(e.target.value);
          document.getElementById('pulse-min-val').textContent = data.minBrightness + '%';
        });
        document.getElementById('pulse-max')?.addEventListener('input', (e) => {
          data.maxBrightness = parseInt(e.target.value);
          document.getElementById('pulse-max-val').textContent = data.maxBrightness + '%';
        });
      }
    }
  },

  // Store per-mode user data so changes persist when switching modes
  _modeData: {},

  _getModeData(mode, defaults) {
    if (!this._modeData[mode] && defaults) {
      this._modeData[mode] = defaults;
    }
    return this._modeData[mode];
  },

  init() {
    this.bindModeCards();
    this.bindSequencer();
  },

  bindModeCards() {
    document.querySelectorAll('.effect-card').forEach(card => {
      card.addEventListener('click', () => {
        this.selectMode(card.dataset.mode);
      });
    });
  },

  selectMode(mode) {
    this.activeMode = mode;
    // Update card highlights
    document.querySelectorAll('.effect-card').forEach(c => {
      c.classList.toggle('active', c.dataset.mode === mode);
    });
    // Render controls for selected mode
    this._refreshControls();
    // Send effect command via BLE if connected
    this._sendEffect();
  },

  _refreshControls() {
    const container = document.getElementById('effect-controls');
    if (!this.activeMode || !this.modes[this.activeMode]) {
      container.innerHTML = '';
      return;
    }
    container.innerHTML = this.modes[this.activeMode].renderControls();
    this.modes[this.activeMode].bindEvents();
  },

  _sendEffect() {
    if (typeof BLE !== 'undefined' && BLE.sendEffect && BLE.isConnected()) {
      const data = this._modeData[this.activeMode];
      BLE.sendEffect(this.activeMode, data);
    }
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

    // Bind step events
    container.querySelectorAll('.seq-color-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.index);
        this.sequencerSteps[idx].color = e.target.value;
      });
    });
    container.querySelectorAll('.seq-duration-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.index);
        this.sequencerSteps[idx].duration = Math.max(50, parseInt(e.target.value) || 50);
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
      if (this.sequencerSteps.length === 0) {
        this.stopPreview();
        return;
      }
      const stepIndex = i % this.sequencerSteps.length;
      const step = this.sequencerSteps[stepIndex];
      indicator.style.backgroundColor = step.color;
      // Highlight active step
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
