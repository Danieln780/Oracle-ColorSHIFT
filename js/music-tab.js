const MusicTab = {
  audioCtx: null,
  analyser: null,
  stream: null,
  animFrame: null,
  wakeLock: null,
  keepAliveInterval: null,
  isListening: false,
  sensitivity: 50,
  mode: 'balanced',
  colorProgram: 'spectrum',  // spectrum, pulse, party, fire, ice, custom
  customColor1: '#ff0000',
  customColor2: '#0000ff',
  reactMode: 'smooth',  // smooth, snap, strobe
  lastSendTime: 0,
  sendInterval: 50, // ms between BLE sends (throttle)

  // Color programs define how audio maps to color
  programs: {
    spectrum: {
      name: 'Spectrum',
      desc: 'Bass=Red, Mid=Green, Treble=Blue',
      compute(bass, mid, treble) {
        return { r: bass, g: Math.round(mid * 0.8), b: treble };
      }
    },
    pulse: {
      name: 'Pulse',
      desc: 'Single color, brightness follows volume',
      color: '#ff6b00',
      compute(bass, mid, treble) {
        const vol = (bass + mid + treble) / 3;
        const hex = MusicTab.programs.pulse.color;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        const scale = vol / 255;
        return { r: Math.round(r * scale), g: Math.round(g * scale), b: Math.round(b * scale) };
      }
    },
    party: {
      name: 'Party',
      desc: 'Rapid color cycling on beat',
      hue: 0,
      compute(bass, mid, treble) {
        const vol = (bass + mid + treble) / 3;
        // Shift hue faster when louder
        MusicTab.programs.party.hue = (MusicTab.programs.party.hue + vol / 20) % 360;
        const h = MusicTab.programs.party.hue;
        return hslToRgb(h, 100, 50);
      }
    },
    fire: {
      name: 'Fire',
      desc: 'Red/orange/yellow, bass drives intensity',
      compute(bass, mid, treble) {
        const intensity = Math.min(255, bass * 1.2);
        return {
          r: Math.round(intensity),
          g: Math.round(intensity * 0.35),
          b: 0
        };
      }
    },
    ice: {
      name: 'Ice',
      desc: 'Blue/cyan/white, treble drives intensity',
      compute(bass, mid, treble) {
        const intensity = Math.min(255, treble * 1.2);
        return {
          r: Math.round(intensity * 0.2),
          g: Math.round(intensity * 0.6),
          b: Math.round(intensity)
        };
      }
    },
    dj: {
      name: 'DJ',
      desc: 'Auto-cycles effects: fade, strobe, sweep, pulse',
      phase: 0,          // current effect phase
      phaseTimer: 0,     // frames in current phase
      phaseDuration: 180, // frames before auto-switch (~3 sec at 60fps)
      lastBigBeat: 0,
      hue: 0,
      strobeOn: true,
      // Color palettes to cycle through
      palettes: [
        ['#ff0000', '#0000ff'],           // red/blue
        ['#ff6b00', '#aa00ff'],           // orange/purple
        ['#00ff00', '#ff0066'],           // green/pink
        ['#00ccff', '#ffff00'],           // cyan/yellow
        ['#ff0000', '#ffff00', '#00ff00'], // traffic
        ['#aa00ff', '#00ffff', '#ff00aa'], // neon
      ],
      currentPalette: 0,
      phases: [
        // Phase 0: Smooth hue sweep driven by volume
        function(bass, mid, treble) {
          const vol = (bass + mid + treble) / 3;
          const dj = MusicTab.programs.dj;
          dj.hue = (dj.hue + 1 + vol / 30) % 360;
          return hslToRgb(dj.hue, 100, Math.max(20, Math.min(50, vol / 5)));
        },
        // Phase 1: Strobe between palette colors on beat
        function(bass, mid, treble) {
          const vol = (bass + mid + treble) / 3;
          const dj = MusicTab.programs.dj;
          const pal = dj.palettes[dj.currentPalette % dj.palettes.length];
          if (vol > 50) {
            dj.strobeOn = !dj.strobeOn;
          }
          const idx = dj.strobeOn ? 0 : (pal.length > 1 ? 1 : 0);
          const c = hexToRgb(pal[idx]);
          const bright = Math.min(1, vol / 150);
          return { r: Math.round(c.r * bright), g: Math.round(c.g * bright), b: Math.round(c.b * bright) };
        },
        // Phase 2: Bass pulse — single color throbs with bass
        function(bass, mid, treble) {
          const dj = MusicTab.programs.dj;
          const pal = dj.palettes[dj.currentPalette % dj.palettes.length];
          const c = hexToRgb(pal[0]);
          const scale = Math.min(1, bass / 180);
          return { r: Math.round(c.r * scale), g: Math.round(c.g * scale), b: Math.round(c.b * scale) };
        },
        // Phase 3: Color fade between palette colors
        function(bass, mid, treble) {
          const dj = MusicTab.programs.dj;
          const pal = dj.palettes[dj.currentPalette % dj.palettes.length];
          const t = (dj.phaseTimer % 120) / 120; // fade over ~2 sec
          const idx1 = Math.floor(t * pal.length) % pal.length;
          const idx2 = (idx1 + 1) % pal.length;
          const localT = (t * pal.length) % 1;
          const c1 = hexToRgb(pal[idx1]);
          const c2 = hexToRgb(pal[idx2]);
          const vol = Math.max(0.3, Math.min(1, (bass + mid + treble) / 3 / 200));
          return {
            r: Math.round((c1.r + (c2.r - c1.r) * localT) * vol),
            g: Math.round((c1.g + (c2.g - c1.g) * localT) * vol),
            b: Math.round((c1.b + (c2.b - c1.b) * localT) * vol)
          };
        },
        // Phase 4: Rapid random color on every beat
        function(bass, mid, treble) {
          const vol = (bass + mid + treble) / 3;
          if (vol > 60) {
            return hslToRgb(Math.random() * 360, 100, 50);
          }
          return { r: 15, g: 5, b: 20 }; // dim purple baseline
        }
      ],
      compute(bass, mid, treble) {
        const dj = MusicTab.programs.dj;
        dj.phaseTimer++;
        const vol = (bass + mid + treble) / 3;

        // Switch phase on big beat drop or after duration
        const isBigBeat = vol > 120 && (dj.phaseTimer - dj.lastBigBeat) > 60;
        if (isBigBeat || dj.phaseTimer >= dj.phaseDuration) {
          if (isBigBeat) dj.lastBigBeat = dj.phaseTimer;
          dj.phase = (dj.phase + 1) % dj.phases.length;
          dj.phaseTimer = 0;
          // Cycle palette every 2 phase changes
          if (dj.phase % 2 === 0) {
            dj.currentPalette = (dj.currentPalette + 1) % dj.palettes.length;
          }
        }

        return dj.phases[dj.phase](bass, mid, treble);
      }
    },
    custom: {
      name: 'Custom',
      desc: 'Blend between two colors based on volume',
      compute(bass, mid, treble) {
        const vol = Math.min(1, ((bass + mid + treble) / 3) / 200);
        const c1 = hexToRgb(MusicTab.customColor1);
        const c2 = hexToRgb(MusicTab.customColor2);
        return {
          r: Math.round(c1.r + (c2.r - c1.r) * vol),
          g: Math.round(c1.g + (c2.g - c1.g) * vol),
          b: Math.round(c1.b + (c2.b - c1.b) * vol)
        };
      }
    }
  },

  init() {
    document.getElementById('music-start-btn').addEventListener('click', () => {
      if (this.isListening) this.stop(); else this.start();
    });

    document.getElementById('sensitivity-slider').addEventListener('input', (e) => {
      this.sensitivity = parseInt(e.target.value);
    });

    // Mode buttons (balanced/bass/treble)
    document.querySelectorAll('#tab-music .mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#tab-music .mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.mode = btn.dataset.mode;
      });
    });

    // Color program buttons
    document.querySelectorAll('#tab-music .program-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('#tab-music .program-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.colorProgram = btn.dataset.program;
        console.log('[Music] Color program:', this.colorProgram);
        // Show/hide custom color pickers
        const customRow = document.getElementById('custom-color-row');
        if (customRow) customRow.style.display = this.colorProgram === 'custom' ? 'flex' : 'none';
        // Show/hide pulse color picker
        const pulseRow = document.getElementById('pulse-color-row');
        if (pulseRow) pulseRow.style.display = this.colorProgram === 'pulse' ? 'flex' : 'none';
      });
    });

    // React mode buttons
    document.querySelectorAll('#tab-music .react-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('#tab-music .react-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.reactMode = btn.dataset.react;
        console.log('[Music] React mode:', this.reactMode);
      });
    });

    // Custom color pickers
    document.getElementById('custom-color-1')?.addEventListener('input', (e) => {
      this.customColor1 = e.target.value;
    });
    document.getElementById('custom-color-2')?.addEventListener('input', (e) => {
      this.customColor2 = e.target.value;
    });

    // Pulse color picker
    document.getElementById('pulse-color')?.addEventListener('input', (e) => {
      this.programs.pulse.color = e.target.value;
    });
  },

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.audioCtx = new AudioContext();
    const source = this.audioCtx.createMediaStreamSource(this.stream);
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 256;
    source.connect(this.analyser);

    this.isListening = true;
    document.getElementById('music-start-btn').textContent = 'Stop Listening';
    document.getElementById('music-start-btn').classList.add('active-btn');
    const toggleBtn = document.getElementById('music-toggle-btn');
    if (toggleBtn) { toggleBtn.classList.remove('off'); toggleBtn.classList.add('on'); }

    // Request wake lock to prevent screen from locking
    try {
      if ('wakeLock' in navigator) {
        this.wakeLock = await navigator.wakeLock.request('screen');
        console.log('[Music] Wake lock acquired — screen will stay on');
        // Re-acquire wake lock if page becomes visible again (e.g. after switching apps)
        document.addEventListener('visibilitychange', this._handleVisibility = async () => {
          if (document.visibilityState === 'visible' && this.isListening && !this.wakeLock) {
            try {
              this.wakeLock = await navigator.wakeLock.request('screen');
              console.log('[Music] Wake lock re-acquired');
            } catch (e) {}
          }
        });
      }
    } catch (e) {
      console.log('[Music] Wake lock not available:', e.message);
    }

    // Keep-alive: play silent audio to prevent browser from suspending in background
    // This works on Android Chrome — iOS will still suspend
    try {
      const silentOsc = this.audioCtx.createOscillator();
      const silentGain = this.audioCtx.createGain();
      silentGain.gain.value = 0.001; // nearly silent
      silentOsc.connect(silentGain);
      silentGain.connect(this.audioCtx.destination);
      silentOsc.start();
      this._silentOsc = silentOsc;
      console.log('[Music] Background keep-alive started');
    } catch (e) {
      console.log('[Music] Keep-alive not available:', e.message);
    }

    // Also use setInterval as a backup to keep processing alive
    this.keepAliveInterval = setInterval(() => {
      if (this.isListening && this.audioCtx?.state === 'suspended') {
        this.audioCtx.resume();
        console.log('[Music] Resumed suspended AudioContext');
      }
    }, 1000);

    this.draw();
  },

  stop() {
    this.isListening = false;
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    if (this.stream) this.stream.getTracks().forEach(t => t.stop());
    if (this.audioCtx) this.audioCtx.close();
    document.getElementById('music-start-btn').textContent = 'Start Listening';
    document.getElementById('music-start-btn').classList.remove('active-btn');
    const toggleBtn = document.getElementById('music-toggle-btn');
    if (toggleBtn) { toggleBtn.classList.remove('on'); toggleBtn.classList.add('off'); }

    // Release wake lock
    if (this.wakeLock) {
      this.wakeLock.release();
      this.wakeLock = null;
      console.log('[Music] Wake lock released');
    }
    if (this._handleVisibility) {
      document.removeEventListener('visibilitychange', this._handleVisibility);
    }

    // Stop keep-alive
    if (this._silentOsc) {
      this._silentOsc.stop();
      this._silentOsc = null;
    }
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  },

  draw() {
    if (!this.isListening) return;
    const canvas = document.getElementById('audio-visualizer');
    const ctx = canvas.getContext('2d');
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);

    // Draw visualizer bars
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const barWidth = canvas.width / bufferLength;
    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArray[i] / 255) * canvas.height * (this.sensitivity / 50);
      const hue = (i / bufferLength) * 280;
      ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
      ctx.fillRect(i * barWidth, canvas.height - barHeight, barWidth - 1, barHeight);
    }

    // Compute frequency bands
    const len = dataArray.length;
    const third = Math.floor(len / 3);
    let bass = 0, mid = 0, treble = 0;
    for (let i = 0; i < third; i++) bass += dataArray[i];
    for (let i = third; i < third * 2; i++) mid += dataArray[i];
    for (let i = third * 2; i < len; i++) treble += dataArray[i];
    bass /= third; mid /= third; treble /= (len - third * 2);

    // Apply mode weighting
    const scale = this.sensitivity / 50;
    if (this.mode === 'bass') { bass *= 1.5; treble *= 0.5; }
    if (this.mode === 'treble') { treble *= 1.5; bass *= 0.5; }
    bass = Math.min(255, bass * scale);
    mid = Math.min(255, mid * scale);
    treble = Math.min(255, treble * scale);

    // Get color from active program
    const program = this.programs[this.colorProgram];
    let color = program ? program.compute(bass, mid, treble) : { r: bass, g: mid, b: treble };

    // Apply react mode
    if (this.reactMode === 'snap') {
      // Quantize to nearest strong color
      color.r = color.r > 100 ? 255 : 0;
      color.g = color.g > 100 ? 255 : 0;
      color.b = color.b > 100 ? 255 : 0;
    } else if (this.reactMode === 'strobe') {
      // Beat strobe: dim baseline, bright flash on beats
      // Lower threshold = more sensitive to beats
      const vol = (bass + mid + treble) / 3;
      const threshold = 30 + (100 - this.sensitivity); // sensitivity makes it more reactive
      const dimLevel = 0.15; // 15% brightness when quiet
      if (vol < threshold) {
        // Dim glow — don't go fully dark
        color.r = Math.round(color.r * dimLevel);
        color.g = Math.round(color.g * dimLevel);
        color.b = Math.round(color.b * dimLevel);
      } else {
        // Beat hit — boost to full brightness
        const boost = Math.min(2.0, 1.0 + (vol - threshold) / 100);
        color.r = Math.min(255, Math.round(color.r * boost));
        color.g = Math.min(255, Math.round(color.g * boost));
        color.b = Math.min(255, Math.round(color.b * boost));
      }
    }

    // Clamp
    color.r = Math.max(0, Math.min(255, Math.round(color.r)));
    color.g = Math.max(0, Math.min(255, Math.round(color.g)));
    color.b = Math.max(0, Math.min(255, Math.round(color.b)));

    // Update indicator
    document.getElementById('music-color-indicator').style.backgroundColor =
      `rgb(${color.r},${color.g},${color.b})`;

    // Throttled BLE send
    const now = Date.now();
    if (now - this.lastSendTime >= this.sendInterval) {
      if (typeof BLE !== 'undefined' && BLE.sendColor && BLE.isConnected()) {
        BLE.sendColor('all', color.r, color.g, color.b, 100);
      }
      this.lastSendTime = now;
    }

    this.animFrame = requestAnimationFrame(() => this.draw());
  }
};

// Helpers
function hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  };
}

function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16)
  };
}

document.addEventListener('DOMContentLoaded', () => MusicTab.init());
