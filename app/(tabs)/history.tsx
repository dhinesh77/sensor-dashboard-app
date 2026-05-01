import { ScrollView, Text, View, Pressable, Alert, Dimensions } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { LineChart } from "react-native-chart-kit";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface HistoryEntry {
  timestamp: number;
  temperature: number;
  humidity: number;
}

const HISTORY_STORAGE_KEY = "sensor_history";

export default function HistoryScreen() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [stats, setStats] = useState({
    tempMin: 0,
    tempMax: 0,
    tempAvg: 0,
    humidityMin: 0,
    humidityMax: 0,
    humidityAvg: 0,
  });

  // Reload history each time the tab is focused
  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  const loadHistory = async () => {
    try {
      const stored = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);
      if (stored) {
        const entries = JSON.parse(stored) as HistoryEntry[];
        setHistory(entries);
        calculateStats(entries);
      }
    } catch (error) {
      console.error("Error loading history:", error);
    }
  };

  const calculateStats = (entries: HistoryEntry[]) => {
    if (entries.length === 0) return;

    const temps = entries.map((e) => e.temperature);
    const humidities = entries.map((e) => e.humidity);

    setStats({
      tempMin: Math.min(...temps),
      tempMax: Math.max(...temps),
      tempAvg: temps.reduce((a, b) => a + b, 0) / temps.length,
      humidityMin: Math.min(...humidities),
      humidityMax: Math.max(...humidities),
      humidityAvg: humidities.reduce((a, b) => a + b, 0) / humidities.length,
    });
  };

  const clearHistory = () => {
    Alert.alert("Clear History", "Are you sure you want to clear all historical data?", [
      { text: "Cancel", onPress: () => {} },
      {
        text: "Clear",
        onPress: async () => {
          try {
            await AsyncStorage.removeItem(HISTORY_STORAGE_KEY);
            setHistory([]);
            setStats({
              tempMin: 0,
              tempMax: 0,
              tempAvg: 0,
              humidityMin: 0,
              humidityMax: 0,
              humidityAvg: 0,
            });
          } catch (error) {
            console.error("Error clearing history:", error);
          }
        },
      },
    ]);
  };

  const generateMockData = async () => {
    try {
      const now = Date.now();
      const mockEntries: HistoryEntry[] = [];
      for (let i = 24; i >= 0; i--) {
        mockEntries.push({
          timestamp: now - i * 60 * 60 * 1000,
          temperature: 20 + Math.sin(i / 3) * 5 + Math.random() * 2,
          humidity: 50 + Math.cos(i / 4) * 15 + Math.random() * 5,
        });
      }
      await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(mockEntries));
      setHistory(mockEntries);
      calculateStats(mockEntries);
    } catch (error) {
      console.error("Error generating mock data:", error);
    }
  };

  // Downsample history entries for the chart (max ~30 points for readability)
  const getChartData = (entries: HistoryEntry[], key: "temperature" | "humidity") => {
    if (entries.length === 0) return { labels: [] as string[], data: [] as number[] };

    const maxPoints = 30;
    const step = Math.max(1, Math.floor(entries.length / maxPoints));
    const sampled = entries.filter((_, i) => i % step === 0);

    // Only show ~6 time labels to avoid crowding
    const labelStep = Math.max(1, Math.floor(sampled.length / 6));

    const labels = sampled.map((entry, i) => {
      if (i % labelStep === 0) {
        const d = new Date(entry.timestamp);
        return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
      }
      return "";
    });

    const data = sampled.map((e) => e[key]);

    return { labels, data };
  };

  const screenWidth = Dimensions.get("window").width - 48; // account for padding

  const isDark = colorScheme === "dark";

  const tempChartConfig = {
    backgroundGradientFrom: isDark ? "#1E1E2E" : "#FFF5F0",
    backgroundGradientTo: isDark ? "#2A1A1A" : "#FFFFFF",
    decimalPlaces: 1,
    color: (_opacity = 1) => "#FF6B35",
    labelColor: () => colors.muted,
    propsForDots: {
      r: "3",
      strokeWidth: "1",
      stroke: "#FF6B35",
    },
    propsForBackgroundLines: {
      stroke: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
    },
    style: {
      borderRadius: 16,
    },
  };

  const humidityChartConfig = {
    backgroundGradientFrom: isDark ? "#1E1E2E" : "#F0F7FF",
    backgroundGradientTo: isDark ? "#1A1A2A" : "#FFFFFF",
    decimalPlaces: 0,
    color: (_opacity = 1) => "#0066FF",
    labelColor: () => colors.muted,
    propsForDots: {
      r: "3",
      strokeWidth: "1",
      stroke: "#0066FF",
    },
    propsForBackgroundLines: {
      stroke: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
    },
    style: {
      borderRadius: 16,
    },
  };

  const StatCard = ({
    icon,
    label,
    value,
    unit,
    color: cardColor,
  }: {
    icon: string;
    label: string;
    value: number;
    unit: string;
    color: string;
  }) => (
    <View className="flex-1 bg-surface rounded-2xl p-4 border border-border items-center">
      <MaterialIcons name={icon as any} size={24} color={cardColor} />
      <Text className="text-xs text-muted mt-2">{label}</Text>
      <Text className="text-2xl font-bold text-foreground mt-1">
        {value.toFixed(1)}
        <Text className="text-sm">{unit}</Text>
      </Text>
    </View>
  );

  const tempChart = getChartData(history, "temperature");
  const humidityChart = getChartData(history, "humidity");

  return (
    <ScreenContainer className="p-6">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 gap-6">
          {/* Header */}
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-3xl font-bold text-foreground">History</Text>
              <Text className="text-sm text-muted mt-1">
                {history.length} readings recorded
              </Text>
            </View>
            <View className="flex-row gap-3">
              <Pressable
                onPress={generateMockData}
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              >
                <MaterialIcons name="add-chart" size={24} color={colors.primary} />
              </Pressable>
              <Pressable
                onPress={loadHistory}
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              >
                <MaterialIcons name="refresh" size={24} color={colors.primary} />
              </Pressable>
              {history.length > 0 && (
                <Pressable
                  onPress={clearHistory}
                  style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                >
                  <MaterialIcons name="delete" size={24} color={colors.error} />
                </Pressable>
              )}
            </View>
          </View>

          {history.length === 0 ? (
            <View className="flex-1 items-center justify-center gap-4">
              <MaterialIcons name="history" size={48} color={colors.muted} />
              <Text className="text-lg font-semibold text-foreground">No data yet</Text>
              <Text className="text-sm text-muted text-center max-w-xs">
                Historical data will appear here as sensor readings are collected, or generate mock data to preview charts right now.
              </Text>
              <Pressable
                onPress={generateMockData}
                className="mt-4 bg-primary px-6 py-3 rounded-xl flex-row items-center gap-2"
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              >
                <MaterialIcons name="add-chart" size={20} color="white" />
                <Text className="text-white font-semibold">Generate Sample Data</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* Temperature Chart */}
              <View className="gap-3">
                <View className="flex-row items-center gap-2">
                  <MaterialIcons name="thermostat" size={24} color="#FF6B35" />
                  <Text className="text-lg font-semibold text-foreground">Temperature Trend</Text>
                </View>
                {tempChart.data.length > 1 ? (
                  <View className="bg-surface rounded-2xl border border-border overflow-hidden">
                    <LineChart
                      data={{
                        labels: tempChart.labels,
                        datasets: [{ data: tempChart.data }],
                      }}
                      width={screenWidth}
                      height={200}
                      chartConfig={tempChartConfig}
                      bezier
                      style={{ borderRadius: 16 }}
                      withInnerLines={true}
                      withOuterLines={false}
                      withVerticalLines={false}
                      yAxisSuffix="°"
                      fromZero={false}
                    />
                  </View>
                ) : (
                  <View className="bg-surface rounded-2xl p-6 border border-border items-center">
                    <Text className="text-sm text-muted">Need at least 2 readings for a chart</Text>
                  </View>
                )}
              </View>

              {/* Temperature Stats */}
              <View className="flex-row gap-2">
                <StatCard
                  icon="arrow-downward"
                  label="Min"
                  value={stats.tempMin}
                  unit="°C"
                  color="#FF6B35"
                />
                <StatCard
                  icon="trending-up"
                  label="Avg"
                  value={stats.tempAvg}
                  unit="°C"
                  color="#FF6B35"
                />
                <StatCard
                  icon="arrow-upward"
                  label="Max"
                  value={stats.tempMax}
                  unit="°C"
                  color="#FF6B35"
                />
              </View>

              {/* Humidity Chart */}
              <View className="gap-3">
                <View className="flex-row items-center gap-2">
                  <MaterialIcons name="opacity" size={24} color="#0066FF" />
                  <Text className="text-lg font-semibold text-foreground">Humidity Trend</Text>
                </View>
                {humidityChart.data.length > 1 ? (
                  <View className="bg-surface rounded-2xl border border-border overflow-hidden">
                    <LineChart
                      data={{
                        labels: humidityChart.labels,
                        datasets: [{ data: humidityChart.data }],
                      }}
                      width={screenWidth}
                      height={200}
                      chartConfig={humidityChartConfig}
                      bezier
                      style={{ borderRadius: 16 }}
                      withInnerLines={true}
                      withOuterLines={false}
                      withVerticalLines={false}
                      yAxisSuffix="%"
                      fromZero={false}
                    />
                  </View>
                ) : (
                  <View className="bg-surface rounded-2xl p-6 border border-border items-center">
                    <Text className="text-sm text-muted">Need at least 2 readings for a chart</Text>
                  </View>
                )}
              </View>

              {/* Humidity Stats */}
              <View className="flex-row gap-2">
                <StatCard
                  icon="arrow-downward"
                  label="Min"
                  value={stats.humidityMin}
                  unit="%"
                  color="#0066FF"
                />
                <StatCard
                  icon="trending-up"
                  label="Avg"
                  value={stats.humidityAvg}
                  unit="%"
                  color="#0066FF"
                />
                <StatCard
                  icon="arrow-upward"
                  label="Max"
                  value={stats.humidityMax}
                  unit="%"
                  color="#0066FF"
                />
              </View>

              {/* Recent Readings */}
              <View className="gap-3">
                <Text className="text-sm font-semibold text-foreground">Recent Readings</Text>
                <View className="bg-surface rounded-2xl p-4 border border-border max-h-48">
                  <ScrollView>
                    {history
                      .slice()
                      .reverse()
                      .slice(0, 10)
                      .map((entry, index) => (
                        <View
                          key={index}
                          className="flex-row justify-between items-center py-2 border-b border-border last:border-b-0"
                        >
                          <Text className="text-xs text-muted">
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </Text>
                          <View className="flex-row gap-4">
                            <Text className="text-sm font-semibold text-foreground">
                              {entry.temperature.toFixed(1)}°C
                            </Text>
                            <Text className="text-sm font-semibold text-foreground">
                              {entry.humidity.toFixed(0)}%
                            </Text>
                          </View>
                        </View>
                      ))}
                  </ScrollView>
                </View>
              </View>
            </>
          )}

          {/* Spacer */}
          <View className="flex-1" />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
