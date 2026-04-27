# Sensor Dashboard - Project TODO

## Core Features
- [x] Create temperature sensor card component with icon and large value display
- [x] Create humidity sensor card component with icon and large value display
- [x] Implement dashboard layout with card grid
- [x] Add refresh button to manually update sensor readings
- [x] Implement mock sensor data for temperature and humidity
- [x] Add timestamp display for last updated reading
- [x] Implement press feedback for cards (scale animation)

## Branding & Configuration
- [x] Generate custom app logo/icon
- [x] Update app.config.ts with app name and logo URL
- [x] Configure color theme in theme.config.js

## Testing & Polish
- [ ] Test dashboard layout on different screen sizes
- [ ] Verify card styling and spacing
- [ ] Test refresh functionality
- [ ] Verify dark mode appearance
- [ ] Test on iOS and Android

## Deployment
- [ ] Create checkpoint for first delivery

## ESP32 Integration
- [x] Provide ESP32 Arduino code for DHT22 sensor and WiFi HTTP server
- [x] Update mobile app to fetch real sensor data from ESP32 HTTP endpoint
- [x] Add configuration screen for ESP32 IP address/hostname
- [x] Implement error handling for network connectivity issues
- [x] Update ESP32 code with static IP 192.168.1.33
- [x] Add network page to change ESP32 IP
- [x] Add settings page for temperature and humidity alert thresholds
- [x] Implement alert checking on home screen
- [ ] Test integration with real ESP32 device

## Theme & UI Enhancements
- [x] Add theme selection (light/dark/auto) to Settings page
- [x] Implement theme persistence in storage

## ESP32 Network Reliability
- [x] Add mDNS support to ESP32 code for hostname discovery
- [x] Implement mDNS hostname resolution in mobile app
- [x] Add fallback to manual IP if mDNS discovery fails
- [ ] Add network discovery/scanning feature

## Bug Fixes & New Features
- [x] Fix theme switching not working in preview
- [x] Add visual alerts for low/high temperature values
- [x] Add visual alerts for low/high humidity values
- [x] Add serial debug enable/disable toggle in Settings
- [x] Display current IP address on home screen
- [x] Add WiFi signal strength icon display
- [x] Update ESP32 code to send WiFi signal strength (RSSI)

## Critical Bug Fixes - Sprint 3
- [x] Remove Supabase dependency and use AsyncStorage instead
- [x] Fix dashboard UI layout (temperature/humidity cards displaying correctly)
- [x] Fix theme switching functionality
- [x] Fix ESP32 connection in installed app
- [x] Remove Supabase console error messages
