const ColorsTab = {
  selectedZones: new Set(['outer', 'inner', 'demon']),
  currentColor: { r: 255, g: 107, b: 0 },
  brightness: 100,

  init() {
    // Init color wheel
    ColorWheel.init(document.getElementById('color-wheel'));
    ColorWheel.onSelect((color) => {
      this.currentColor = color;
      document.getElementById('hex-input').value = color.hex;
      document.getElementById('color-preview').style.backgroundColor = color.hex;
      this.sendToZones();
    });

    // Zone toggle buttons
    document.querySelectorAll('.zone-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.classList.toggle('active');
        const zone = btn.dataset.zone;
        if (this.selectedZones.has(zone)) {
          this.selectedZones.delete(zone);
        } else {
          this.selectedZones.add(zone);
        }
      });
    });

    // Hex input
    document.getElementById('hex-input').addEventListener('change', (e) => {
      const hex = e.target.value;
      if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
        ColorWheel.setColor(hex);
      }
    });

    // Brightness slider
    document.getElementById('brightness-slider').addEventListener('input', (e) => {
      this.brightness = parseInt(e.target.value);
      document.getElementById('brightness-value').textContent = this.brightness + '%';
      this.sendToZones();
    });

    // Quick colors
    this.initQuickColors();

    // Set initial preview color
    document.getElementById('color-preview').style.backgroundColor = '#ff6b00';
  },

  initQuickColors() {
    const colors = [
      { name: 'Red', hex: '#ff0000' },
      { name: 'Orange', hex: '#ff6b00' },
      { name: 'Amber', hex: '#ffbf00' },
      { name: 'Green', hex: '#00ff44' },
      { name: 'Cyan', hex: '#00ffff' },
      { name: 'Blue', hex: '#0066ff' },
      { name: 'Purple', hex: '#aa00ff' },
      { name: 'White', hex: '#ffffff' }
    ];
    const container = document.getElementById('quick-colors');
    colors.forEach(c => {
      const btn = document.createElement('button');
      btn.className = 'quick-color-btn';
      btn.style.backgroundColor = c.hex;
      btn.title = c.name;
      btn.addEventListener('click', () => ColorWheel.setColor(c.hex));
      container.appendChild(btn);
    });
  },

  sendToZones() {
    const { r, g, b } = this.currentColor;
    this.selectedZones.forEach(zone => {
      if (typeof BLE !== 'undefined' && BLE.sendColor) {
        BLE.sendColor(zone, r, g, b, this.brightness);
      }
    });
  }
};

// Init when DOM ready
document.addEventListener('DOMContentLoaded', () => ColorsTab.init());
