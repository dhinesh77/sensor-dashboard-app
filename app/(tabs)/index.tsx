import { useEffect, useState } from "react";
import { ScrollView, Text, View, Pressable, ActivityIndicator, Platform } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface SensorReading {
  temperature: number;
  humidity: number;
  wifiSignal: number; // RSSI in dBm
  lastUpdated: Date;
}

const ESP32_IP_STORAGE_KEY = "esp32_ip_address";
const DEBUG_STORAGE_KEY = "serial_debug_enabled";
const DEFAULT_ESP32_IP = "192.168.1.33";

/**
 * Dashboard Screen - Displays temperature and humidity sensor readings from ESP32
 */
export default function HomeScreen() {
  const colors = useColors();
  const [sensorData, setSensorData] = useState<SensorReading>({
    temperature: 0,
    humidity: 0,
    wifiSignal: 0,
    lastUpdated: new Date(),
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [esp32IP, setEsp32IP] = useState(DEFAULT_ESP32_IP);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [alertThresholds, setAlertThresholds] = useState({
    tempMin: 15,
    tempMax: 30,
    humidityMin: 30,
    humidityMax: 70,
  });
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [currentIP, setCurrentIP] = useState<string | null>(null);

  // Load ESP32 IP from storage on mount
  useEffect(() => {
    loadStoredIP();
    loadAlertThresholds();
    loadDebugSetting();
    // Auto-refresh sensor data every 5 seconds
    const interval = setInterval(() => {
      refreshSensorData();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Load alert thresholds from storage
  const loadAlertThresholds = async () => {
    try {
      const stored = await AsyncStorage.getItem("alert_thresholds");
      if (stored) {
        setAlertThresholds(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Error loading thresholds:", error);
    }
  };

  // Load debug setting from storage
  const loadDebugSetting = async () => {
    try {
      const stored = await AsyncStorage.getItem(DEBUG_STORAGE_KEY);
      if (stored) {
        setDebugEnabled(stored === "true");
      }
    } catch (error) {
      console.error("Error loading debug setting:", error);
    }
  };

  // Add entry to history
  const addToHistory = async (temp: number, humidity: number) => {
    try {
      const entry = {
        timestamp: Date.now(),
        temperature: temp,
        humidity,
      };

      const stored = await AsyncStorage.getItem("sensor_history");
      let entries = stored ? JSON.parse(stored) : [];
      entries.push(entry);

      // Keep only last 24 hours (288 entries at 5-second intervals)
      if (entries.length > 288) {
        entries = entries.slice(-288);
      }

      await AsyncStorage.setItem("sensor_history", JSON.stringify(entries));
    } catch (error) {
      if (debugEnabled) console.error("Error adding history:", error);
    }
  };

  // Check if readings trigger alerts
  const checkAlerts = (temp: number, humidity: number) => {
    let alert = null;

    if (temp < alertThresholds.tempMin) {
      alert = `⚠️ Temperature too low: ${temp.toFixed(1)}°C (min: ${alertThresholds.tempMin}°C)`;
    } else if (temp > alertThresholds.tempMax) {
      alert = `⚠️ Temperature too high: ${temp.toFixed(1)}°C (max: ${alertThresholds.tempMax}°C)`;
    } else if (humidity < alertThresholds.humidityMin) {
      alert = `⚠️ Humidity too low: ${humidity.toFixed(0)}% (min: ${alertThresholds.humidityMin}%)`;
    } else if (humidity > alertThresholds.humidityMax) {
      alert = `⚠️ Humidity too high: ${humidity.toFixed(0)}% (max: ${alertThresholds.humidityMax}%)`;
    }

    setAlertMessage(alert);
  };

  // Load stored ESP32 IP address
  const loadStoredIP = async () => {
    try {
      const storedIP = await AsyncStorage.getItem(ESP32_IP_STORAGE_KEY);
      if (storedIP) {
        setEsp32IP(storedIP);
      }
    } catch (error) {
      console.error("Error loading stored IP:", error);
    }
  };



  // Get WiFi signal strength icon (using valid MaterialIcons names)
  const getWiFiIcon = (rssi: number): any => {
    if (rssi === 0) return "wifi-off";
    if (rssi > -50) return "wifi";
    if (rssi > -60) return "wifi";
    if (rssi > -70) return "wifi";
    return "wifi";
  };

  // Get WiFi signal strength color
  const getWiFiColor = (rssi: number): string => {
    if (rssi === 0) return colors.muted;
    if (rssi > -50) return colors.success;
    if (rssi > -60) return colors.primary;
    if (rssi > -70) return colors.warning;
    return colors.error;
  };

  // Fetch sensor data from ESP32 with timeout and fallback
  const fetchWithTimeout = (url: string, timeout: number = 3000): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    return fetch(url, { 
      method: "GET",
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));
  };

  const refreshSensorData = async (address?: string) => {
    setIsRefreshing(true);
    const endpoint = address || esp32IP;
    console.log("Fetching from:", endpoint);

    try {
      const url = `http://${endpoint}/sensor`;
      console.log("Trying URL:", url);
      let data;
      let connected = false;

      try {
        const res = await fetchWithTimeout(url, 3000);
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
        data = await res.json();
        connected = true;
        setCurrentIP(endpoint);
        if (debugEnabled) console.log("[DEBUG] Connected via:", endpoint);
      } catch (error) {
        if (debugEnabled) console.log("[DEBUG] Connection failed:", error);
        throw error;
      }

      if (connected && data) {
        const temp = data.temperature || 0;
        const humidity = data.humidity || 0;
        const rssi = data.rssi || 0;

        setSensorData({
          temperature: temp,
          humidity: humidity,
          wifiSignal: rssi,
          lastUpdated: new Date(),
        });

        if (debugEnabled) {
          console.log(`[DEBUG] Temp: ${temp}°C, Humidity: ${humidity}%, WiFi: ${rssi}dBm`);
        }

        await addToHistory(temp, humidity);
        checkAlerts(temp, humidity);
        setConnectionError(null);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Error fetching sensor data:", errorMessage);
      setConnectionError(`Connection failed: ${errorMessage}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Format time display
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <ScreenContainer className="p-6">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 gap-6">
          {/* Header */}
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-3xl font-bold text-foreground">Sensor Dashboard</Text>
              <Text className="text-sm text-muted mt-1">
                Last updated: {formatTime(sensorData.lastUpdated)}
              </Text>
              <Text className="text-xs text-muted mt-1">
                ESP32: {esp32IP}
              </Text>
            </View>
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => refreshSensorData()}
                disabled={isRefreshing}
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              >
                {isRefreshing ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <MaterialIcons name="refresh" size={28} color={colors.primary} />
                )}
              </Pressable>
            </View>
          </View>

          {/* Network Status Card */}
          <View className="bg-surface rounded-2xl p-4 border border-border">
            <View className="flex-row items-center justify-between gap-4">
              <View className="flex-1">
                <Text className="text-xs text-muted font-medium">Current IP Address</Text>
                <Text className="text-sm font-semibold text-foreground mt-1">
                  {currentIP || esp32IP}
                </Text>
              </View>
              <View className="items-center gap-1">
                <MaterialIcons
                  name={getWiFiIcon(sensorData.wifiSignal)}
                  size={24}
                  color={getWiFiColor(sensorData.wifiSignal)}
                />
                <Text className="text-xs text-muted">
                  {sensorData.wifiSignal !== 0 ? `${sensorData.wifiSignal}dBm` : "N/A"}
                </Text>
              </View>
            </View>
          </View>

          {/* Connection Error Message */}
          {connectionError && (
            <View className="bg-error rounded-2xl p-4 border border-error">
              <Text className="text-sm text-white font-medium">{connectionError}</Text>
              <Text className="text-xs text-white mt-2">
                {Platform.OS === "web"
                  ? "Web preview cannot access your home network. Use iOS/Android app to connect to ESP32."
                  : "Make sure ESP32 is running and connected to WiFi. Check the IP address in settings."}
              </Text>
            </View>
          )}

          {/* Alert Message */}
          {alertMessage && (
            <View className="bg-warning rounded-2xl p-4 border border-warning">
              <Text className="text-sm text-white font-medium">{alertMessage}</Text>
            </View>
          )}

          {/* Temperature & Humidity Row */}
          <View className="flex-row gap-4">
            {/* Temperature Card */}
            <View className="flex-1 bg-surface rounded-2xl p-6 border border-border gap-3">
              <Text className="text-center text-sm text-muted">Temperature</Text>
              <View className="flex-row items-center justify-center gap-2">
                <MaterialIcons name="thermostat" size={40} color="#FF6B35" />
                <View>
                  <Text className="text-3xl font-bold text-foreground">{sensorData.temperature.toFixed(1)}</Text>
                  <Text className="text-sm text-muted">°C</Text>
                </View>
              </View>
            </View>

            {/* Humidity Card */}
            <View className="flex-1 bg-surface rounded-2xl p-6 border border-border gap-3">
              <Text className="text-center text-sm text-muted">Humidity</Text>
              <View className="flex-row items-center justify-center gap-2">
                <MaterialIcons name="water-drop" size={40} color="#0066FF" />
                <View>
                  <Text className="text-3xl font-bold text-foreground">{sensorData.humidity.toFixed(0)}</Text>
                  <Text className="text-sm text-muted">%</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Spacer */}
          <View className="flex-1" />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
