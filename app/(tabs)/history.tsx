import { useState, useEffect, useCallback } from "react";
import { ScrollView, Text, View, Pressable, ActivityIndicator, Alert } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { SensorChart } from "@/components/sensor-chart";
import { getSensorReadings, clearAllReadings, type SensorReading } from "@/lib/supabase";

type DateRange = "today" | "7days" | "30days";

const DATE_RANGE_HOURS: Record<DateRange, number> = {
  today: 24,
  "7days": 168,
  "30days": 720,
};

export default function HistoryScreen() {
  const colors = useColors();
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>("today");
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  const fetchReadings = useCallback(async () => {
    setLoading(true);
    try {
      const hours = DATE_RANGE_HOURS[dateRange];
      const data = await getSensorReadings(hours);
      setReadings(data);
    } catch (error) {
      console.error("Error fetching readings:", error);
    }
    setLoading(false);
  }, [dateRange]);

  useEffect(() => {
    fetchReadings();
  }, [fetchReadings]);

  const handleClearHistory = () => {
    Alert.alert("Clear History", "This will permanently delete all sensor readings. Continue?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear All",
        style: "destructive",
        onPress: async () => {
          setClearing(true);
          const success = await clearAllReadings();
          setClearing(false);
          if (success) {
            setReadings([]);
            Alert.alert("Done", "All sensor readings have been deleted.");
          } else {
            Alert.alert("Error", "Failed to clear readings. Please try again.");
          }
        },
      },
    ]);
  };

  const tempChartData = readings.map((r) => ({
    value: r.temperature,
    label: formatChartLabel(r.recorded_at, dateRange),
  }));

  const humidityChartData = readings.map((r) => ({
    value: r.humidity,
    label: formatChartLabel(r.recorded_at, dateRange),
  }));

  const groupedReadings = groupByDate(readings);

  return (
    <ScreenContainer className="p-6">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 gap-6">
          {/* Header */}
          <View>
            <Text className="text-3xl font-bold text-foreground">History</Text>
            <Text className="text-sm text-muted mt-1">
              {readings.length} reading{readings.length !== 1 ? "s" : ""} recorded
            </Text>
          </View>

          {/* Date Range Selector */}
          <View className="flex-row gap-2">
            {(["today", "7days", "30days"] as DateRange[]).map((range) => (
              <Pressable
                key={range}
                onPress={() => setDateRange(range)}
                className={`flex-1 rounded-lg p-3 items-center border ${
                  dateRange === range ? "bg-primary/10 border-primary" : "bg-surface border-border"
                }`}
                style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
              >
                <Text
                  className={`text-sm font-semibold ${
                    dateRange === range ? "text-primary" : "text-foreground"
                  }`}
                >
                  {range === "today" ? "Today" : range === "7days" ? "7 Days" : "30 Days"}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Loading State */}
          {loading ? (
            <View className="items-center py-12">
              <ActivityIndicator size="large" color={colors.primary} />
              <Text className="text-sm text-muted mt-4">Loading readings...</Text>
            </View>
          ) : readings.length === 0 ? (
            /* Empty State */
            <View className="items-center py-16 gap-4">
              <View className="w-20 h-20 rounded-full bg-surface items-center justify-center">
                <MaterialIcons name="timeline" size={40} color={colors.muted} />
              </View>
              <Text className="text-lg font-semibold text-foreground">No Readings Yet</Text>
              <Text className="text-sm text-muted text-center px-8">
                Sensor readings will appear here once the dashboard starts collecting data from your ESP32.
              </Text>
            </View>
          ) : (
            <>
              {/* Temperature Chart */}
              <SensorChart
                data={tempChartData}
                color="#FF6B35"
                unit="°C"
                title="Temperature"
              />

              {/* Humidity Chart */}
              <SensorChart
                data={humidityChartData}
                color="#0A7EA4"
                unit="%"
                title="Humidity"
              />

              {/* Readings List */}
              <View className="gap-3">
                <Text className="text-lg font-semibold text-foreground">Readings</Text>
                {groupedReadings.map((group) => (
                  <View key={group.date} className="gap-2">
                    <Text className="text-xs font-semibold text-muted mt-2">{group.date}</Text>
                    {group.readings.map((reading) => (
                      <View
                        key={reading.id}
                        className="bg-surface rounded-xl p-4 border border-border flex-row items-center justify-between"
                      >
                        <View className="flex-row items-center gap-3 flex-1">
                          <View className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: "rgba(255,107,53,0.1)" }}>
                            <MaterialIcons name="thermostat" size={20} color="#FF6B35" />
                          </View>
                          <View>
                            <Text className="text-sm font-semibold text-foreground">
                              {reading.temperature.toFixed(1)}°C
                            </Text>
                            <Text className="text-xs text-muted">
                              {formatTime(reading.recorded_at)}
                            </Text>
                          </View>
                        </View>
                        <View className="flex-row items-center gap-3">
                          <View className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: "rgba(10,126,164,0.1)" }}>
                            <MaterialIcons name="opacity" size={20} color="#0A7EA4" />
                          </View>
                          <View>
                            <Text className="text-sm font-semibold text-foreground">
                              {reading.humidity.toFixed(0)}%
                            </Text>
                            <Text className="text-xs text-muted">
                              {reading.rssi !== 0 ? `${reading.rssi}dBm` : "N/A"}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                ))}
              </View>

              {/* Clear History Button */}
              <Pressable
                onPress={handleClearHistory}
                disabled={clearing}
                className="bg-surface border border-error rounded-lg p-4 items-center"
                style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
              >
                {clearing ? (
                  <ActivityIndicator size="small" color={colors.error} />
                ) : (
                  <View className="flex-row items-center gap-2">
                    <MaterialIcons name="delete-outline" size={20} color={colors.error} />
                    <Text className="text-error font-semibold">Clear All History</Text>
                  </View>
                )}
              </Pressable>
            </>
          )}

          {/* Spacer */}
          <View className="flex-1" />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function formatChartLabel(isoString: string, range: DateRange): string {
  const date = new Date(isoString);
  if (range === "today") {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function groupByDate(readings: SensorReading[]): { date: string; readings: SensorReading[] }[] {
  const groups: Map<string, SensorReading[]> = new Map();

  for (const reading of readings) {
    const dateKey = new Date(reading.recorded_at).toLocaleDateString([], {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(reading);
  }

  return Array.from(groups.entries()).map(([date, readings]) => ({
    date,
    readings: readings.reverse(),
  }));
}
