# Oracle ColorSHIFT LED Controller

Personal-use PWA to control Oracle Lighting Oculus ColorSHIFT headlights on a 2024 Ford Bronco via Bluetooth.

## Live App

**https://danieln780.github.io/Oracle-ColorSHIFT/**

Open in Chrome (Android/desktop) or Bluefy (iOS) for Web Bluetooth support.

## Features

- **Colors** — Full RGB color wheel, per-zone control (outer halo, inner halo, demon eye), brightness slider, quick presets
- **Effects** — Fade, strobe, chase, pulse, rainbow, phase shift with custom timing and animation sequencer
- **Music** — Mic-reactive mode with FFT visualizer and frequency-to-color mapping
- **Presets** — Save/load/delete custom configurations with localStorage
- **Dev Tools** — BLE GATT explorer, raw command sender, event log, Oracle Device Finder

## BLE Protocol

Targets the Oracle BC2-6 Bluetooth controller (device name: `Oracle-B1E4`).

| Command | Bytes |
|---------|-------|
| Power On | `7E 00 04 01 00 00 00 00 EF` |
| Power Off | `7E 00 04 00 00 00 00 00 EF` |
| Set Color | `7E 00 05 03 RR GG BB 00 EF` |
| Brightness | `7E 00 01 [0-64] 00 00 00 00 EF` |
| Effect Mode | `7E 00 03 [mode] [speed] 00 00 00 EF` |

Write to service `FFD5`, characteristic `FFD9`. Notify from service `FFD0`, characteristic `FFD4`.

## Tech Stack

HTML5, CSS3, vanilla JavaScript, Web Bluetooth API, Canvas API, Web Audio API

## Install as App

**Android:** Chrome > menu > "Add to Home Screen"

**iOS:** Open in Bluefy browser > share > "Add to Home Screen"
