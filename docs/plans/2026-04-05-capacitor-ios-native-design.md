# Capacitor iOS Native App — Design

## Overview

Wrap the existing Oculus LED Controller PWA in a Capacitor native iOS shell with real CoreBluetooth via @capacitor-community/bluetooth-le. Build IPA in the cloud, install to iPhone via Sideloadly over USB from Windows PC. No App Store, no paid Apple ID needed.

## Architecture

Existing PWA (index.html, js/, css/) runs inside Capacitor's WKWebView. BLE module detects whether it's running in Capacitor (native) or browser (Web Bluetooth) and uses the appropriate backend. The Capacitor BLE plugin provides direct CoreBluetooth access with full device name resolution and custom scan UI.

## What Changes

- js/ble.js: Add detection for Capacitor runtime, route to native BLE plugin when available
- js/ble-native.js: New file — Capacitor BLE plugin wrapper matching the existing BLE API surface
- package.json: npm project with Capacitor and BLE plugin dependencies
- capacitor.config.ts: Capacitor configuration pointing to existing web assets
- ios/: Generated Capacitor iOS project (gitignored, built by `npx cap add ios`)

## BLE Plugin API

@capacitor-community/bluetooth-le provides:
- BleClient.initialize() — request permissions
- BleClient.requestLEScan() — scan with filters, returns device names + IDs
- BleClient.connect(deviceId) — connect by ID
- BleClient.write(deviceId, serviceUUID, charUUID, data) — write commands
- BleClient.startNotifications() — subscribe to notify characteristic

## Device Scanner

Native BLE scan shows actual device names. Build a scan results list in the app UI:
- Show device name, signal strength, manufacturer data
- Highlight devices matching "Oracle" prefix
- Tap to connect

## Build & Deploy Pipeline

1. `npm install` — install Capacitor + plugins
2. `npx cap add ios` — generate iOS project
3. Cloud build (Capgo or GitHub Actions) — compile to .IPA
4. Sideloadly on Windows — install .IPA to iPhone over USB
5. Free Apple ID: app lasts 7 days, auto-refreshable via Sideloadly

## Constraints

- Free Apple ID: 7-day app expiry, max 3 sideloaded apps
- Cloud build required (no local Xcode on Windows)
- UI unchanged — same HTML/CSS/JS, just better BLE
