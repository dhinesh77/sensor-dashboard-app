import { ScrollView, Text, View, Pressable, Alert } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

interface HistoryEntry {
  timestamp: number;
  temperature: number;
  humidity: number;
}

const HISTORY_STORAGE_KEY = "sensor_history";
const MAX_HISTORY_ENTRIES = 288; // 24 hours at 5-second intervals

export default function HistoryScreen() {
  const colors = useColors();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [stats, setStats] = useState({
    tempMin: 0,
    tempMax: 0,
    tempAvg: 0,
    humidityMin: 0,
    humidityMax: 0,
    humidityAvg: 0,
  });

  useEffect(() => {
    loadHistory();
  }, []);

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

  const addEntry = async (temperature: number, humidity: number) => {
    try {
      const entry: HistoryEntry = {
        timestamp: Date.now(),
        temperature,
        humidity,
      };

      let entries = history;
      entries.push(entry);

      // Keep only last 24 hours
      if (entries.length > MAX_HISTORY_ENTRIES) {
        entries = entries.slice(-MAX_HISTORY_ENTRIES);
      }

      await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries));
      setHistory(entries);
      calculateStats(entries);
    } catch (error) {
      console.error("Error adding history entry:", error);
    }
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

  const StatCard = ({
    icon,
    label,
    value,
    unit,
    color,
  }: {
    icon: string;
    label: string;
    value: number;
    unit: string;
    color: string;
  }) => (
    <View className="flex-1 bg-surface rounded-2xl p-4 border border-border items-center">
      <MaterialIcons name={icon as any} size={24} color={color} />
      <Text className="text-xs text-muted mt-2">{label}</Text>
      <Text className="text-2xl font-bold text-foreground mt-1">
        {value.toFixed(1)}
        <Text className="text-sm">{unit}</Text>
      </Text>
    </View>
  );

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
            {history.length > 0 && (
              <Pressable
                onPress={clearHistory}
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              >
                <MaterialIcons name="delete" size={24} color={colors.error} />
              </Pressable>
            )}
          </View>

          {history.length === 0 ? (
            <View className="flex-1 items-center justify-center gap-4">
              <MaterialIcons name="history" size={48} color={colors.muted} />
              <Text className="text-lg font-semibold text-foreground">No data yet</Text>
              <Text className="text-sm text-muted text-center">
                Historical data will appear here as sensor readings are collected
              </Text>
            </View>
          ) : (
            <>
              {/* Temperature Stats */}
              <View className="gap-3">
                <View className="flex-row items-center gap-2">
                  <MaterialIcons name="thermostat" size={24} color="#FF6B35" />
                  <Text className="text-lg font-semibold text-foreground">Temperature</Text>
                </View>
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
              </View>

              {/* Humidity Stats */}
              <View className="gap-3">
                <View className="flex-row items-center gap-2">
                  <MaterialIcons name="opacity" size={24} color="#0066FF" />
                  <Text className="text-lg font-semibold text-foreground">Humidity</Text>
                </View>
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
              </View>

              {/* Data Points */}
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


