# Oculus Bronco LED Controller PWA — Design

## Overview

Personal-use PWA to control Oracle Lighting Oculus ColorSHIFT headlights on a 2024 Ford Bronco via the BC2-6 Bluetooth controller. Replaces the stock Oracle ColorSHIFT PRO app with better UI, custom animations, and saveable presets.

## Target Hardware

- Oracle Lighting BC2-6 Bluetooth ColorSHIFT RGB LED Controller
- 3 RGB zones: Outer Halo Ring (RGB+W), Inner Halo Ring (RGB), Projector Demon Eye (RGB)
- Bluetooth 5.0 (BLE GATT — UUIDs to be discovered)

## Platform

- Progressive Web App (HTML/CSS/JS)
- Web Bluetooth API for BLE communication
- Runs on Android Chrome / desktop Chrome or Edge
- No iOS support (Web Bluetooth not available in Safari)
- Single-user, single-device — no multi-device or group management

## Tech Stack

- Vanilla HTML5 / CSS3 / JavaScript (no frameworks)
- Web Bluetooth API
- Canvas API (color wheel)
- localStorage (presets as JSON)

## UI Structure

Dark automotive theme, mobile-first, 5 bottom tabs:

### 1. Colors
- Full RGB color wheel (canvas-rendered)
- Per-zone control: outer halo, inner halo, demon eye
- Brightness slider
- Hex color input
- Quick-select popular colors

### 2. Effects
- Fade, strobe, chase, pulse modes
- Custom animation sequencer: add color steps with timing
- Speed and intensity controls
- Preview before sending to controller

### 3. Music
- Microphone input with FFT analysis
- Color mapping based on audio frequency/amplitude
- Sensitivity control

### 4. Presets
- Save/name current configuration
- Load saved presets with one tap
- Delete presets
- Stored in localStorage as JSON

### 5. Dev
- BLE GATT service/characteristic explorer
- Raw command sender (hex input)
- Response logger
- Connection diagnostics

## BLE Connection Flow

1. User taps "Connect" — Web Bluetooth scan with name filter ("BC2" / "Oracle")
2. Enumerate GATT services and characteristics
3. Cache discovered UUIDs in localStorage for faster reconnect
4. Auto-reconnect on app load if previously paired device is available
5. Connection status indicator in header bar

## Data Flow

```
User Input -> JS Engine -> BLE Write to BC2 Characteristic
BC2 Notify/Read -> JS Handler -> UI State Update
Presets -> localStorage JSON -> Load -> BLE Write
```

## Known Constraints

- BLE protocol is proprietary — first sessions will be discovery/reverse-engineering
- Chrome/Edge only
- Single device, personal use only
