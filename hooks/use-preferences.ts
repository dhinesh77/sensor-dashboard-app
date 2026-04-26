import { useState, useEffect, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getDeviceId } from "@/lib/device-id";
import { getDevicePreferences, upsertDevicePreferences, type DevicePreferences } from "@/lib/supabase";

const DEFAULT_PREFERENCES: Omit<DevicePreferences, "id" | "updated_at"> = {
  device_id: "",
  esp32_ip: "192.168.1.33",
  esp32_hostname: "sensor-dashboard.local",
  use_hostname: true,
  alert_thresholds: { tempMin: 15, tempMax: 30, humidityMin: 30, humidityMax: 70 },
  theme_mode: "auto",
  debug_enabled: false,
  notifications_enabled: true,
};

const LOCAL_CACHE_KEY = "device_preferences_cache";

export function usePreferences() {
  const [preferences, setPreferences] = useState<Omit<DevicePreferences, "id" | "updated_at">>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const deviceIdRef = useRef<string>("");

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    setLoading(true);
    try {
      const deviceId = await getDeviceId();
      deviceIdRef.current = deviceId;

      // Try Supabase first
      const remote = await getDevicePreferences(deviceId);
      if (remote) {
        const prefs: Omit<DevicePreferences, "id" | "updated_at"> = {
          device_id: remote.device_id,
          esp32_ip: remote.esp32_ip,
          esp32_hostname: remote.esp32_hostname,
          use_hostname: remote.use_hostname,
          alert_thresholds: remote.alert_thresholds,
          theme_mode: remote.theme_mode,
          debug_enabled: remote.debug_enabled,
          notifications_enabled: remote.notifications_enabled,
        };
        setPreferences(prefs);
        await AsyncStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(prefs));
        setLoading(false);
        return;
      }

      // Fall back to local cache
      const cached = await AsyncStorage.getItem(LOCAL_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        setPreferences(parsed);
        // Sync to Supabase
        await upsertDevicePreferences(deviceId, parsed);
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
      // Try local cache as last resort
      try {
        const cached = await AsyncStorage.getItem(LOCAL_CACHE_KEY);
        if (cached) {
          setPreferences(JSON.parse(cached));
        }
      } catch {}
    }
    setLoading(false);
  };

  const updatePreferences = useCallback(
    async (updates: Partial<Omit<DevicePreferences, "id" | "device_id" | "updated_at">>) => {
      const newPrefs = { ...preferences, ...updates };
      setPreferences(newPrefs);

      // Save to local cache immediately
      try {
        await AsyncStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(newPrefs));
      } catch (error) {
        console.error("Error saving preferences locally:", error);
      }

      // Save to Supabase
      try {
        if (deviceIdRef.current) {
          await upsertDevicePreferences(deviceIdRef.current, updates);
        }
      } catch (error) {
        console.error("Error saving preferences to Supabase:", error);
      }
    },
    [preferences]
  );

  return { preferences, loading, updatePreferences, reload: loadPreferences };
}
