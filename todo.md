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
- [x] Test dashboard layout on different screen sizes
- [x] Verify card styling and spacing
- [x] Test refresh functionality
- [x] Verify dark mode appearance
- [ ] Test on iOS and Android

## Deployment
- [x] Create checkpoint for first delivery

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
- [x] Add network discovery/scanning feature

## Bug Fixes & New Features
- [x] Fix theme switching not working in preview
- [x] Add visual alerts for low/high temperature values
- [x] Add visual alerts for low/high humidity values
- [x] Add serial debug enable/disable toggle in Settings
- [x] Display current IP address on home screen
- [x] Add WiFi signal strength icon display
- [x] Update ESP32 code to send WiFi signal strength (RSSI)

## Bug Fixes - Current Sprint
- [x] Fix dashboard icon colors (restore colored icons)
- [x] Fix theme switching to auto mode (not switching properly)
- [x] Add notification alerts for threshold violations
- [x] Add notification enable/disable toggle in Settings

## Supabase Integration
- [x] Create sensor_readings table with RLS for data persistence
- [x] Create device_preferences table with RLS for settings persistence
- [x] Add Supabase client library (lib/supabase.ts)
- [x] Add device ID generation for anonymous user scoping
- [x] Create usePreferences hook for dual persistence (AsyncStorage + Supabase)

## History & Visualization
- [x] Add History tab with date range selector (Today, 7 Days, 30 Days)
- [x] Build SensorChart component with SVG line charts
- [x] Display temperature and humidity trend charts
- [x] Show scrollable readings list grouped by date
- [x] Add clear history functionality
- [x] Auto-cleanup readings older than 30 days

## UI Polish
- [x] Fix dark mode for temperature card icon background (theme-aware rgba)
- [x] Fix dark mode for humidity card icon background (theme-aware rgba)
- [x] Fix alert banner text colors (theme-aware instead of hardcoded white)
- [x] Add pull-to-refresh on home screen
- [x] Add initial loading state on home screen
- [x] Migrate all screens to use usePreferences hook

## Network Scanner
- [x] Implement network scanning utility (lib/network-scanner.ts)
- [x] Add scan UI with progress bar and cancel button
- [x] Display discovered ESP32 devices with connect action
- [x] Cache scan results in AsyncStorage
- [x] Handle empty state when no devices found

## Local Development Setup
- [x] Set up local Supabase environment variables
- [x] Configure Supabase for local development
