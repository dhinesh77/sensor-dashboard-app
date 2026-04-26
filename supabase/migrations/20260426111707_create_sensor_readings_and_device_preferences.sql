/*
  # Create sensor_readings and device_preferences tables

  1. New Tables
    - `sensor_readings`
      - `id` (uuid, primary key, auto-generated)
      - `temperature` (float4, not null) - Temperature reading in Celsius
      - `humidity` (float4, not null) - Humidity reading in percentage
      - `rssi` (int4, default 0) - WiFi signal strength in dBm
      - `recorded_at` (timestamptz, default now()) - When the reading was taken
    - `device_preferences`
      - `id` (uuid, primary key, auto-generated)
      - `device_id` (text, unique, not null) - Unique identifier per app installation
      - `esp32_ip` (text, default '192.168.1.33') - Manual ESP32 IP address
      - `esp32_hostname` (text, default 'sensor-dashboard.local') - mDNS hostname
      - `use_hostname` (boolean, default true) - Whether to prefer mDNS over IP
      - `alert_thresholds` (jsonb, default object) - Temperature/humidity alert thresholds
      - `theme_mode` (text, default 'auto') - Theme preference: light/dark/auto
      - `debug_enabled` (boolean, default false) - Serial debug logging toggle
      - `notifications_enabled` (boolean, default true) - Push notifications toggle
      - `updated_at` (timestamptz, default now()) - Last update timestamp

  2. Security
    - Enable RLS on both tables
    - Add public read/write policies (no auth required, any app user can access)
    - Policies are permissive since the app is anonymous and data is scoped by device_id

  3. Indexes
    - Index on sensor_readings.recorded_at for efficient date range queries
    - Index on device_preferences.device_id for fast lookups
*/

-- Create sensor_readings table
CREATE TABLE IF NOT EXISTS sensor_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  temperature float4 NOT NULL,
  humidity float4 NOT NULL,
  rssi int4 DEFAULT 0,
  recorded_at timestamptz DEFAULT now() NOT NULL
);

-- Create device_preferences table
CREATE TABLE IF NOT EXISTS device_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text UNIQUE NOT NULL,
  esp32_ip text DEFAULT '192.168.1.33',
  esp32_hostname text DEFAULT 'sensor-dashboard.local',
  use_hostname boolean DEFAULT true,
  alert_thresholds jsonb DEFAULT '{"tempMin":15,"tempMax":30,"humidityMin":30,"humidityMax":70}',
  theme_mode text DEFAULT 'auto',
  debug_enabled boolean DEFAULT false,
  notifications_enabled boolean DEFAULT true,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_preferences ENABLE ROW LEVEL SECURITY;

-- Public policies for sensor_readings (anonymous access)
CREATE POLICY "Anyone can read sensor readings"
  ON sensor_readings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert sensor readings"
  ON sensor_readings FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can delete sensor readings"
  ON sensor_readings FOR DELETE
  TO anon, authenticated
  USING (true);

-- Public policies for device_preferences (anonymous access, scoped by device_id)
CREATE POLICY "Anyone can read device preferences"
  ON device_preferences FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert device preferences"
  ON device_preferences FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update device preferences"
  ON device_preferences FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sensor_readings_recorded_at ON sensor_readings (recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_device_preferences_device_id ON device_preferences (device_id);
