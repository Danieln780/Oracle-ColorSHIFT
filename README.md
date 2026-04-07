# Oracle ColorSHIFT LED Controller

Personal-use PWA to control Oracle Lighting Oculus ColorSHIFT headlights on a 2024 Ford Bronco via Bluetooth.

## Live App

**https://danieln780.github.io/Oracle-ColorSHIFT/**

Open in Chrome (Android/desktop) or Bluefy (iOS) for Web Bluetooth support.

## Features

### Colors Tab
- Full RGB color wheel with selection dot indicator
- Color temperature slider (warm amber to cool blue-white)
- Brightness slider
- Zone selector (outer halo, inner halo, demon eye)
- Quick-select color palette
- Breathing mode with adjustable speed and min brightness

### Effects Tab
- 20 built-in Triones effects (Rainbow Fade, strobes, jump)
- Custom Gradual Fade — select 2-5 colors, smooth interpolation
- Custom Strobe — select colors, flash each in sequence
- Speed slider (1=fast, 10=slow, logarithmic scale)
- Brightness slider for effects
- Solid Color button to exit effects

### Music Tab
- Mic-reactive mode with FFT frequency visualizer
- 7 color programs: Spectrum, Pulse, Party, Fire, Ice, DJ Mode, Custom
- 3 react styles: Smooth, Snap, Beat Strobe
- Sensitivity slider
- Background audio keep-alive
- Wake lock to prevent screen sleep

### Presets Tab
- 17 built-in presets (Off-Road Amber, Demon Red, Ice Blue, Rainbow Cruise, Red/Blue Flash, USA, Sunset Fade, Night Rider, Rave, and more)
- Save custom presets from current color
- One-tap activate with automatic cross-cancellation (stops other running effects)

### Header Controls
- Power on/off button
- Music toggle (quick on/off from any tab)
- BLE Connect + Scan buttons
- Global brightness slider
- 15-minute auto-off timer (resets on interaction, auto powers off to save battery)

### Dev Tab
- Oracle Device Finder (probe any BLE device for FFD5/FFD9)
- GATT service/characteristic explorer
- Raw hex command sender
- BLE event log

## BLE Protocol (Triones)

Targets the Oracle BC2-6 Bluetooth controller (device name: `Oracle-B1E4`).

Write to service `FFD5`, characteristic `FFD9`. Notify from service `FFD0`, characteristic `FFD4`.

| Command | Bytes |
|---------|-------|
| Power On | `CC 23 33` |
| Power Off | `CC 24 33` |
| Set RGB Color | `56 RR GG BB 00 F0 AA` |
| Set White | `56 00 00 00 WW 0F AA` |
| Built-in Effect | `BB [mode] [speed] 44` |
| Query Status | `EF 01 77` |

Modes 0x25-0x38: fades, graduals, strobes, jump. Speed: 0x01=fastest, 0xFF=slowest.

## Tech Stack

HTML5, CSS3, vanilla JavaScript, Web Bluetooth API, Canvas API, Web Audio API

## Install as App

**Android (recommended):** Chrome > menu > "Add to Home Screen" — permanent, no expiry

**iOS:** Open in Bluefy browser > share > "Add to Home Screen"

## Roadmap

- Multi-controller support (independent zone control with additional BLE controllers)
- WLED ESP32 integration (if headlight LEDs are addressable)
- Welcome/exit light sequences (with ESP32 + 12V detection)
- Per-pixel effects and chase patterns
