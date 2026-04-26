import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface SensorReading {
  id: string;
  temperature: number;
  humidity: number;
  rssi: number;
  recorded_at: string;
}

export interface DevicePreferences {
  id: string;
  device_id: string;
  esp32_ip: string;
  esp32_hostname: string;
  use_hostname: boolean;
  alert_thresholds: {
    tempMin: number;
    tempMax: number;
    humidityMin: number;
    humidityMax: number;
  };
  theme_mode: string;
  debug_enabled: boolean;
  notifications_enabled: boolean;
  updated_at: string;
}

export async function insertSensorReading(
  temperature: number,
  humidity: number,
  rssi: number
): Promise<SensorReading | null> {
  const { data, error } = await supabase
    .from("sensor_readings")
    .insert({ temperature, humidity, rssi })
    .select()
    .maybeSingle();

  if (error) {
    console.error("Error inserting sensor reading:", error);
    return null;
  }
  return data;
}

export async function getSensorReadings(
  hours: number = 24
): Promise<SensorReading[]> {
  const since = new Date();
  since.setHours(since.getHours() - hours);

  const { data, error } = await supabase
    .from("sensor_readings")
    .select("*")
    .gte("recorded_at", since.toISOString())
    .order("recorded_at", { ascending: true });

  if (error) {
    console.error("Error fetching sensor readings:", error);
    return [];
  }
  return data || [];
}

export async function deleteOldReadings(
  olderThanDays: number = 30
): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - olderThanDays);

  const { count, error } = await supabase
    .from("sensor_readings")
    .delete({ count: "exact" })
    .lt("recorded_at", cutoff.toISOString());

  if (error) {
    console.error("Error deleting old readings:", error);
    return 0;
  }
  return count || 0;
}

export async function clearAllReadings(): Promise<boolean> {
  const { error } = await supabase
    .from("sensor_readings")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (error) {
    console.error("Error clearing readings:", error);
    return false;
  }
  return true;
}

export async function getDevicePreferences(
  deviceId: string
): Promise<DevicePreferences | null> {
  const { data, error } = await supabase
    .from("device_preferences")
    .select("*")
    .eq("device_id", deviceId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching preferences:", error);
    return null;
  }
  return data;
}

export async function upsertDevicePreferences(
  deviceId: string,
  prefs: Partial<Omit<DevicePreferences, "id" | "device_id" | "updated_at">>
): Promise<DevicePreferences | null> {
  const { data, error } = await supabase
    .from("device_preferences")
    .upsert(
      {
        device_id: deviceId,
        ...prefs,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "device_id" }
    )
    .select()
    .maybeSingle();

  if (error) {
    console.error("Error upserting preferences:", error);
    return null;
  }
  return data;
}
