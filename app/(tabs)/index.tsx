import { useEffect, useState, useRef, useCallback } from "react";
import { ScrollView, Text, View, Pressable, ActivityIndicator, Platform } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { useFocusEffect } from "expo-router";
import { useQuery } from "@tanstack/react-query";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

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
  const [esp32IP, setEsp32IP] = useState(DEFAULT_ESP32_IP);
  const [alertThresholds, setAlertThresholds] = useState({
    tempMin: 15,
    tempMax: 30,
    humidityMin: 30,
    humidityMax: 70,
  });
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [currentIP, setCurrentIP] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const thresholdsRef = useRef(alertThresholds);
  const notificationsRef = useRef(notificationsEnabled);
  const ipRef = useRef(esp32IP);
  const lastAlertRef = useRef<string | null>(null);

  useEffect(() => {
    thresholdsRef.current = alertThresholds;
    notificationsRef.current = notificationsEnabled;
    ipRef.current = esp32IP;
  }, [alertThresholds, notificationsEnabled, esp32IP]);

  useFocusEffect(
    useCallback(() => {
      loadAlertThresholds();
      loadNotificationSetting();
      loadStoredIP();
    }, [])
  );

  const loadNotificationSetting = async () => {
    try {
      const stored = await AsyncStorage.getItem("notifications_enabled");
      if (stored) {
        setNotificationsEnabled(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Error loading notification setting:", error);
    }
  };

  // Load settings on mount
  useEffect(() => {
    const requestPermissions = async () => {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        await Notifications.requestPermissionsAsync();
      }
    };
    requestPermissions();

    loadStoredIP();
    loadAlertThresholds();
    loadDebugSetting();
    loadNotificationSetting();
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
  const checkAlerts = async (temp: number, humidity: number) => {
    let alert = null;
    let alertKey = null;
    const currentThresholds = thresholdsRef.current;

    if (temp < currentThresholds.tempMin) {
      alert = `⚠️ Temperature too low: ${temp.toFixed(1)}°C (min: ${currentThresholds.tempMin}°C)`;
      alertKey = 'temp_low';
    } else if (temp > currentThresholds.tempMax) {
      alert = `⚠️ Temperature too high: ${temp.toFixed(1)}°C (max: ${currentThresholds.tempMax}°C)`;
      alertKey = 'temp_high';
    } else if (humidity < currentThresholds.humidityMin) {
      alert = `⚠️ Humidity too low: ${humidity.toFixed(0)}% (min: ${currentThresholds.humidityMin}%)`;
      alertKey = 'hum_low';
    } else if (humidity > currentThresholds.humidityMax) {
      alert = `⚠️ Humidity too high: ${humidity.toFixed(0)}% (max: ${currentThresholds.humidityMax}%)`;
      alertKey = 'hum_high';
    }

    setAlertMessage(alert);

    // Send local notification if enabled and state changed
    if (alert && alertKey !== lastAlertRef.current && notificationsRef.current) {
      lastAlertRef.current = alertKey;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Sensor Alert",
          body: alert.replace("⚠️ ", ""), // remove emoji for system notification
          sound: true,
        },
        trigger: null, // Send immediately
      });
    } else if (!alert) {
      lastAlertRef.current = null;
    }
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

  const fetchSensorData = async (): Promise<SensorReading> => {
    const endpoint = ipRef.current;
    if (debugEnabled) console.log("Fetching from:", endpoint);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    try {
      const url = `http://${endpoint}/sensor`;
      const res = await fetch(url, { method: "GET", signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      const data = await res.json();
      
      const temp = data.temperature || 0;
      const humidity = data.humidity || 0;
      const rssi = data.rssi || 0;

      if (debugEnabled) {
        console.log(`[DEBUG] Temp: ${temp}°C, Humidity: ${humidity}%, WiFi: ${rssi}dBm`);
      }

      setCurrentIP(endpoint);
      await addToHistory(temp, humidity);
      await checkAlerts(temp, humidity);

      return {
        temperature: temp,
        humidity: humidity,
        wifiSignal: rssi,
        lastUpdated: new Date(),
      };
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const { data: queryData, error: queryError, isFetching, refetch } = useQuery({
    queryKey: ['sensorData', esp32IP],
    queryFn: fetchSensorData,
    refetchInterval: 5000,
    retry: 1,
  });

  const displayData = queryData || {
    temperature: 0,
    humidity: 0,
    wifiSignal: 0,
    lastUpdated: new Date(),
  };

  const connectionError = queryError ? `Connection failed: ${queryError instanceof Error ? queryError.message : "Unknown error"}` : null;

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
                Last updated: {formatTime(displayData.lastUpdated)}
              </Text>
              <Text className="text-xs text-muted mt-1">
                ESP32: {esp32IP}
              </Text>
            </View>
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => refetch()}
                disabled={isFetching}
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              >
                {isFetching ? (
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
                  name={getWiFiIcon(displayData.wifiSignal)}
                  size={24}
                  color={getWiFiColor(displayData.wifiSignal)}
                />
                <Text className="text-xs text-muted">
                  {displayData.wifiSignal !== 0 ? `${displayData.wifiSignal}dBm` : "N/A"}
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
                  <Text className="text-3xl font-bold text-foreground">{displayData.temperature.toFixed(1)}</Text>
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
                  <Text className="text-3xl font-bold text-foreground">{displayData.humidity.toFixed(0)}</Text>
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
