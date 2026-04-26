import { useState, useEffect } from "react";
import { ScrollView, Text, View, Pressable, TextInput, Alert } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface AlertThresholds {
  tempMin: number;
  tempMax: number;
  humidityMin: number;
  humidityMax: number;
}

const STORAGE_KEY = "alert_thresholds";
const DEFAULT_THRESHOLDS: AlertThresholds = {
  tempMin: 15,
  tempMax: 30,
  humidityMin: 30,
  humidityMax: 70,
};

export default function SettingsScreen() {
  const colors = useColors();
  const [thresholds, setThresholds] = useState<AlertThresholds>(DEFAULT_THRESHOLDS);
  const [tempThresholds, setTempThresholds] = useState<AlertThresholds>(DEFAULT_THRESHOLDS);
  const [isEditing, setIsEditing] = useState(false);

  // Load thresholds on mount
  useEffect(() => {
    loadThresholds();
  }, []);

  const loadThresholds = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setThresholds(parsed);
        setTempThresholds(parsed);
      }
    } catch (error) {
      console.error("Error loading thresholds:", error);
    }
  };

  const saveThresholds = async () => {
    // Validate inputs
    if (
      isNaN(tempThresholds.tempMin) ||
      isNaN(tempThresholds.tempMax) ||
      isNaN(tempThresholds.humidityMin) ||
      isNaN(tempThresholds.humidityMax)
    ) {
      Alert.alert("Error", "Please enter valid numbers");
      return;
    }

    if (tempThresholds.tempMin >= tempThresholds.tempMax) {
      Alert.alert("Error", "Temperature minimum must be less than maximum");
      return;
    }

    if (tempThresholds.humidityMin >= tempThresholds.humidityMax) {
      Alert.alert("Error", "Humidity minimum must be less than maximum");
      return;
    }

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tempThresholds));
      setThresholds(tempThresholds);
      setIsEditing(false);
      Alert.alert("Success", "Alert thresholds saved");
    } catch (error) {
      Alert.alert("Error", "Failed to save thresholds");
    }
  };

  const resetToDefaults = () => {
    Alert.alert("Reset Settings", "Reset all thresholds to default values?", [
      { text: "Cancel", onPress: () => {} },
      {
        text: "Reset",
        onPress: async () => {
          setTempThresholds(DEFAULT_THRESHOLDS);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_THRESHOLDS));
          setThresholds(DEFAULT_THRESHOLDS);
          setIsEditing(false);
          Alert.alert("Success", "Thresholds reset to defaults");
        },
      },
    ]);
  };

  return (
    <ScreenContainer className="p-6">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 gap-6">
          {/* Header */}
          <View>
            <Text className="text-3xl font-bold text-foreground">Alert Settings</Text>
            <Text className="text-sm text-muted mt-2">Set temperature and humidity thresholds</Text>
          </View>

          {/* Temperature Section */}
          <View className="gap-3">
            <View className="flex-row items-center gap-2">
              <MaterialIcons name="thermostat" size={24} color="#FF6B35" />
              <Text className="text-lg font-semibold text-foreground">Temperature Alerts</Text>
            </View>

            {!isEditing ? (
              <View className="bg-surface rounded-2xl p-6 border border-border gap-4">
                <View className="flex-row justify-between items-center">
                  <View>
                    <Text className="text-xs text-muted">Minimum</Text>
                    <Text className="text-2xl font-bold text-foreground">
                      {thresholds.tempMin}°C
                    </Text>
                  </View>
                  <MaterialIcons name="arrow-forward" size={24} color={colors.muted} />
                  <View>
                    <Text className="text-xs text-muted">Maximum</Text>
                    <Text className="text-2xl font-bold text-foreground">
                      {thresholds.tempMax}°C
                    </Text>
                  </View>
                </View>
                <Text className="text-xs text-muted">
                  Alert when temperature falls below {thresholds.tempMin}°C or exceeds{" "}
                  {thresholds.tempMax}°C
                </Text>
              </View>
            ) : (
              <View className="bg-surface rounded-2xl p-4 border border-border gap-3">
                <View className="gap-2">
                  <Text className="text-xs text-muted font-medium">Minimum (°C)</Text>
                  <TextInput
                    value={tempThresholds.tempMin.toString()}
                    onChangeText={(val) =>
                      setTempThresholds({ ...tempThresholds, tempMin: parseFloat(val) || 0 })
                    }
                    placeholder="e.g., 15"
                    placeholderTextColor={colors.muted}
                    keyboardType="decimal-pad"
                    className="border border-border rounded-lg p-3 text-foreground"
                    style={{ color: colors.foreground }}
                  />
                </View>
                <View className="gap-2">
                  <Text className="text-xs text-muted font-medium">Maximum (°C)</Text>
                  <TextInput
                    value={tempThresholds.tempMax.toString()}
                    onChangeText={(val) =>
                      setTempThresholds({ ...tempThresholds, tempMax: parseFloat(val) || 0 })
                    }
                    placeholder="e.g., 30"
                    placeholderTextColor={colors.muted}
                    keyboardType="decimal-pad"
                    className="border border-border rounded-lg p-3 text-foreground"
                    style={{ color: colors.foreground }}
                  />
                </View>
              </View>
            )}
          </View>

          {/* Humidity Section */}
          <View className="gap-3">
            <View className="flex-row items-center gap-2">
              <MaterialIcons name="opacity" size={24} color="#0A7EA4" />
              <Text className="text-lg font-semibold text-foreground">Humidity Alerts</Text>
            </View>

            {!isEditing ? (
              <View className="bg-surface rounded-2xl p-6 border border-border gap-4">
                <View className="flex-row justify-between items-center">
                  <View>
                    <Text className="text-xs text-muted">Minimum</Text>
                    <Text className="text-2xl font-bold text-foreground">
                      {thresholds.humidityMin}%
                    </Text>
                  </View>
                  <MaterialIcons name="arrow-forward" size={24} color={colors.muted} />
                  <View>
                    <Text className="text-xs text-muted">Maximum</Text>
                    <Text className="text-2xl font-bold text-foreground">
                      {thresholds.humidityMax}%
                    </Text>
                  </View>
                </View>
                <Text className="text-xs text-muted">
                  Alert when humidity falls below {thresholds.humidityMin}% or exceeds{" "}
                  {thresholds.humidityMax}%
                </Text>
              </View>
            ) : (
              <View className="bg-surface rounded-2xl p-4 border border-border gap-3">
                <View className="gap-2">
                  <Text className="text-xs text-muted font-medium">Minimum (%)</Text>
                  <TextInput
                    value={tempThresholds.humidityMin.toString()}
                    onChangeText={(val) =>
                      setTempThresholds({ ...tempThresholds, humidityMin: parseFloat(val) || 0 })
                    }
                    placeholder="e.g., 30"
                    placeholderTextColor={colors.muted}
                    keyboardType="decimal-pad"
                    className="border border-border rounded-lg p-3 text-foreground"
                    style={{ color: colors.foreground }}
                  />
                </View>
                <View className="gap-2">
                  <Text className="text-xs text-muted font-medium">Maximum (%)</Text>
                  <TextInput
                    value={tempThresholds.humidityMax.toString()}
                    onChangeText={(val) =>
                      setTempThresholds({ ...tempThresholds, humidityMax: parseFloat(val) || 0 })
                    }
                    placeholder="e.g., 70"
                    placeholderTextColor={colors.muted}
                    keyboardType="decimal-pad"
                    className="border border-border rounded-lg p-3 text-foreground"
                    style={{ color: colors.foreground }}
                  />
                </View>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          {isEditing ? (
            <View className="flex-row gap-2">
              <Pressable
                onPress={saveThresholds}
                className="flex-1 bg-primary rounded-lg p-4 items-center"
                style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
              >
                <View className="flex-row items-center gap-2">
                  <MaterialIcons name="check" size={20} color="white" />
                  <Text className="text-white font-semibold">Save</Text>
                </View>
              </Pressable>
              <Pressable
                onPress={() => {
                  setIsEditing(false);
                  setTempThresholds(thresholds);
                }}
                className="flex-1 bg-surface border border-border rounded-lg p-4 items-center"
                style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
              >
                <View className="flex-row items-center gap-2">
                  <MaterialIcons name="close" size={20} color={colors.foreground} />
                  <Text className="text-foreground font-semibold">Cancel</Text>
                </View>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => setIsEditing(true)}
              className="bg-primary rounded-lg p-4 items-center"
              style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
            >
              <View className="flex-row items-center gap-2">
                <MaterialIcons name="edit" size={20} color="white" />
                <Text className="text-white font-semibold">Edit Thresholds</Text>
              </View>
            </Pressable>
          )}

          {/* Reset Button */}
          <Pressable
            onPress={resetToDefaults}
            className="bg-surface border border-border rounded-lg p-4 items-center"
            style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
          >
            <View className="flex-row items-center gap-2">
              <MaterialIcons name="restore" size={20} color={colors.muted} />
              <Text className="text-muted font-semibold">Reset to Defaults</Text>
            </View>
          </Pressable>

          {/* Info Section */}
          <View className="bg-surface rounded-2xl p-4 border border-border gap-2">
            <Text className="text-sm font-semibold text-foreground">How Alerts Work</Text>
            <Text className="text-xs text-muted leading-relaxed">
              • Alerts are triggered when sensor readings fall outside your set thresholds
            </Text>
            <Text className="text-xs text-muted leading-relaxed">
              • Default: Temperature 15-30°C, Humidity 30-70%
            </Text>
            <Text className="text-xs text-muted leading-relaxed">
              • Adjust based on your comfort and safety requirements
            </Text>
          </View>

          {/* Spacer */}
          <View className="flex-1" />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
