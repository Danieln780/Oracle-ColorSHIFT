const MusicTab = {
  audioCtx: null,
  analyser: null,
  stream: null,
  animFrame: null,
  wakeLock: null,
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

    // Request wake lock to prevent screen from locking
    try {
      if ('wakeLock' in navigator) {
        this.wakeLock = await navigator.wakeLock.request('screen');
        console.log('[Music] Wake lock acquired — screen will stay on');
      }
    } catch (e) {
      console.log('[Music] Wake lock not available:', e.message);
    }

    this.draw();
  },

  stop() {
    this.isListening = false;
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    if (this.stream) this.stream.getTracks().forEach(t => t.stop());
    if (this.audioCtx) this.audioCtx.close();
    document.getElementById('music-start-btn').textContent = 'Start Listening';
    document.getElementById('music-start-btn').classList.remove('active-btn');

    // Release wake lock
    if (this.wakeLock) {
      this.wakeLock.release();
      this.wakeLock = null;
      console.log('[Music] Wake lock released');
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
      color.r = color.r > 128 ? 255 : 0;
      color.g = color.g > 128 ? 255 : 0;
      color.b = color.b > 128 ? 255 : 0;
    } else if (this.reactMode === 'strobe') {
      // Only show color on beats (when volume spikes)
      const vol = (bass + mid + treble) / 3;
      if (vol < 80) {
        color = { r: 0, g: 0, b: 0 };
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
