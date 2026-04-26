import { useState, useEffect } from "react";
import { ScrollView, Text, View, Pressable, TextInput, Alert } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ESP32_IP_STORAGE_KEY = "esp32_ip_address";
const DEFAULT_ESP32_IP = "192.168.1.33";

export default function NetworkScreen() {
  const colors = useColors();
  const [esp32IP, setEsp32IP] = useState(DEFAULT_ESP32_IP);
  const [tempIP, setTempIP] = useState(DEFAULT_ESP32_IP);
  const [isEditing, setIsEditing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "testing" | "success" | "error">("idle");

  // Load stored IP on mount
  useEffect(() => {
    loadStoredIP();
  }, []);

  const loadStoredIP = async () => {
    try {
      const storedIP = await AsyncStorage.getItem(ESP32_IP_STORAGE_KEY);
      if (storedIP) {
        setEsp32IP(storedIP);
        setTempIP(storedIP);
      }
    } catch (error) {
      console.error("Error loading IP:", error);
    }
  };

  const testConnection = async (ip: string) => {
    setConnectionStatus("testing");
    try {
      const response = await fetch(`http://${ip}/sensor`, { method: "GET" });
      if (response.ok) {
        setConnectionStatus("success");
        Alert.alert("Success", `Connected to ESP32 at ${ip}`);
      } else {
        setConnectionStatus("error");
        Alert.alert("Error", `ESP32 responded with status ${response.status}`);
      }
    } catch (error) {
      setConnectionStatus("error");
      Alert.alert("Error", `Failed to connect to ${ip}. Make sure ESP32 is online.`);
    }
  };

  const saveIP = async () => {
    if (!tempIP.trim()) {
      Alert.alert("Error", "Please enter a valid IP address");
      return;
    }

    try {
      await AsyncStorage.setItem(ESP32_IP_STORAGE_KEY, tempIP);
      setEsp32IP(tempIP);
      setIsEditing(false);
      await testConnection(tempIP);
    } catch (error) {
      Alert.alert("Error", "Failed to save IP address");
    }
  };

  const resetToDefault = async () => {
    Alert.alert("Reset IP", "Reset to default IP 192.168.1.33?", [
      { text: "Cancel", onPress: () => {} },
      {
        text: "Reset",
        onPress: async () => {
          setTempIP(DEFAULT_ESP32_IP);
          await AsyncStorage.setItem(ESP32_IP_STORAGE_KEY, DEFAULT_ESP32_IP);
          setEsp32IP(DEFAULT_ESP32_IP);
          setIsEditing(false);
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
            <Text className="text-3xl font-bold text-foreground">Network Settings</Text>
            <Text className="text-sm text-muted mt-2">Configure your ESP32 connection</Text>
          </View>

          {/* Current IP Display */}
          <View className="bg-surface rounded-2xl p-6 border border-border">
            <Text className="text-sm text-muted font-medium mb-2">Current ESP32 IP</Text>
            <View className="flex-row items-center gap-3">
              <MaterialIcons name="router" size={32} color={colors.primary} />
              <Text className="text-2xl font-bold text-foreground">{esp32IP}</Text>
            </View>
          </View>

          {/* Connection Status */}
          {connectionStatus !== "idle" && (
            <View
              className={`rounded-2xl p-4 border ${
                connectionStatus === "success"
                  ? "bg-success/10 border-success"
                  : connectionStatus === "testing"
                    ? "bg-primary/10 border-primary"
                    : "bg-error/10 border-error"
              }`}
            >
              <View className="flex-row items-center gap-2">
                <MaterialIcons
                  name={
                    connectionStatus === "success"
                      ? "check-circle"
                      : connectionStatus === "testing"
                        ? "hourglass-empty"
                        : "error"
                  }
                  size={20}
                  color={
                    connectionStatus === "success"
                      ? colors.success
                      : connectionStatus === "testing"
                        ? colors.primary
                        : colors.error
                  }
                />
                <Text
                  className={`text-sm font-medium ${
                    connectionStatus === "success"
                      ? "text-success"
                      : connectionStatus === "testing"
                        ? "text-primary"
                        : "text-error"
                  }`}
                >
                  {connectionStatus === "success"
                    ? "Connected successfully"
                    : connectionStatus === "testing"
                      ? "Testing connection..."
                      : "Connection failed"}
                </Text>
              </View>
            </View>
          )}

          {/* Edit IP Section */}
          {isEditing ? (
            <View className="bg-surface rounded-2xl p-6 border border-border gap-4">
              <Text className="text-sm font-semibold text-foreground">Enter ESP32 IP Address</Text>
              <TextInput
                value={tempIP}
                onChangeText={setTempIP}
                placeholder="e.g., 192.168.1.33"
                placeholderTextColor={colors.muted}
                keyboardType="decimal-pad"
                className="border border-border rounded-lg p-3 text-foreground"
                style={{ color: colors.foreground }}
              />
              <View className="flex-row gap-2">
                <Pressable
                  onPress={saveIP}
                  className="flex-1 bg-primary rounded-lg p-3 items-center"
                  style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                >
                  <Text className="text-white font-semibold">Save</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setIsEditing(false);
                    setTempIP(esp32IP);
                    setConnectionStatus("idle");
                  }}
                  className="flex-1 bg-surface border border-border rounded-lg p-3 items-center"
                  style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                >
                  <Text className="text-foreground font-semibold">Cancel</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => setIsEditing(true)}
                className="flex-1 bg-primary rounded-lg p-4 items-center"
                style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
              >
                <View className="flex-row items-center gap-2">
                  <MaterialIcons name="edit" size={20} color="white" />
                  <Text className="text-white font-semibold">Edit IP</Text>
                </View>
              </Pressable>
              <Pressable
                onPress={() => testConnection(esp32IP)}
                disabled={connectionStatus === "testing"}
                className="flex-1 bg-surface border border-border rounded-lg p-4 items-center"
                style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
              >
                <View className="flex-row items-center gap-2">
                  <MaterialIcons name="refresh" size={20} color={colors.primary} />
                  <Text className="text-foreground font-semibold">Test</Text>
                </View>
              </Pressable>
            </View>
          )}

          {/* Reset Button */}
          <Pressable
            onPress={resetToDefault}
            className="bg-surface border border-border rounded-lg p-4 items-center"
            style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
          >
            <View className="flex-row items-center gap-2">
              <MaterialIcons name="restore" size={20} color={colors.muted} />
              <Text className="text-muted font-semibold">Reset to Default</Text>
            </View>
          </Pressable>

          {/* Info Section */}
          <View className="bg-surface rounded-2xl p-4 border border-border gap-2">
            <Text className="text-sm font-semibold text-foreground">Connection Tips</Text>
            <Text className="text-xs text-muted leading-relaxed">
              • Ensure your mobile device and ESP32 are on the same WiFi network
            </Text>
            <Text className="text-xs text-muted leading-relaxed">
              • The default IP is 192.168.1.33
            </Text>
            <Text className="text-xs text-muted leading-relaxed">
              • Check your router to find the ESP32 IP if it's different
            </Text>
          </View>

          {/* Spacer */}
          <View className="flex-1" />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
