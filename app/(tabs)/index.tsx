import { useEffect, useState, useCallback } from "react";
import { ScrollView, Text, View, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { usePreferences } from "@/hooks/use-preferences";
import { insertSensorReading, deleteOldReadings } from "@/lib/supabase";

interface SensorData {
  temperature: number;
  humidity: number;
  wifiSignal: number;
  lastUpdated: Date;
}

export default function HomeScreen() {
  const colors = useColors();
  const { preferences } = usePreferences();
  const [sensorData, setSensorData] = useState<SensorData>({
    temperature: 0,
    humidity: 0,
    wifiSignal: 0,
    lastUpdated: new Date(),
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [lastAlertTime, setLastAlertTime] = useState<number>(0);
  const [initialLoad, setInitialLoad] = useState(true);

  const esp32IP = preferences.esp32_ip;
  const esp32Hostname = preferences.esp32_hostname;
  const useHostname = preferences.use_hostname;
  const alertThresholds = preferences.alert_thresholds;
  const debugEnabled = preferences.debug_enabled;
  const notificationsEnabled = preferences.notifications_enabled;

  useEffect(() => {
    setupNotificationsHandler();
    cleanupOldReadings();
  }, []);

  useEffect(() => {
    if (!initialLoad) return;
    refreshSensorData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on preferences load
  }, [preferences]);

  const cleanupOldReadings = async () => {
    try {
      await deleteOldReadings(30);
    } catch (error) {
      console.error("Error cleaning up old readings:", error);
    }
  };

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

  const sendNotification = async (title: string, body: string) => {
    if (!notificationsEnabled) return;
    const now = Date.now();
    if (now - lastAlertTime < 30000) return;
    setLastAlertTime(now);
    try {
      await Notifications.scheduleNotificationAsync({
        content: { title, body, sound: "default" },
        trigger: null,
      });
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  };

  const checkAlerts = (temp: number, humidity: number) => {
    let alert = null;
    let notificationTitle = "";
    let notificationBody = "";

    if (temp < alertThresholds.tempMin) {
      alert = `Temperature too low: ${temp.toFixed(1)}°C (min: ${alertThresholds.tempMin}°C)`;
      notificationTitle = "Temperature Alert";
      notificationBody = `Temperature is too low: ${temp.toFixed(1)}°C`;
    } else if (temp > alertThresholds.tempMax) {
      alert = `Temperature too high: ${temp.toFixed(1)}°C (max: ${alertThresholds.tempMax}°C)`;
      notificationTitle = "Temperature Alert";
      notificationBody = `Temperature is too high: ${temp.toFixed(1)}°C`;
    } else if (humidity < alertThresholds.humidityMin) {
      alert = `Humidity too low: ${humidity.toFixed(0)}% (min: ${alertThresholds.humidityMin}%)`;
      notificationTitle = "Humidity Alert";
      notificationBody = `Humidity is too low: ${humidity.toFixed(0)}%`;
    } else if (humidity > alertThresholds.humidityMax) {
      alert = `Humidity too high: ${humidity.toFixed(0)}% (max: ${alertThresholds.humidityMax}%)`;
      notificationTitle = "Humidity Alert";
      notificationBody = `Humidity is too high: ${humidity.toFixed(0)}%`;
    }

    setAlertMessage(alert);
    if (alert && notificationTitle) {
      sendNotification(notificationTitle, notificationBody);
    }
  };

  const getWiFiIcon = (rssi: number): any => {
    if (rssi === 0) return "wifi-off";
    if (rssi > -50) return "signal-cellular-4-bar";
    if (rssi > -60) return "signal-cellular-3-bar";
    if (rssi > -70) return "signal-cellular-2-bar";
    return "signal-cellular-1-bar";
  };

  const getWiFiColor = (rssi: number): string => {
    if (rssi === 0) return colors.muted;
    if (rssi > -50) return colors.success;
    if (rssi > -60) return colors.primary;
    if (rssi > -70) return colors.warning;
    return colors.error;
  };

  const refreshSensorData = useCallback(async () => {
    setIsRefreshing(true);
    const endpoint = useHostname ? esp32Hostname : esp32IP;

    try {
      const url = `http://${endpoint}/sensor`;
      const response = await fetch(url, { method: "GET" });

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

      if (debugEnabled) {
        console.log(`[DEBUG] Temperature: ${temp}°C, Humidity: ${humidity}%, WiFi: ${rssi}dBm`);
      }

      insertSensorReading(temp, humidity, rssi).catch((err) =>
        console.error("Failed to save reading:", err)
      );

      checkAlerts(temp, humidity);
      setConnectionError(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Error fetching sensor data:", errorMessage);
      setConnectionError(`Connection failed: ${errorMessage}`);
    } finally {
      setIsRefreshing(false);
      setInitialLoad(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- checkAlerts is stable enough for this use case
  }, [useHostname, esp32Hostname, esp32IP, debugEnabled, alertThresholds]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const currentEndpoint = useHostname ? esp32Hostname : esp32IP;

  return (
    <ScreenContainer className="p-6">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshSensorData}
            tintColor={colors.primary}
          />
        }
      >
        <View className="flex-1 gap-6">
          {/* Header */}
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-3xl font-bold text-foreground">Sensor Dashboard</Text>
              <Text className="text-sm text-muted mt-1">
                Last updated: {formatTime(sensorData.lastUpdated)}
              </Text>
              <Text className="text-xs text-muted mt-1">
                ESP32: {currentEndpoint}
              </Text>
            </View>
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

          {/* Initial Loading State */}
          {initialLoad && connectionError === null && sensorData.temperature === 0 && (
            <View className="items-center py-12 gap-3">
              <ActivityIndicator size="large" color={colors.primary} />
              <Text className="text-sm text-muted">Connecting to sensor...</Text>
            </View>
          )}

          {/* Network Status Card */}
          <View className="bg-surface rounded-2xl p-4 border border-border">
            <View className="flex-row items-center justify-between gap-4">
              <View className="flex-1">
                <Text className="text-xs text-muted font-medium">Current IP Address</Text>
                <Text className="text-sm font-semibold text-foreground mt-1">
                  {currentEndpoint}
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
            <View className="rounded-2xl p-4 border" style={{ backgroundColor: "rgba(239,68,68,0.1)", borderColor: colors.error }}>
              <Text className="text-sm font-medium" style={{ color: colors.error }}>{connectionError}</Text>
              <Text className="text-xs mt-2" style={{ color: colors.muted }}>
                Make sure ESP32 is running and connected to WiFi. Check the IP address in settings.
              </Text>
            </View>
          )}

          {/* Alert Message */}
          {alertMessage && (
            <View className="rounded-2xl p-4 border" style={{ backgroundColor: "rgba(245,158,11,0.1)", borderColor: colors.warning }}>
              <Text className="text-sm font-medium" style={{ color: colors.warning }}>{alertMessage}</Text>
            </View>
          )}

          {/* Temperature Card */}
          <View className="bg-surface rounded-2xl p-6 border border-border">
            <View className="flex-row items-center gap-4">
              <View className="w-16 h-16 rounded-full items-center justify-center" style={{ backgroundColor: "rgba(255,107,53,0.1)" }}>
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
              <View className="w-16 h-16 rounded-full items-center justify-center" style={{ backgroundColor: "rgba(10,126,164,0.1)" }}>
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
