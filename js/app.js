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
  try {
    status.textContent = mode === 'scan' ? 'Scanning all...' : 'Connecting...';
    status.className = 'status scanning';
    await BLE.connect(mode);
    status.textContent = `Connected: ${BLE.device.name || 'Unknown'}`;
    status.className = 'status connected';
  } catch (err) {
    status.textContent = err.name === 'NotFoundError' ? 'No device found' : 'Failed';
    status.className = 'status disconnected';
    console.error('BLE connect error:', err);
  }
}

// Connect — tries auto-reconnect first, then filtered picker
document.getElementById('ble-connect-btn').addEventListener('click', () => bleConnect('auto'));

// Scan — opens picker showing ALL nearby BLE devices (no name filter)
document.getElementById('ble-scan-btn').addEventListener('click', () => bleConnect('scan'));
