# Sensor Dashboard - Mobile App Design

## Overview
A clean, mobile-first dashboard app displaying real-time temperature and humidity sensor readings in card-based layout. Designed for portrait orientation (9:16) with one-handed usage in mind.

## Screen List

### 1. Dashboard (Home Screen)
The primary screen showing sensor readings in a card-based layout.

**Content & Functionality:**
- Header with app title "Sensor Dashboard"
- Two main sensor cards displayed vertically:
  - **Temperature Card**: Shows current temperature value with large readable text, thermometer icon, and unit (°C or °F)
  - **Humidity Card**: Shows current humidity percentage with large readable text, droplet icon, and unit (%)
- Each card displays:
  - Sensor name/label
  - Current reading value in large, bold typography
  - Unit indicator
  - Visual icon representing the sensor type
  - Optional: Last updated timestamp
- Refresh button to manually update readings
- Cards have subtle shadows and rounded corners for elevation

## Primary Content & Functionality

### Temperature Card
- **Icon**: Thermometer symbol
- **Display**: Large temperature value (e.g., "24°C")
- **Color Accent**: Warm color (orange/red tones) to represent temperature
- **Layout**: Icon on left, value and label stacked on right
- **Tap Action**: Optional detail view showing temperature history or trends

### Humidity Card
- **Icon**: Water droplet symbol
- **Display**: Large humidity percentage (e.g., "65%")
- **Color Accent**: Cool color (blue tones) to represent moisture
- **Layout**: Icon on left, value and label stacked on right
- **Tap Action**: Optional detail view showing humidity history or trends

## Key User Flows

### Primary Flow: View Current Readings
1. User opens app
2. Dashboard loads with current temperature and humidity readings
3. Cards display sensor data in prominent, easy-to-read format
4. User can glance at readings at a glance

### Secondary Flow: Refresh Data
1. User taps refresh button (or pulls to refresh)
2. App fetches latest sensor readings
3. Cards update with new values
4. Optional: Brief loading indicator during fetch

## Color Choices

| Element | Light Mode | Dark Mode | Purpose |
|---------|-----------|-----------|---------|
| **Primary Background** | #FFFFFF | #151718 | Main screen background |
| **Surface (Cards)** | #F5F5F5 | #1E2022 | Card backgrounds |
| **Temperature Accent** | #FF6B35 | #FF8C42 | Warm color for temperature |
| **Humidity Accent** | #0A7EA4 | #0A9FD9 | Cool color for humidity |
| **Text Primary** | #11181C | #ECEDEE | Main text |
| **Text Secondary** | #687076 | #9BA1A6 | Secondary text |
| **Border** | #E5E7EB | #334155 | Card borders |

## Layout Specifications

### Dashboard Grid
- **Spacing**: 16px padding on sides, 24px gap between cards
- **Card Size**: Full width minus padding (~90% of screen width)
- **Card Height**: ~160px each card
- **Rounded Corners**: 16px border radius
- **Shadow**: Subtle elevation (iOS-style)

### Typography
- **Header**: 28px, bold, primary text color
- **Card Label**: 14px, secondary text color
- **Card Value**: 48px, bold, primary text color
- **Unit**: 18px, secondary text color

## Interaction Design
- **Press Feedback**: Cards show 0.97 scale on press with subtle opacity change
- **Refresh Button**: Located at top-right, shows loading state during fetch
- **No Loading Skeleton**: Display last known values while refreshing for smooth UX
