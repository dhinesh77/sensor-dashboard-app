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
  const [showIPInput, setShowIPInput] = useState(false);
  const [tempIP, setTempIP] = useState(DEFAULT_ESP32_IP);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Load ESP32 IP from storage on mount
  useEffect(() => {
    loadStoredIP();
    // Auto-refresh sensor data every 5 seconds
    const interval = setInterval(() => {
      refreshSensorData();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Load stored ESP32 IP address
  const loadStoredIP = async () => {
    try {
      const storedIP = await AsyncStorage.getItem(ESP32_IP_STORAGE_KEY);
      if (storedIP) {
        setEsp32IP(storedIP);
        setTempIP(storedIP);
      } else {
        setTempIP(DEFAULT_ESP32_IP);
      }
    } catch (error) {
      console.error("Error loading stored IP:", error);
    }
  };

  // Save ESP32 IP to storage
  const saveESP32IP = async (ip: string) => {
    try {
      await AsyncStorage.setItem(ESP32_IP_STORAGE_KEY, ip);
      setEsp32IP(ip);
      setShowIPInput(false);
      setConnectionError(null);
      // Try to fetch data immediately after setting IP
      await refreshSensorData(ip);
    } catch (error) {
      console.error("Error saving IP:", error);
    }
  };

  // Fetch sensor data from ESP32
  const refreshSensorData = async (ipAddress?: string) => {
    setIsRefreshing(true);
    const ip = ipAddress || esp32IP;

    try {
      const url = `http://${ip}/sensor`;
      console.log("Fetching from:", url);

      const response = await fetch(url, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const data = await response.json();

      setSensorData({
        temperature: data.temperature || 0,
        humidity: data.humidity || 0,
        lastUpdated: new Date(),
      });
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
                onPress={() => setShowIPInput(!showIPInput)}
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              >
                <MaterialIcons name="settings" size={28} color={colors.primary} />
              </Pressable>
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

          {/* IP Configuration Input */}
          {showIPInput && (
            <View className="bg-surface rounded-2xl p-4 border border-border gap-3">
              <Text className="text-sm font-semibold text-foreground">Configure ESP32 IP Address</Text>
              <TextInput
                value={tempIP}
                onChangeText={setTempIP}
                placeholder="e.g., 192.168.1.100"
                placeholderTextColor={colors.muted}
                className="border border-border rounded-lg p-3 text-foreground"
                style={{ color: colors.foreground }}
              />
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => saveESP32IP(tempIP)}
                  className="flex-1 bg-primary rounded-lg p-3 items-center"
                  style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                >
                  <Text className="text-white font-semibold">Save</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setShowIPInput(false);
                    setTempIP(esp32IP);
                  }}
                  className="flex-1 bg-surface border border-border rounded-lg p-3 items-center"
                  style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                >
                  <Text className="text-foreground font-semibold">Cancel</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Connection Error Message */}
          {connectionError && (
            <View className="bg-error rounded-2xl p-4 border border-error">
              <Text className="text-sm text-white font-medium">{connectionError}</Text>
              <Text className="text-xs text-white mt-2">
                Make sure ESP32 is running and connected to WiFi. Check the IP address in settings.
              </Text>
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
