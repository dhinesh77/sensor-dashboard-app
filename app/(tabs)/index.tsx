import { useState, useEffect } from "react";
import { ScrollView, Text, View, Pressable, ActivityIndicator } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

interface SensorReading {
  temperature: number;
  humidity: number;
  lastUpdated: Date;
}

/**
 * Dashboard Screen - Displays temperature and humidity sensor readings
 */
export default function HomeScreen() {
  const colors = useColors();
  const [sensorData, setSensorData] = useState<SensorReading>({
    temperature: 24,
    humidity: 65,
    lastUpdated: new Date(),
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Simulate fetching sensor data
  const refreshSensorData = async () => {
    setIsRefreshing(true);
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Generate mock data with slight variation
    setSensorData({
      temperature: 20 + Math.random() * 10,
      humidity: 50 + Math.random() * 40,
      lastUpdated: new Date(),
    });

    setIsRefreshing(false);
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
            </View>
            <Pressable
              onPress={refreshSensorData}
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
