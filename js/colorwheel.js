const ColorWheel = {
  canvas: null,
  ctx: null,
  size: 280,
  callback: null,
  selectedColor: { r: 255, g: 107, b: 0, hex: '#ff6b00' },
  selectedPos: null, // {x, y} position of selection dot

  init(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d', { willReadFrequently: true });
    this.size = canvasElement.width;
    this.draw();
    this.bindEvents();

    // Set initial dot position (orange, roughly at 30 degrees, mid-radius)
    const cx = this.size / 2;
    const cy = this.size / 2;
    const radius = this.size / 2 - 10;
    const angle = 30 * Math.PI / 180;
    this.selectedPos = {
      x: cx + Math.cos(angle) * radius * 0.7,
      y: cy + Math.sin(angle) * radius * 0.7
    };
    this.drawDot();
  },

  draw() {
    const ctx = this.ctx;
    const cx = this.size / 2;
    const cy = this.size / 2;
    const radius = this.size / 2 - 10;

    // Clear canvas
    ctx.clearRect(0, 0, this.size, this.size);

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

  drawDot() {
    if (!this.selectedPos) return;
    const ctx = this.ctx;
    const { x, y } = this.selectedPos;

    // Outer ring (white)
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.closePath();

    // Inner ring (dark border for contrast)
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.closePath();

    // Fill with selected color
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fillStyle = this.selectedColor.hex;
    ctx.fill();
    ctx.closePath();
  },

  bindEvents() {
    const pickColor = (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.touches ? e.touches[0] : e;
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const x = (touch.clientX - rect.left) * scaleX;
      const y = (touch.clientY - rect.top) * scaleY;

      const cx = this.size / 2;
      const cy = this.size / 2;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const radius = this.size / 2 - 10;

      if (dist <= radius) {
        // Read pixel color (need to redraw wheel without dot first)
        this.draw();
        const pixel = this.ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data;
        this.selectedColor = {
          r: pixel[0], g: pixel[1], b: pixel[2],
          hex: '#' + [pixel[0], pixel[1], pixel[2]].map(v => v.toString(16).padStart(2, '0')).join('')
        };
        this.selectedPos = { x, y };
        this.drawDot();
        if (this.callback) this.callback(this.selectedColor);
      }
    };

    this.canvas.addEventListener('click', pickColor);
    this.canvas.addEventListener('touchstart', pickColor, { passive: false });
    this.canvas.addEventListener('touchmove', pickColor, { passive: false });
  },

  onSelect(callback) {
    this.callback = callback;
  },

  setColor(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    this.selectedColor = { r, g, b, hex };

    // Find approximate position on wheel for this color
    // Convert RGB to HSL to get angle and saturation
    const rn = r / 255, gn = g / 255, bn = b / 255;
    const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
    let h = 0;
    const d = max - min;
    if (d > 0) {
      if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
      else if (max === gn) h = ((bn - rn) / d + 2) * 60;
      else h = ((rn - gn) / d + 4) * 60;
    }
    const l = (max + min) / 2;
    const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));

    const cx = this.size / 2;
    const cy = this.size / 2;
    const radius = this.size / 2 - 10;
    const angle = h * Math.PI / 180;
    const dist = Math.min(s, 1) * radius;

    this.selectedPos = {
      x: cx + Math.cos(angle) * dist,
      y: cy + Math.sin(angle) * dist
    };

    this.draw();
    this.drawDot();
    if (this.callback) this.callback(this.selectedColor);
  }
};
