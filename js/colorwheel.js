const ColorWheel = {
  canvas: null,
  ctx: null,
  size: 280,
  callback: null,
  selectedColor: { r: 255, g: 107, b: 0, hex: '#ff6b00' },

  init(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.draw();
    this.bindEvents();
  },

  draw() {
    const ctx = this.ctx;
    const cx = this.size / 2;
    const cy = this.size / 2;
    const radius = this.size / 2 - 10;

    // Draw HSL color wheel
    for (let angle = 0; angle < 360; angle++) {
      const startAngle = (angle - 1) * Math.PI / 180;
      const endAngle = (angle + 1) * Math.PI / 180;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.closePath();

      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      gradient.addColorStop(0, 'white');
      gradient.addColorStop(1, `hsl(${angle}, 100%, 50%)`);
      ctx.fillStyle = gradient;
      ctx.fill();
    }
  },

  bindEvents() {
    const handler = (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.touches ? e.touches[0] : e;
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      const cx = this.size / 2;
      const cy = this.size / 2;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const radius = this.size / 2 - 10;

      if (dist <= radius) {
        const pixel = this.ctx.getImageData(x * (this.canvas.width / rect.width), y * (this.canvas.height / rect.height), 1, 1).data;
        this.selectedColor = {
          r: pixel[0], g: pixel[1], b: pixel[2],
          hex: '#' + [pixel[0], pixel[1], pixel[2]].map(v => v.toString(16).padStart(2, '0')).join('')
        };
        if (this.callback) this.callback(this.selectedColor);
      }
    };

    this.canvas.addEventListener('click', handler);
    this.canvas.addEventListener('touchstart', handler, { passive: false });
    this.canvas.addEventListener('touchmove', handler, { passive: false });
  },

  onSelect(callback) {
    this.callback = callback;
  },

  setColor(hex) {
    // Parse hex and update selectedColor
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    this.selectedColor = { r, g, b, hex };
    if (this.callback) this.callback(this.selectedColor);
  }
};
