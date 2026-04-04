# Oculus Bronco LED Controller PWA — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a personal-use PWA to control Oracle Oculus ColorSHIFT headlights on a 2024 Ford Bronco via Web Bluetooth.

**Architecture:** Single-page app with vanilla HTML/CSS/JS. Tab-based UI (Colors, Effects, Music, Presets, Dev). BLE communication via Web Bluetooth API writing to BC2-6 controller GATT characteristics. All state in localStorage.

**Tech Stack:** HTML5, CSS3, vanilla JavaScript, Web Bluetooth API, Canvas API, Web Audio API, localStorage

---

### Task 1: Project Scaffold and PWA Shell

**Files:**
- Create: `index.html`
- Create: `css/styles.css`
- Create: `js/app.js`
- Create: `manifest.json`
- Create: `icons/icon-192.png` (placeholder)
- Create: `icons/icon-512.png` (placeholder)

**Step 1: Create `index.html` with PWA shell**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <meta name="theme-color" content="#0a0a0f">
  <title>Oculus LED Control</title>
  <link rel="manifest" href="manifest.json">
  <link rel="stylesheet" href="css/styles.css">
</head>
<body>
  <header id="header">
    <h1>Oculus LED</h1>
    <button id="ble-connect-btn" class="connect-btn">Connect</button>
    <span id="ble-status" class="status disconnected">Disconnected</span>
  </header>

  <main id="tab-content">
    <section id="tab-colors" class="tab-panel active"></section>
    <section id="tab-effects" class="tab-panel"></section>
    <section id="tab-music" class="tab-panel"></section>
    <section id="tab-presets" class="tab-panel"></section>
    <section id="tab-dev" class="tab-panel"></section>
  </main>

  <nav id="tab-bar">
    <button class="tab-btn active" data-tab="colors">Colors</button>
    <button class="tab-btn" data-tab="effects">Effects</button>
    <button class="tab-btn" data-tab="music">Music</button>
    <button class="tab-btn" data-tab="presets">Presets</button>
    <button class="tab-btn" data-tab="dev">Dev</button>
  </nav>

  <script src="js/app.js"></script>
</body>
</html>
```

**Step 2: Create `manifest.json`**

```json
{
  "name": "Oculus LED Control",
  "short_name": "Oculus LED",
  "start_url": ".",
  "display": "standalone",
  "background_color": "#0a0a0f",
  "theme_color": "#0a0a0f",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**Step 3: Create `css/styles.css` with dark theme and tab layout**

Base styles: dark background (#0a0a0f), light text (#e0e0e0), accent color (orange #ff6b00 — matches Oracle branding). Bottom tab bar fixed, 56px height. Header fixed top with connect button and status. Tab panels fill remaining space with scroll. Mobile-first, max-width 480px centered.

**Step 4: Create `js/app.js` with tab switching logic**

```javascript
// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
  });
});
```

**Step 5: Create placeholder icon PNGs**

Generate simple 192x192 and 512x512 orange circle icons as placeholders.

**Step 6: Verify in browser**

Run: Start a local dev server and open in Chrome.
Expected: Dark page with header, 5 tab buttons at bottom, tabs switch content areas. "Connect" button and "Disconnected" status visible.

**Step 7: Commit**

```bash
git init
git add -A
git commit -m "feat: project scaffold with PWA shell and tab navigation"
```

---

### Task 2: BLE Connection Manager

**Files:**
- Create: `js/ble.js`
- Modify: `index.html` (add script tag)
- Modify: `js/app.js` (wire up connect button)

**Step 1: Create `js/ble.js` — BLE module**

```javascript
const BLE = {
  device: null,
  server: null,
  services: [],
  characteristics: new Map(),

  async connect() {
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: 'BC' }],
      optionalServices: [] // Will add discovered services
    });
    // Also try acceptAllDevices with no filters as fallback
    this.device = device;
    device.addEventListener('gattserverdisconnected', () => this.onDisconnect());
    this.server = await device.gatt.connect();
    await this.discoverServices();
    return device;
  },

  async discoverServices() {
    const services = await this.server.getPrimaryServices();
    this.services = services;
    for (const service of services) {
      const chars = await service.getCharacteristics();
      for (const char of chars) {
        this.characteristics.set(char.uuid, char);
      }
    }
  },

  async write(charUuid, data) {
    const char = this.characteristics.get(charUuid);
    if (!char) throw new Error(`Characteristic ${charUuid} not found`);
    await char.writeValueWithResponse(new Uint8Array(data));
  },

  async read(charUuid) {
    const char = this.characteristics.get(charUuid);
    if (!char) throw new Error(`Characteristic ${charUuid} not found`);
    return await char.readValue();
  },

  onDisconnect() {
    document.getElementById('ble-status').textContent = 'Disconnected';
    document.getElementById('ble-status').className = 'status disconnected';
  },

  isConnected() {
    return this.device?.gatt?.connected ?? false;
  }
};
```

**Step 2: Wire connect button in `js/app.js`**

```javascript
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
```

**Step 3: Add script tag to `index.html`**

Add `<script src="js/ble.js"></script>` before `app.js`.

**Step 4: Verify in browser**

Expected: Connect button triggers Chrome BLE device picker. Without a BC2 nearby, the picker appears but shows no matching devices (or cancellation works cleanly).

**Step 5: Commit**

```bash
git add js/ble.js index.html js/app.js
git commit -m "feat: BLE connection manager with service discovery"
```

---

### Task 3: Colors Tab — Color Wheel and Zone Control

**Files:**
- Create: `js/colorwheel.js`
- Create: `js/colors-tab.js`
- Modify: `index.html` (add scripts, populate colors tab HTML)
- Modify: `css/styles.css` (color tab styles)

**Step 1: Create `js/colorwheel.js` — Canvas color wheel**

Renders an HSL color wheel on a canvas element. Touch/click to select a color. Returns {h, s, l} and {r, g, b}. Has a brightness ring around the outside. Size responsive to container.

Key functions:
- `ColorWheel.init(canvasElement)` — draw the wheel
- `ColorWheel.onSelect(callback)` — fires with `{r, g, b, hex}` on touch/click
- `ColorWheel.setColor(hex)` — programmatically set the selection indicator

**Step 2: Create `js/colors-tab.js` — Colors tab UI**

Populates `#tab-colors` with:
- Canvas color wheel (centered, ~280px diameter)
- Zone selector: 3 toggle buttons (Outer Halo, Inner Halo, Demon Eye) — can multi-select
- Hex input field showing current color
- Brightness slider (0-100%)
- Quick colors row: 8 preset color circles (red, orange, amber, green, cyan, blue, purple, white)

On color change: update hex display, send to selected zones via BLE.

**Step 3: Add HTML structure to `#tab-colors` in `index.html`**

```html
<section id="tab-colors" class="tab-panel active">
  <div class="zone-selector">
    <button class="zone-btn active" data-zone="outer">Outer Halo</button>
    <button class="zone-btn active" data-zone="inner">Inner Halo</button>
    <button class="zone-btn active" data-zone="demon">Demon Eye</button>
  </div>
  <canvas id="color-wheel" width="280" height="280"></canvas>
  <div class="color-input-row">
    <span class="color-preview" id="color-preview"></span>
    <input type="text" id="hex-input" value="#FF6B00" maxlength="7">
  </div>
  <div class="slider-row">
    <label>Brightness</label>
    <input type="range" id="brightness-slider" min="0" max="100" value="100">
    <span id="brightness-value">100%</span>
  </div>
  <div class="quick-colors" id="quick-colors"></div>
</section>
```

**Step 4: Style the colors tab**

Zone buttons: pill-shaped toggles, orange when active. Color wheel centered. Brightness slider styled with orange track. Quick colors as 40px circles in a flex row.

**Step 5: Verify in browser**

Expected: Color wheel renders, touch/click selects colors, hex updates, zone buttons toggle, brightness slider moves. No BLE needed for UI verification.

**Step 6: Commit**

```bash
git add js/colorwheel.js js/colors-tab.js index.html css/styles.css
git commit -m "feat: colors tab with color wheel, zone control, and brightness"
```

---

### Task 4: Effects Tab — Fade, Strobe, Chase, Pulse

**Files:**
- Create: `js/effects-tab.js`
- Modify: `index.html` (populate effects tab, add script)
- Modify: `css/styles.css` (effects tab styles)

**Step 1: Create `js/effects-tab.js`**

Four effect modes as selectable cards:
- **Fade** — smooth transition between 2+ colors. Controls: color list (add/remove), speed slider (0.5s-10s per step)
- **Strobe** — flash on/off. Controls: color, frequency slider (1-20 Hz)
- **Chase** — sequential color movement across zones. Controls: color list, speed, direction toggle
- **Pulse** — breathe/throb effect. Controls: color, speed slider, min/max brightness

Each mode card expands when selected to show its controls.

Custom animation sequencer at the bottom:
- "Add Step" button adds a color + duration row
- Each step: color picker swatch + duration input (ms)
- Play/Stop buttons to preview the sequence locally (cycles through colors in the UI)
- "Send to Controller" button

**Step 2: Add HTML to `#tab-effects`**

Mode selector cards in a 2x2 grid, expanded controls below, sequencer section at bottom.

**Step 3: Style the effects tab**

Mode cards: rounded rectangles with icon and label, orange border when selected. Sequencer steps as a scrollable list with color dots and timing.

**Step 4: Verify in browser**

Expected: Mode cards toggle, controls appear for selected mode, sequencer adds/removes steps, preview cycles colors in the step indicators.

**Step 5: Commit**

```bash
git add js/effects-tab.js index.html css/styles.css
git commit -m "feat: effects tab with fade/strobe/chase/pulse and animation sequencer"
```

---

### Task 5: Music Tab — Mic-Reactive Mode

**Files:**
- Create: `js/music-tab.js`
- Modify: `index.html` (populate music tab, add script)
- Modify: `css/styles.css` (music tab styles)

**Step 1: Create `js/music-tab.js`**

Uses Web Audio API:
- `navigator.mediaDevices.getUserMedia({audio: true})` for mic access
- `AnalyserNode` with FFT for frequency data
- Canvas visualizer showing frequency bars
- Maps frequency bands to color output:
  - Bass (low freq) → red/orange
  - Mid → green/cyan
  - Treble (high freq) → blue/purple
- Controls: sensitivity slider, color mapping selector (bass-heavy, balanced, treble-heavy), start/stop button

**Step 2: Add HTML to `#tab-music`**

```html
<section id="tab-music" class="tab-panel">
  <canvas id="audio-visualizer" width="320" height="120"></canvas>
  <button id="music-start-btn" class="primary-btn">Start Listening</button>
  <div class="slider-row">
    <label>Sensitivity</label>
    <input type="range" id="sensitivity-slider" min="1" max="100" value="50">
  </div>
  <div class="mode-selector">
    <button class="mode-btn active" data-mode="balanced">Balanced</button>
    <button class="mode-btn" data-mode="bass">Bass Heavy</button>
    <button class="mode-btn" data-mode="treble">Treble Heavy</button>
  </div>
</section>
```

**Step 3: Style music tab**

Visualizer canvas with rounded corners, neon glow effect. Mode buttons as pill toggles.

**Step 4: Verify in browser**

Expected: Clicking "Start Listening" prompts for mic permission. Visualizer shows frequency bars reacting to sound. Color output changes with audio.

**Step 5: Commit**

```bash
git add js/music-tab.js index.html css/styles.css
git commit -m "feat: music tab with mic-reactive FFT visualizer and color mapping"
```

---

### Task 6: Presets Tab — Save/Load/Delete

**Files:**
- Create: `js/presets-tab.js`
- Modify: `index.html` (populate presets tab, add script)
- Modify: `css/styles.css` (presets tab styles)

**Step 1: Create `js/presets-tab.js`**

Preset data structure:
```javascript
{
  id: Date.now(),
  name: "Night Cruise",
  zones: {
    outer: { r: 255, g: 107, b: 0, brightness: 80 },
    inner: { r: 255, g: 107, b: 0, brightness: 60 },
    demon: { r: 255, g: 0, b: 0, brightness: 100 }
  },
  effect: null // or { type: "fade", params: {...} }
}
```

Functions:
- `savePreset(name)` — captures current state, saves to localStorage
- `loadPreset(id)` — restores zones + effect, sends to BLE
- `deletePreset(id)` — removes from localStorage
- `getPresets()` — returns sorted list

UI: "Save Current" button + name input at top. Preset list below as cards showing name + color swatches. Tap to load, long-press or swipe to delete. Include 3 built-in defaults: "Off-Road Amber", "Night Cruise", "Show Mode".

**Step 2: Add HTML and wire up**

**Step 3: Style preset cards**

Cards with color dot indicators for each zone, name label, subtle border.

**Step 4: Verify in browser**

Expected: Can save a preset with a name, see it appear in the list, tap to "load" (logs to console without BLE), delete works.

**Step 5: Commit**

```bash
git add js/presets-tab.js index.html css/styles.css
git commit -m "feat: presets tab with save/load/delete and built-in defaults"
```

---

### Task 7: Dev Tab — GATT Explorer and Raw Commands

**Files:**
- Create: `js/dev-tab.js`
- Modify: `index.html` (populate dev tab, add script)
- Modify: `css/styles.css` (dev tab styles)

**Step 1: Create `js/dev-tab.js`**

Three sections:
1. **Service Explorer** — after BLE connect, lists all discovered services and their characteristics with UUIDs, properties (read/write/notify), and values
2. **Raw Command Sender** — hex input field, characteristic UUID dropdown, Write/Read buttons, response display
3. **Log** — scrollable log of all BLE read/write/notify events with timestamps

```javascript
function populateServiceExplorer() {
  // Iterate BLE.services and BLE.characteristics
  // Build a tree view: Service UUID > Characteristic UUID (properties)
}

function sendRawCommand() {
  const hexInput = document.getElementById('raw-hex-input').value;
  const charUuid = document.getElementById('char-select').value;
  const bytes = hexToBytes(hexInput);
  BLE.write(charUuid, bytes);
  logEvent('WRITE', charUuid, hexInput);
}
```

**Step 2: Add HTML to `#tab-dev`**

Service tree container, raw command form, scrollable log area.

**Step 3: Style dev tab**

Monospace font for UUIDs and hex values. Log entries color-coded (green=read, blue=write, yellow=notify). Dark code-editor aesthetic.

**Step 4: Verify in browser**

Expected: Without BLE connection, shows "Connect to explore services." With connection, populates service tree. Raw command UI is functional.

**Step 5: Commit**

```bash
git add js/dev-tab.js index.html css/styles.css
git commit -m "feat: dev tab with GATT explorer, raw command sender, and event log"
```

---

### Task 8: BLE-to-UI Integration and Polish

**Files:**
- Modify: `js/ble.js` (add send helpers for color/effect commands)
- Modify: `js/colors-tab.js` (wire color changes to BLE writes)
- Modify: `js/effects-tab.js` (wire effects to BLE writes)
- Modify: `js/music-tab.js` (wire audio output to BLE writes)
- Modify: `css/styles.css` (transitions, animations, final polish)

**Step 1: Add BLE send helpers**

```javascript
// In ble.js — placeholder protocol layer
// These will be updated once we discover the actual BC2 GATT protocol
BLE.sendColor = async function(zone, r, g, b, brightness) {
  // Placeholder: log the command
  console.log(`[BLE] Color -> ${zone}: rgb(${r},${g},${b}) @ ${brightness}%`);
  // Once protocol is known:
  // const cmd = buildColorCommand(zone, r, g, b, brightness);
  // await this.write(KNOWN_CHAR_UUID, cmd);
};

BLE.sendEffect = async function(type, params) {
  console.log(`[BLE] Effect -> ${type}:`, params);
};
```

**Step 2: Wire all tabs to call BLE.sendColor / BLE.sendEffect**

Colors tab: on color pick or brightness change, call `BLE.sendColor` for each selected zone.
Effects tab: on mode change or param change, call `BLE.sendEffect`.
Music tab: on each animation frame, call `BLE.sendColor` with computed color.

**Step 3: CSS polish pass**

- Smooth tab transitions (opacity + transform)
- Button press feedback (scale animation)
- Connection status pulse animation (green dot)
- Color preview glow effect
- Slider thumb styling (orange, larger touch target)

**Step 4: Verify full flow in browser**

Expected: All tabs functional. Color changes log to console. Effects log to console. Music visualizer runs. Presets save/load. Dev tab ready for protocol discovery.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: wire BLE integration across all tabs, UI polish pass"
```

---

### Task 9: Final PWA Setup and Deployment

**Files:**
- Modify: `manifest.json` (verify)
- Modify: `index.html` (verify meta tags)
- Create: `icons/icon-192.png` (proper icon)
- Create: `icons/icon-512.png` (proper icon)

**Step 1: Generate proper app icons**

Create orange-on-dark headlight/eye icon at 192x192 and 512x512.

**Step 2: Verify PWA installability**

Open Chrome DevTools > Application > Manifest. Check all requirements met:
- Valid manifest.json linked
- Icons present
- start_url works
- display: standalone

**Step 3: Test "Add to Home Screen" on Android**

Expected: Chrome shows install prompt, app launches in standalone mode with dark theme and no browser chrome.

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: finalize PWA with icons, ready for deployment"
```

---

## Summary

| Task | What | Estimated Complexity |
|------|------|---------------------|
| 1 | Project scaffold + PWA shell | Light |
| 2 | BLE connection manager | Medium |
| 3 | Colors tab + color wheel | Medium |
| 4 | Effects tab + animation sequencer | Medium-Heavy |
| 5 | Music tab + FFT visualizer | Medium |
| 6 | Presets tab + localStorage | Light |
| 7 | Dev tab + GATT explorer | Medium |
| 8 | BLE integration + polish | Medium |
| 9 | PWA finalization | Light |
