const MusicTab = {
  audioCtx: null,
  analyser: null,
  stream: null,
  animFrame: null,
  isListening: false,
  sensitivity: 50,
  mode: 'balanced', // 'balanced', 'bass', 'treble'

  init() {
    document.getElementById('music-start-btn').addEventListener('click', () => {
      if (this.isListening) this.stop(); else this.start();
    });

    document.getElementById('sensitivity-slider').addEventListener('input', (e) => {
      this.sensitivity = parseInt(e.target.value);
    });

    document.querySelectorAll('#tab-music .mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#tab-music .mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.mode = btn.dataset.mode;
      });
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
    this.draw();
  },

  stop() {
    this.isListening = false;
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    if (this.stream) this.stream.getTracks().forEach(t => t.stop());
    if (this.audioCtx) this.audioCtx.close();
    document.getElementById('music-start-btn').textContent = 'Start Listening';
    document.getElementById('music-start-btn').classList.remove('active-btn');
  },

  draw() {
    if (!this.isListening) return;
    const canvas = document.getElementById('audio-visualizer');
    const ctx = canvas.getContext('2d');
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const barWidth = canvas.width / bufferLength;
    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArray[i] / 255) * canvas.height * (this.sensitivity / 50);
      // Color bars based on frequency: bass=red/orange, mid=green/cyan, treble=blue/purple
      const hue = (i / bufferLength) * 280; // red(0) through purple(280)
      ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
      ctx.fillRect(i * barWidth, canvas.height - barHeight, barWidth - 1, barHeight);
    }

    // Compute dominant color from frequency data based on mode
    const color = this.computeColor(dataArray);
    document.getElementById('music-color-indicator').style.backgroundColor =
      `rgb(${color.r},${color.g},${color.b})`;

    // Send to BLE if connected
    if (typeof BLE !== 'undefined' && BLE.sendColor && BLE.isConnected()) {
      BLE.sendColor('outer', color.r, color.g, color.b, 100);
      BLE.sendColor('inner', color.r, color.g, color.b, 100);
      BLE.sendColor('demon', color.r, color.g, color.b, 100);
    }

    this.animFrame = requestAnimationFrame(() => this.draw());
  },

  computeColor(dataArray) {
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

    const r = Math.min(255, Math.round(bass * scale));
    const g = Math.min(255, Math.round(mid * scale * 0.8));
    const b = Math.min(255, Math.round(treble * scale));
    return { r, g, b };
  }
};

document.addEventListener('DOMContentLoaded', () => MusicTab.init());
