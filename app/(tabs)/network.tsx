import { useState, useEffect, useRef } from "react";
import { ScrollView, Text, View, Pressable, TextInput, ActivityIndicator } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { usePreferences } from "@/hooks/use-preferences";
import { scanNetwork, getDefaultSubnet, type DiscoveredDevice } from "@/lib/network-scanner";
import AsyncStorage from "@react-native-async-storage/async-storage";

const LAST_SCAN_KEY = "last_scan_results";

export default function NetworkScreen() {
  const colors = useColors();
  const { preferences, updatePreferences } = usePreferences();
  const [tempIP, setTempIP] = useState(preferences.esp32_ip);
  const [tempHostname, setTempHostname] = useState(preferences.esp32_hostname);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [isEditing, setIsEditing] = useState(false);

  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ scanned: 0, total: 0, found: 0 });
  const [discoveredDevices, setDiscoveredDevices] = useState<DiscoveredDevice[]>([]);
  const [subnet, setSubnet] = useState(getDefaultSubnet());
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    loadLastScanResults();
  }, []);

  useEffect(() => {
    setTempIP(preferences.esp32_ip);
    setTempHostname(preferences.esp32_hostname);
  }, [preferences]);

  const loadLastScanResults = async () => {
    try {
      const stored = await AsyncStorage.getItem(LAST_SCAN_KEY);
      if (stored) {
        setDiscoveredDevices(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Error loading scan results:", error);
    }
  };

  const testConnection = async (address: string) => {
    setConnectionStatus("testing");
    try {
      const response = await fetch(`http://${address}/sensor`, { method: "GET" });
      setConnectionStatus(response.ok ? "success" : "error");
    } catch {
      setConnectionStatus("error");
    }
  };

  const saveIP = async () => {
    if (!tempIP.trim()) return;
    await updatePreferences({ esp32_ip: tempIP, use_hostname: false });
    setIsEditing(false);
    await testConnection(tempIP);
  };

  const saveHostname = async () => {
    if (!tempHostname.trim()) return;
    await updatePreferences({ esp32_hostname: tempHostname, use_hostname: true });
    setIsEditing(false);
    await testConnection(tempHostname);
  };

  const connectToDevice = async (device: DiscoveredDevice) => {
    await updatePreferences({ esp32_ip: device.ip, use_hostname: false });
    setTempIP(device.ip);
    await testConnection(device.ip);
  };

  const startScan = async () => {
    setScanning(true);
    setScanProgress({ scanned: 0, total: 254, found: 0 });
    setDiscoveredDevices([]);

    const controller = new AbortController();
    abortRef.current = controller;

    const devices = await scanNetwork(
      subnet,
      (scanned, total, found) => {
        setScanProgress({ scanned, total, found });
      },
      controller.signal
    );

    setDiscoveredDevices(devices);
    setScanning(false);
    abortRef.current = null;

    try {
      await AsyncStorage.setItem(LAST_SCAN_KEY, JSON.stringify(devices));
    } catch {}
  };

  const cancelScan = () => {
    abortRef.current?.abort();
    setScanning(false);
  };

  const resetToDefault = async () => {
    await updatePreferences({
      esp32_hostname: "sensor-dashboard.local",
      esp32_ip: "192.168.1.33",
      use_hostname: true,
    });
    setTempHostname("sensor-dashboard.local");
    setTempIP("192.168.1.33");
    setIsEditing(false);
  };

  const currentEndpoint = preferences.use_hostname ? preferences.esp32_hostname : preferences.esp32_ip;

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
                <Text className="text-2xl font-bold text-foreground">{currentEndpoint}</Text>
                <Text className="text-xs text-muted mt-1">
                  {preferences.use_hostname ? "Using mDNS" : "Using IP Address"}
                </Text>
              </View>
            </View>
          </View>

          {/* Connection Status */}
          {connectionStatus !== "idle" && (
            <View
              className="rounded-2xl p-4 border"
              style={{
                backgroundColor:
                  connectionStatus === "success"
                    ? "rgba(34,197,94,0.1)"
                    : connectionStatus === "testing"
                      ? "rgba(10,126,164,0.1)"
                      : "rgba(239,68,68,0.1)",
                borderColor:
                  connectionStatus === "success"
                    ? colors.success
                    : connectionStatus === "testing"
                      ? colors.primary
                      : colors.error,
              }}
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
                  className="text-sm font-medium"
                  style={{
                    color:
                      connectionStatus === "success"
                        ? colors.success
                        : connectionStatus === "testing"
                          ? colors.primary
                          : colors.error,
                  }}
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

          {/* Network Scanner Section */}
          <View className="bg-surface rounded-2xl p-6 border border-border gap-4">
            <View className="flex-row items-center gap-2">
              <MaterialIcons name="radar" size={20} color={colors.primary} />
              <Text className="text-sm font-semibold text-foreground">Network Scanner</Text>
            </View>

            <View className="gap-2">
              <Text className="text-xs text-muted font-medium">Subnet</Text>
              <TextInput
                value={subnet}
                onChangeText={setSubnet}
                placeholder="e.g., 192.168.1"
                placeholderTextColor={colors.muted}
                className="border border-border rounded-lg p-3 text-foreground"
                style={{ color: colors.foreground }}
                editable={!scanning}
              />
            </View>

            {scanning ? (
              <View className="gap-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs text-muted">
                    Scanning... found {scanProgress.found} device{scanProgress.found !== 1 ? "s" : ""}
                  </Text>
                  <Pressable onPress={cancelScan}>
                    <Text className="text-xs font-semibold" style={{ color: colors.error }}>Cancel</Text>
                  </Pressable>
                </View>
                <View className="h-2 rounded-full bg-border overflow-hidden">
                  <View
                    className="h-full rounded-full"
                    style={{
                      width: `${(scanProgress.scanned / scanProgress.total) * 100}%`,
                      backgroundColor: colors.primary,
                    }}
                  />
                </View>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : (
              <Pressable
                onPress={startScan}
                className="bg-primary rounded-lg p-3 items-center"
                style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
              >
                <View className="flex-row items-center gap-2">
                  <MaterialIcons name="search" size={16} color="white" />
                  <Text className="text-white font-semibold">Scan Network</Text>
                </View>
              </Pressable>
            )}

            {/* Discovered Devices */}
            {discoveredDevices.length > 0 && (
              <View className="gap-2 mt-2">
                <Text className="text-xs font-semibold text-muted">
                  Discovered Devices ({discoveredDevices.length})
                </Text>
                {discoveredDevices.map((device) => (
                  <Pressable
                    key={device.ip}
                    onPress={() => connectToDevice(device)}
                    className="border border-border rounded-xl p-4 flex-row items-center justify-between"
                    style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1, backgroundColor: "rgba(10,126,164,0.05)" }]}
                  >
                    <View className="flex-row items-center gap-3 flex-1">
                      <View className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: "rgba(10,126,164,0.1)" }}>
                        <MaterialIcons name="router" size={20} color={colors.primary} />
                      </View>
                      <View>
                        <Text className="text-sm font-semibold text-foreground">{device.name}</Text>
                        <Text className="text-xs text-muted">{device.ip}</Text>
                      </View>
                    </View>
                    <View className="items-end">
                      <Text className="text-xs text-muted">
                        {device.temperature.toFixed(1)}°C / {device.humidity.toFixed(0)}%
                      </Text>
                      <Text className="text-xs font-semibold mt-1" style={{ color: colors.primary }}>
                        Connect
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}

            {!scanning && discoveredDevices.length === 0 && scanProgress.total > 0 && (
              <View className="items-center py-4">
                <MaterialIcons name="wifi-off" size={32} color={colors.muted} />
                <Text className="text-sm text-muted mt-2">No ESP32 devices found</Text>
                <Text className="text-xs text-muted mt-1">Make sure your ESP32 is powered on and connected to WiFi</Text>
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
                    setTempHostname(preferences.esp32_hostname);
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
                  onPress={() => testConnection(preferences.esp32_hostname)}
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
              Network Scanner probes all IPs on your subnet for ESP32 devices
            </Text>
            <Text className="text-xs text-muted leading-relaxed">
              mDNS (Multicast DNS) lets you access ESP32 by hostname instead of IP
            </Text>
            <Text className="text-xs text-muted leading-relaxed">
              Default hostname: sensor-dashboard.local
            </Text>
            <Text className="text-xs text-muted leading-relaxed">
              Both devices must be on the same WiFi network
            </Text>
          </View>

          {/* Spacer */}
          <View className="flex-1" />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
