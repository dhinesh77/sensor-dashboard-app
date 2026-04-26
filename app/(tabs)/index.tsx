import { useState, useEffect } from "react";
import { ScrollView, Text, View, Pressable, ActivityIndicator, TextInput, Alert } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface SensorReading {
  temperature: number;
  humidity: number;
  lastUpdated: Date;
}

const ESP32_IP_STORAGE_KEY = "esp32_ip_address";
const DEFAULT_ESP32_IP = "192.168.1.100"; // Change to your ESP32 IP

/**
 * Dashboard Screen - Displays temperature and humidity sensor readings from ESP32
 */
export default function HomeScreen() {
  const colors = useColors();
  const [sensorData, setSensorData] = useState<SensorReading>({
    temperature: 0,
    humidity: 0,
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

  // Load ESP32 IP from storage on mount
  useEffect(() => {
    loadStoredIP();
    loadAlertThresholds();
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



  // Fetch sensor data from ESP32
  const refreshSensorData = async (ipAddress?: string) => {
    setIsRefreshing(true);
    const ip = ipAddress || esp32IP;
    console.log("Fetching from:", ip);

    try {
      const url = `http://${ip}/sensor`;

      const response = await fetch(url, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const data = await response.json();

      const temp = data.temperature || 0;
      const humidity = data.humidity || 0;
      setSensorData({
        temperature: temp,
        humidity: humidity,
        lastUpdated: new Date(),
      });
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
          <Pressable
            style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
          >
            <View className="bg-surface rounded-2xl p-6 border border-border shadow-sm">
              <View className="flex-row items-center gap-4">
                <View
                  className="w-16 h-16 rounded-full items-center justify-center"
                  style={{ backgroundColor: "#FF6B35" }}
                >
                  <MaterialIcons name="thermostat" size={32} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm text-muted font-medium">Temperature</Text>
                  <View className="flex-row items-baseline gap-2 mt-2">
                    <Text className="text-5xl font-bold text-foreground">
                      {sensorData.temperature.toFixed(1)}
                    </Text>
                    <Text className="text-2xl text-muted">°C</Text>
                  </View>
                </View>
              </View>
            </View>
          </Pressable>

          {/* Humidity Card */}
          <Pressable
            style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
          >
            <View className="bg-surface rounded-2xl p-6 border border-border shadow-sm">
              <View className="flex-row items-center gap-4">
                <View
                  className="w-16 h-16 rounded-full items-center justify-center"
                  style={{ backgroundColor: "#0A7EA4" }}
                >
                  <MaterialIcons name="opacity" size={32} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm text-muted font-medium">Humidity</Text>
                  <View className="flex-row items-baseline gap-2 mt-2">
                    <Text className="text-5xl font-bold text-foreground">
                      {sensorData.humidity.toFixed(0)}
                    </Text>
                    <Text className="text-2xl text-muted">%</Text>
                  </View>
                </View>
              </View>
            </View>
          </Pressable>

          {/* Spacer */}
          <View className="flex-1" />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
