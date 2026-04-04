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

document.getElementById('ble-connect-btn').addEventListener('click', async () => {
  try {
    const status = document.getElementById('ble-status');
    status.textContent = 'Scanning...';
    status.className = 'status scanning';
    await BLE.connect();
    status.textContent = `Connected: ${BLE.device.name}`;
    status.className = 'status connected';
  } catch (err) {
    const status = document.getElementById('ble-status');
    status.textContent = 'Failed';
    status.className = 'status disconnected';
    console.error('BLE connect error:', err);
  }
});
