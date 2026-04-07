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

// Static color button — exits effect mode, returns to solid color
document.getElementById('effect-static-btn')?.addEventListener('click', () => {
  if (typeof EffectsTab !== 'undefined') EffectsTab.goStatic();
});

// Global brightness slider
const brightnessSlider = document.getElementById('global-brightness');
const brightnessVal = document.getElementById('global-brightness-val');
if (brightnessSlider) {
  brightnessSlider.addEventListener('input', (e) => {
    const level = parseInt(e.target.value);
    brightnessVal.textContent = level + '%';
    BLE.globalBrightness = level;
    // If white mode, send white command; otherwise re-send via white intensity
    if (level === 0) {
      BLE.sendColor('all', 0, 0, 0, 100);
    } else {
      // Send white intensity command for pure brightness control
      BLE.sendWhite(level);
    }
  });
}
