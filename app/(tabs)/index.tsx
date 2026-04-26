import { useEffect, useState } from "react";
import { ScrollView, Text, View, Pressable, ActivityIndicator } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
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
const ESP32_HOSTNAME_STORAGE_KEY = "esp32_hostname";
const DEBUG_STORAGE_KEY = "serial_debug_enabled";
const DEFAULT_ESP32_IP = "192.168.1.33";
const DEFAULT_ESP32_HOSTNAME = "sensor-dashboard.local";

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
  const [esp32Hostname, setEsp32Hostname] = useState(DEFAULT_ESP32_HOSTNAME);
  const [useHostname, setUseHostname] = useState(true);
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
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [lastAlertTime, setLastAlertTime] = useState<number>(0);

  // Load ESP32 IP from storage on mount
  useEffect(() => {
    loadStoredIP();
    loadStoredHostname();
    loadAlertThresholds();
    loadDebugSetting();
    loadNotificationSetting();
    setupNotificationsHandler();
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

  // Load notification setting from storage
  const loadNotificationSetting = async () => {
    try {
      const stored = await AsyncStorage.getItem("notifications_enabled");
      if (stored) {
        setNotificationsEnabled(stored === "true");
      }
    } catch (error) {
      console.error("Error loading notification setting:", error);
    }
  };

  // Setup notifications
  const setupNotificationsHandler = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        console.log("Notification permission denied");
      }
    } catch (error) {
      console.error("Error setting up notifications:", error);
    }
  };

  // Send notification
  const sendNotification = async (title: string, body: string) => {
    if (!notificationsEnabled) return;

    const now = Date.now();
    // Throttle notifications to max 1 per 30 seconds
    if (now - lastAlertTime < 30000) return;

    setLastAlertTime(now);
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: "default",
        },
        trigger: null,
      });
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  };

  // Check if readings trigger alerts
  const checkAlerts = (temp: number, humidity: number) => {
    let alert = null;
    let notificationTitle = "";
    let notificationBody = "";

    if (temp < alertThresholds.tempMin) {
      alert = `⚠️ Temperature too low: ${temp.toFixed(1)}°C (min: ${alertThresholds.tempMin}°C)`;
      notificationTitle = "Temperature Alert";
      notificationBody = `Temperature is too low: ${temp.toFixed(1)}°C`;
    } else if (temp > alertThresholds.tempMax) {
      alert = `⚠️ Temperature too high: ${temp.toFixed(1)}°C (max: ${alertThresholds.tempMax}°C)`;
      notificationTitle = "Temperature Alert";
      notificationBody = `Temperature is too high: ${temp.toFixed(1)}°C`;
    } else if (humidity < alertThresholds.humidityMin) {
      alert = `⚠️ Humidity too low: ${humidity.toFixed(0)}% (min: ${alertThresholds.humidityMin}%)`;
      notificationTitle = "Humidity Alert";
      notificationBody = `Humidity is too low: ${humidity.toFixed(0)}%`;
    } else if (humidity > alertThresholds.humidityMax) {
      alert = `⚠️ Humidity too high: ${humidity.toFixed(0)}% (max: ${alertThresholds.humidityMax}%)`;
      notificationTitle = "Humidity Alert";
      notificationBody = `Humidity is too high: ${humidity.toFixed(0)}%`;
    }

    setAlertMessage(alert);

    // Send notification if alert is triggered
    if (alert && notificationTitle) {
      sendNotification(notificationTitle, notificationBody);
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

  // Load stored ESP32 hostname
  const loadStoredHostname = async () => {
    try {
      const storedHostname = await AsyncStorage.getItem(ESP32_HOSTNAME_STORAGE_KEY);
      if (storedHostname) {
        setEsp32Hostname(storedHostname);
        setUseHostname(true);
      }
    } catch (error) {
      console.error("Error loading hostname:", error);
    }
  };

  // Get WiFi signal strength icon
  const getWiFiIcon = (rssi: number): any => {
    if (rssi === 0) return "wifi-off";
    if (rssi > -50) return "signal-cellular-4-bar";
    if (rssi > -60) return "signal-cellular-3-bar";
    if (rssi > -70) return "signal-cellular-2-bar";
    return "signal-cellular-1-bar";
  };

  // Get WiFi signal strength color
  const getWiFiColor = (rssi: number): string => {
    if (rssi === 0) return colors.muted;
    if (rssi > -50) return colors.success;
    if (rssi > -60) return colors.primary;
    if (rssi > -70) return colors.warning;
    return colors.error;
  };

  // Fetch sensor data from ESP32
  const refreshSensorData = async (address?: string) => {
    setIsRefreshing(true);
    const endpoint = address || (useHostname ? esp32Hostname : esp32IP);
    console.log("Fetching from:", endpoint);

    try {
      const url = `http://${endpoint}/sensor`;

      const response = await fetch(url, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const data = await response.json();

      const temp = data.temperature || 0;
      const humidity = data.humidity || 0;
      const rssi = data.rssi || 0;

      setSensorData({
        temperature: temp,
        humidity: humidity,
        wifiSignal: rssi,
        lastUpdated: new Date(),
      });

      // Set current IP from the endpoint
      setCurrentIP(endpoint);

      // Log to console if debug is enabled
      if (debugEnabled) {
        console.log(`[DEBUG] Temperature: ${temp}°C, Humidity: ${humidity}%, WiFi: ${rssi}dBm`);
      }

      checkAlerts(temp, humidity);
      setConnectionError(null);
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
                ESP32: {useHostname ? esp32Hostname : esp32IP}
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
                  {currentIP || (useHostname ? esp32Hostname : esp32IP)}
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
                Make sure ESP32 is running and connected to WiFi. Check the IP address in settings.
              </Text>
            </View>
          )}

          {/* Alert Message */}
          {alertMessage && (
            <View className="bg-warning rounded-2xl p-4 border border-warning">
              <Text className="text-sm text-white font-medium">{alertMessage}</Text>
            </View>
          )}

          {/* Temperature Card */}
          <View className="bg-surface rounded-2xl p-6 border border-border">
            <View className="flex-row items-center gap-4">
              <View className="w-16 h-16 rounded-full bg-orange-100 items-center justify-center">
                <MaterialIcons name="thermostat" size={32} color="#FF6B35" />
              </View>
              <View className="flex-1">
                <Text className="text-sm text-muted font-medium">Temperature</Text>
                <Text className="text-4xl font-bold text-foreground">
                  {sensorData.temperature.toFixed(1)}
                </Text>
                <Text className="text-lg text-muted">°C</Text>
              </View>
            </View>
          </View>

          {/* Humidity Card */}
          <View className="bg-surface rounded-2xl p-6 border border-border">
            <View className="flex-row items-center gap-4">
              <View className="w-16 h-16 rounded-full bg-blue-100 items-center justify-center">
                <MaterialIcons name="opacity" size={32} color="#0A7EA4" />
              </View>
              <View className="flex-1">
                <Text className="text-sm text-muted font-medium">Humidity</Text>
                <Text className="text-4xl font-bold text-foreground">
                  {sensorData.humidity.toFixed(0)}
                </Text>
                <Text className="text-lg text-muted">%</Text>
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
