import { useEffect, useState } from "react";
import { ScrollView, Text, View, Pressable, TextInput, Alert, ActivityIndicator } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { discoverDevices, type DiscoveredDevice } from "@/lib/device-discovery";

const ESP32_IP_STORAGE_KEY = "esp32_ip_address";
const ESP32_HOSTNAME_STORAGE_KEY = "esp32_hostname";
const DEFAULT_ESP32_IP = "192.168.1.33";
const DEFAULT_ESP32_HOSTNAME = "sensor-dashboard.local";

export default function NetworkScreen() {
  const colors = useColors();
  const [esp32IP, setEsp32IP] = useState(DEFAULT_ESP32_IP);
  const [tempIP, setTempIP] = useState(DEFAULT_ESP32_IP);
  const [isEditing, setIsEditing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [useHostname, setUseHostname] = useState(true);
  const [esp32Hostname, setEsp32Hostname] = useState(DEFAULT_ESP32_HOSTNAME);
  const [tempHostname, setTempHostname] = useState(DEFAULT_ESP32_HOSTNAME);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<DiscoveredDevice[]>([]);
  const [discoveryMessage, setDiscoveryMessage] = useState("");

  // Load stored IP and hostname on mount
  useEffect(() => {
    loadStoredIP();
    loadStoredHostname();
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

  const loadStoredHostname = async () => {
    try {
      const storedHostname = await AsyncStorage.getItem(ESP32_HOSTNAME_STORAGE_KEY);
      if (storedHostname) {
        setEsp32Hostname(storedHostname);
        setTempHostname(storedHostname);
        setUseHostname(true);
      }
    } catch (error) {
      console.error("Error loading hostname:", error);
    }
  };

  const fetchWithTimeout = (url: string, timeout: number = 3000): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    return fetch(url, { 
      method: "GET",
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));
  };

  const testConnection = async (address: string) => {
    setConnectionStatus("testing");
    try {
      const response = await fetchWithTimeout(`http://${address}/sensor`, 3000);
      if (response.ok) {
        setConnectionStatus("success");
        Alert.alert("Success", `Connected to ESP32 at ${address}`);
      } else {
        setConnectionStatus("error");
        Alert.alert("Error", `ESP32 responded with status ${response.status}`);
      }
    } catch (error) {
      setConnectionStatus("error");
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      Alert.alert("Error", `Failed to connect to ${address}. ${errorMessage}`);
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
      setUseHostname(false);
      setIsEditing(false);
      await testConnection(tempIP);
    } catch (error) {
      Alert.alert("Error", "Failed to save IP address");
    }
  };

  const startDeviceDiscovery = async () => {
    setIsDiscovering(true);
    setDiscoveredDevices([]);
    setDiscoveryMessage("Starting device discovery...");
    
    try {
      const devices = await discoverDevices((message) => {
        setDiscoveryMessage(message);
      });
      setDiscoveredDevices(devices);
      
      if (devices.length === 0) {
        setDiscoveryMessage("No ESP32 devices found. Make sure your device is connected to the same WiFi network.");
      } else {
        setDiscoveryMessage(`Found ${devices.length} device(s)`);
      }
    } catch (error) {
      setDiscoveryMessage("Discovery failed. Check your network connection.");
      console.error("Device discovery error:", error);
    } finally {
      setIsDiscovering(false);
    }
  };

  const selectDiscoveredDevice = async (device: DiscoveredDevice) => {
    try {
      await AsyncStorage.setItem(ESP32_IP_STORAGE_KEY, device.ip);
      setEsp32IP(device.ip);
      setTempIP(device.ip);
      setUseHostname(false);
      setDiscoveredDevices([]);
      await testConnection(device.ip);
    } catch (error) {
      Alert.alert("Error", "Failed to select device");
    }
  };

  const saveHostname = async () => {
    if (!tempHostname.trim()) {
      Alert.alert("Error", "Please enter a valid hostname");
      return;
    }

    try {
      await AsyncStorage.setItem(ESP32_HOSTNAME_STORAGE_KEY, tempHostname);
      setEsp32Hostname(tempHostname);
      setUseHostname(true);
      setIsEditing(false);
      await testConnection(tempHostname);
    } catch (error) {
      Alert.alert("Error", "Failed to save hostname");
    }
  };

  const resetToDefault = async () => {
    Alert.alert("Reset Settings", "Reset to default hostname (sensor-dashboard.local)?", [
      { text: "Cancel", onPress: () => {} },
      {
        text: "Reset",
        onPress: async () => {
          setTempHostname(DEFAULT_ESP32_HOSTNAME);
          await AsyncStorage.setItem(ESP32_HOSTNAME_STORAGE_KEY, DEFAULT_ESP32_HOSTNAME);
          setEsp32Hostname(DEFAULT_ESP32_HOSTNAME);
          setUseHostname(true);
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

          {/* Current Connection Display */}
          <View className="bg-surface rounded-2xl p-6 border border-border">
            <Text className="text-sm text-muted font-medium mb-2">Current ESP32 Connection</Text>
            <View className="flex-row items-center gap-3">
              <MaterialIcons name="router" size={32} color={colors.primary} />
              <View className="flex-1">
                <Text className="text-2xl font-bold text-foreground">
                  {useHostname ? esp32Hostname : esp32IP}
                </Text>
                <Text className="text-xs text-muted mt-1">
                  {useHostname ? "Using mDNS" : "Using IP Address"}
                </Text>
              </View>
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

          {/* Device Discovery Section */}
          <View className="bg-surface rounded-2xl p-6 border border-border gap-4">
            <View className="flex-row items-center gap-2">
              <MaterialIcons name="search" size={20} color={colors.primary} />
              <Text className="text-sm font-semibold text-foreground">Device Discovery</Text>
            </View>
            <Pressable
              onPress={startDeviceDiscovery}
              disabled={isDiscovering}
              className="bg-primary rounded-lg p-3 items-center flex-row justify-center gap-2"
              style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
            >
              {isDiscovering ? (
                <>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text className="text-white font-semibold">Scanning...</Text>
                </>
              ) : (
                <>
                  <MaterialIcons name="search" size={18} color="#FFFFFF" />
                  <Text className="text-white font-semibold">Scan for Devices</Text>
                </>
              )}
            </Pressable>
            {discoveryMessage && (
              <Text className="text-xs text-muted text-center">{discoveryMessage}</Text>
            )}
            {discoveredDevices.length > 0 && (
              <View className="gap-2">
                <Text className="text-xs font-semibold text-foreground">Found Devices:</Text>
                {discoveredDevices.map((device, index) => (
                  <Pressable
                    key={index}
                    onPress={() => selectDiscoveredDevice(device)}
                    className="bg-primary/10 border border-primary rounded-lg p-3 flex-row items-center justify-between"
                    style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                  >
                    <View>
                      <Text className="font-semibold text-foreground">{device.name}</Text>
                      <Text className="text-xs text-muted">{device.ip}</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color={colors.primary} />
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Hostname Section */}
          <View className="bg-surface rounded-2xl p-6 border border-border gap-4">
            <View className="flex-row items-center gap-2">
              <MaterialIcons name="cloud" size={20} color={colors.primary} />
              <Text className="text-sm font-semibold text-foreground">mDNS Hostname (Recommended)</Text>
            </View>
            <TextInput
              value={tempHostname}
              onChangeText={setTempHostname}
              placeholder="e.g., sensor-dashboard.local"
              placeholderTextColor={colors.muted}
              className="border border-border rounded-lg p-3 text-foreground"
              style={{ color: colors.foreground }}
              editable={isEditing}
            />
            <Text className="text-xs text-muted">
              mDNS automatically finds your ESP32 even if the IP changes
            </Text>
            {isEditing ? (
              <View className="flex-row gap-2">
                <Pressable
                  onPress={saveHostname}
                  className="flex-1 bg-primary rounded-lg p-3 items-center"
                  style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                >
                  <Text className="text-white font-semibold">Save</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setIsEditing(false);
                    setTempHostname(esp32Hostname);
                  }}
                  className="flex-1 bg-surface border border-border rounded-lg p-3 items-center"
                  style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                >
                  <Text className="text-foreground font-semibold">Cancel</Text>
                </Pressable>
              </View>
            ) : (
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => setIsEditing(true)}
                  className="flex-1 bg-primary rounded-lg p-3 items-center"
                  style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                >
                  <View className="flex-row items-center gap-2">
                    <MaterialIcons name="edit" size={16} color="white" />
                    <Text className="text-white font-semibold text-sm">Edit</Text>
                  </View>
                </Pressable>
                <Pressable
                  onPress={() => testConnection(esp32Hostname)}
                  disabled={connectionStatus === "testing"}
                  className="flex-1 bg-surface border border-border rounded-lg p-3 items-center"
                  style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                >
                  <View className="flex-row items-center gap-2">
                    <MaterialIcons name="refresh" size={16} color={colors.primary} />
                    <Text className="text-foreground font-semibold text-sm">Test</Text>
                  </View>
                </Pressable>
              </View>
            )}
          </View>

          {/* Manual IP Fallback Section */}
          <View className="bg-surface rounded-2xl p-6 border border-border gap-4">
            <View className="flex-row items-center gap-2">
              <MaterialIcons name="router" size={20} color={colors.muted} />
              <Text className="text-sm font-semibold text-foreground">Manual IP (Fallback)</Text>
            </View>
            <TextInput
              value={tempIP}
              onChangeText={setTempIP}
              placeholder="e.g., 192.168.1.33"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
              className="border border-border rounded-lg p-3 text-foreground"
              style={{ color: colors.foreground }}
            />
            <Text className="text-xs text-muted">
              Use this if mDNS discovery fails
            </Text>
            <View className="flex-row gap-2">
              <Pressable
                onPress={saveIP}
                className="flex-1 bg-surface border border-border rounded-lg p-3 items-center"
                style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
              >
                <View className="flex-row items-center gap-2">
                  <MaterialIcons name="check" size={16} color={colors.primary} />
                  <Text className="text-foreground font-semibold text-sm">Save IP</Text>
                </View>
              </Pressable>
              <Pressable
                onPress={() => testConnection(tempIP)}
                disabled={connectionStatus === "testing"}
                className="flex-1 bg-surface border border-border rounded-lg p-3 items-center"
                style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
              >
                <View className="flex-row items-center gap-2">
                  <MaterialIcons name="refresh" size={16} color={colors.primary} />
                  <Text className="text-foreground font-semibold text-sm">Test IP</Text>
                </View>
              </Pressable>
            </View>
          </View>

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
            <Text className="text-sm font-semibold text-foreground">How It Works</Text>
            <Text className="text-xs text-muted leading-relaxed">
              • mDNS (Multicast DNS) lets you access ESP32 by hostname instead of IP
            </Text>
            <Text className="text-xs text-muted leading-relaxed">
              • Default hostname: sensor-dashboard.local
            </Text>
            <Text className="text-xs text-muted leading-relaxed">
              • If mDNS fails, the app falls back to the manual IP address
            </Text>
            <Text className="text-xs text-muted leading-relaxed">
              • Both devices must be on the same WiFi network
            </Text>
          </View>

          {/* Spacer */}
          <View className="flex-1" />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
