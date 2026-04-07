// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
  });
});

// Power on/off
const powerBtn = document.getElementById('power-btn');
let powerState = false;

powerBtn.addEventListener('click', () => {
  powerState = !powerState;
  powerBtn.classList.toggle('on', powerState);
  powerBtn.classList.toggle('off', !powerState);
  if (powerState) {
    BLE.sendPower(true);
  } else {
    BLE.sendPower(false);
  }
});

// Shared connect handler
async function bleConnect(mode) {
  const status = document.getElementById('ble-status');
  const connectBtn = document.getElementById('ble-connect-btn');
  const scanBtn = document.getElementById('ble-scan-btn');
  try {
    connectBtn.disabled = true;
    scanBtn.disabled = true;
    const labels = {
      auto: 'Searching for Oracle...',
      service: 'Finding FFD5 devices...',
      scan: 'Showing all devices...'
    };
    status.textContent = labels[mode] || 'Connecting...';
    status.className = 'status scanning';
    await BLE.connect(mode);

    const name = BLE.device.name || 'Unknown Device';
    const hasFFD9 = BLE.writeChar?.uuid?.includes('ffd9');
    status.textContent = `Connected: ${name}` + (hasFFD9 ? ' (FFD9 OK)' : '');
    status.className = 'status connected';

    // Show result details
    console.log('[App] Connected to:', name);
    console.log('[App] Write char:', BLE.writeChar?.uuid || 'NONE');
    console.log('[App] Services found:', BLE.services.length);
    console.log('[App] Characteristics:', BLE.characteristics.size);
  } catch (err) {
    if (err.name === 'NotFoundError') {
      status.textContent = 'No device found';
    } else if (err.message?.includes('User cancelled')) {
      status.textContent = 'Cancelled';
    } else {
      status.textContent = 'Failed: ' + (err.message || err);
    }
    status.className = 'status disconnected';
    console.error('BLE connect error:', err);
  } finally {
    connectBtn.disabled = false;
    scanBtn.disabled = false;
  }
}

// Connect — filters by FFD5 service UUID first (shows only LED controllers)
document.getElementById('ble-connect-btn').addEventListener('click', () => bleConnect('auto'));

// Scan — opens picker showing ALL nearby BLE devices (manual pick)
document.getElementById('ble-scan-btn').addEventListener('click', () => bleConnect('scan'));

// Music quick toggle
document.getElementById('music-toggle-btn')?.addEventListener('click', () => {
  const btn = document.getElementById('music-toggle-btn');
  if (typeof MusicTab !== 'undefined') {
    if (MusicTab.isListening) {
      MusicTab.stop();
      btn.classList.remove('on');
      btn.classList.add('off');
    } else {
      MusicTab.start();
      btn.classList.remove('off');
      btn.classList.add('on');
    }
  }
});

// Static color button — exits effect mode, returns to solid color
document.getElementById('effect-static-btn')?.addEventListener('click', () => {
  if (typeof EffectsTab !== 'undefined') EffectsTab.goStatic();
});

// Effects brightness slider — syncs with global brightness
const effectBrightnessSlider = document.getElementById('effect-brightness-slider');
const effectBrightnessVal = document.getElementById('effect-brightness-val');
if (effectBrightnessSlider) {
  effectBrightnessSlider.addEventListener('input', (e) => {
    const level = parseInt(e.target.value);
    effectBrightnessVal.textContent = level + '%';
    BLE.globalBrightness = level;
    // Sync the header brightness slider
    const headerSlider = document.getElementById('global-brightness');
    const headerVal = document.getElementById('global-brightness-val');
    if (headerSlider) headerSlider.value = level;
    if (headerVal) headerVal.textContent = level + '%';
  });
}

// Global brightness slider
const brightnessSlider = document.getElementById('global-brightness');
const brightnessVal = document.getElementById('global-brightness-val');
if (brightnessSlider) {
  brightnessSlider.addEventListener('input', (e) => {
    const level = parseInt(e.target.value);
    brightnessVal.textContent = level + '%';
    BLE.globalBrightness = level;
    resetAutoOff(); // user activity

    // For solid colors: re-send current color at new brightness
    if (typeof ColorsTab !== 'undefined' && ColorsTab.currentColor) {
      const c = ColorsTab.currentColor;
      BLE.sendColor('all', c.r, c.g, c.b, ColorsTab.brightness || 100);
    }
  });
}

// ======= Color Temperature Slider =======
// 0=warm (2700K amber), 50=neutral (white), 100=cool (6500K blue-white)
const colorTempSlider = document.getElementById('color-temp-slider');
const colorTempVal = document.getElementById('color-temp-val');
if (colorTempSlider) {
  colorTempSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    resetAutoOff();
    let r, g, b, label;

    if (val <= 50) {
      // Warm: amber(0) to white(50)
      const t = val / 50;
      r = 255;
      g = Math.round(140 + 115 * t); // 140->255
      b = Math.round(30 + 225 * t);  // 30->255
      label = val < 20 ? 'Warm' : val < 40 ? 'Soft' : 'Neutral';
    } else {
      // Cool: white(50) to blue-white(100)
      const t = (val - 50) / 50;
      r = Math.round(255 - 60 * t);  // 255->195
      g = Math.round(255 - 20 * t);  // 255->235
      b = 255;
      label = val < 70 ? 'Daylight' : val < 90 ? 'Cool' : 'Ice';
    }

    colorTempVal.textContent = label;
    BLE.sendColor('all', r, g, b, 100);
  });
}

// ======= Breathing Mode =======
let breathingActive = false;
let breathingTimer = null;

document.getElementById('breathing-btn')?.addEventListener('click', () => {
  if (breathingActive) {
    stopBreathing();
  } else {
    startBreathing();
  }
});

document.getElementById('breathing-speed')?.addEventListener('input', () => {
  if (breathingActive) { stopBreathing(); startBreathing(); }
});

document.getElementById('breathing-min')?.addEventListener('input', (e) => {
  document.getElementById('breathing-min-val').textContent = e.target.value + '%';
  if (breathingActive) { stopBreathing(); startBreathing(); }
});

function startBreathing() {
  breathingActive = true;
  const btn = document.getElementById('breathing-btn');
  btn.textContent = 'Stop Breathing';
  btn.classList.remove('breathing-off');
  btn.classList.add('breathing-on');
  document.getElementById('breathing-controls').style.display = 'flex';

  const speedVal = parseInt(document.getElementById('breathing-speed')?.value || 4);
  const minBright = parseInt(document.getElementById('breathing-min')?.value || 10);

  // Get current color
  let r = 255, g = 107, b = 0;
  if (typeof ColorsTab !== 'undefined' && ColorsTab.currentColor) {
    r = ColorsTab.currentColor.r;
    g = ColorsTab.currentColor.g;
    b = ColorsTab.currentColor.b;
  }

  // Breathing cycle: sine wave from minBright% to 100%
  // Speed 1=fastest (~1.5s cycle), 10=slowest (~8s cycle)
  const cycleDuration = 1500 + (speedVal - 1) * 720; // 1500ms to 8000ms
  const stepInterval = 30; // 30ms per step
  const totalSteps = Math.round(cycleDuration / stepInterval);
  let step = 0;

  const tick = () => {
    if (!breathingActive) return;
    const t = step / totalSteps;
    // Sine wave: 0->1->0
    const sine = (Math.sin(t * Math.PI * 2 - Math.PI / 2) + 1) / 2; // 0 to 1
    const brightness = minBright + sine * (100 - minBright);
    const scale = brightness / 100;

    BLE.sendColor('all', Math.round(r * scale), Math.round(g * scale), Math.round(b * scale), 100);

    step = (step + 1) % totalSteps;
    breathingTimer = setTimeout(tick, stepInterval);
  };
  tick();
}

function stopBreathing() {
  breathingActive = false;
  clearTimeout(breathingTimer);
  const btn = document.getElementById('breathing-btn');
  btn.textContent = 'Breathing';
  btn.classList.remove('breathing-on');
  btn.classList.add('breathing-off');
  document.getElementById('breathing-controls').style.display = 'none';
}

// ======= Auto-Off Timer (15 min) =======
const AUTO_OFF_MINUTES = 15;
let autoOffSeconds = AUTO_OFF_MINUTES * 60;
let autoOffInterval = null;
let autoOffActive = false;

function startAutoOff() {
  if (autoOffInterval) return;
  autoOffActive = true;
  autoOffSeconds = AUTO_OFF_MINUTES * 60;
  updateAutoOffDisplay();
  autoOffInterval = setInterval(() => {
    autoOffSeconds--;
    updateAutoOffDisplay();
    if (autoOffSeconds <= 0) {
      // Auto power off
      BLE.sendPower(false);
      powerState = false;
      powerBtn.classList.remove('on');
      powerBtn.classList.add('off');
      stopAutoOff();
      console.log('[AutoOff] 15 minutes with no activity — powered off');
    }
  }, 1000);
}

function stopAutoOff() {
  clearInterval(autoOffInterval);
  autoOffInterval = null;
  autoOffActive = false;
  const el = document.getElementById('auto-off-timer');
  if (el) el.textContent = '';
}

function resetAutoOff() {
  // Any user interaction resets the timer
  if (autoOffActive) {
    autoOffSeconds = AUTO_OFF_MINUTES * 60;
    updateAutoOffDisplay();
  }
}

function updateAutoOffDisplay() {
  const el = document.getElementById('auto-off-timer');
  if (!el) return;
  const min = Math.floor(autoOffSeconds / 60);
  const sec = autoOffSeconds % 60;
  el.textContent = `${min}:${sec.toString().padStart(2, '0')}`;
  // Flash red when under 1 minute
  el.style.color = autoOffSeconds < 60 ? '#ff4444' : '#555';
}

// Start auto-off when power turns on, stop when off
const origPowerClick = powerBtn.onclick;
powerBtn.addEventListener('click', () => {
  if (powerState) {
    startAutoOff();
  } else {
    stopAutoOff();
  }
});

// Reset timer on any tab interaction
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', resetAutoOff);
});
// Reset on any touch/click in the main content area
document.getElementById('tab-content')?.addEventListener('click', resetAutoOff);
document.getElementById('tab-content')?.addEventListener('touchstart', resetAutoOff);
