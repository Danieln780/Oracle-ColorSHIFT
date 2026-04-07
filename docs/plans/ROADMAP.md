# Oracle ColorSHIFT LED Controller — Roadmap

## Completed
- [x] PWA with 5 tabs (Colors, Effects, Music, Presets, Dev)
- [x] Web Bluetooth connection to Oracle-B1E4 (Triones protocol)
- [x] Power on/off (CC 23 33 / CC 24 33)
- [x] RGB color control (56 RR GG BB 00 F0 AA)
- [x] Built-in Triones effects (fades, strobes, jump)
- [x] Custom color fade (2-5 colors, app-driven smooth transitions)
- [x] Custom sequencer (step-by-step color changes)
- [x] Color wheel with selection dot
- [x] Presets with localStorage
- [x] Music reactive mode
- [x] Dev tools / GATT explorer
- [x] Deployed to GitHub Pages

## In Progress
- [ ] Fix and test all built-in effects on real hardware
- [ ] Improve custom fade smoothness and timing

## Next: WLED 4-Channel Controller Integration
**Hardware:** Skikibily ESP32 WLED 4-Channel Controller (ordered)
- 4 independent output channels for independent zone control
- Outer Halo (Channel 1), Inner Halo (Channel 2), Demon Eye (Channel 3)
- ESP32 with WLED firmware, WiFi control, 12V from car battery

**App Changes Needed:**
- [ ] Add WLED API integration (REST + WebSocket)
- [ ] WiFi connection manager (replace/supplement BLE)
- [ ] Independent per-zone color/effect control
- [ ] Per-pixel addressable effects (chase, scan, meteor, etc.)
- [ ] WLED segment mapping for each zone
- [ ] Import/export WLED presets

## Future Ideas
- [ ] Welcome/Exit Light Sequence — detect headlight 12V power via ESP32 GPIO, auto-play animation on power on/off
- [ ] Startup preset (auto-apply on power)
- [ ] Scheduling (time-based color changes)
- [ ] GPS triggers (color on location)
- [ ] Multi-vehicle sync
- [ ] Second BC2 controller for multi-channel control
