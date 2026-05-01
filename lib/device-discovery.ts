import { Platform } from "react-native";

export interface DiscoveredDevice {
  hostname: string;
  ip: string;
  name: string;
  timestamp: number;
}

/**
 * Detects the current device's subnet from an IP address
 * Supports common private subnets: 192.168.x.x, 10.x.x.x, 172.16-31.x.x
 */
function detectSubnet(currentIp: string): string[] {
  const parts = currentIp.split(".");
  if (parts.length !== 4) return ["192.168.1", "192.168.0", "10.0.0"]; // fallback

  const firstOctet = parseInt(parts[0], 10);
  const secondOctet = parseInt(parts[1], 10);
  const subnets: string[] = [];

  // 192.168.x.x
  if (firstOctet === 192 && secondOctet === 168) {
    subnets.push(`${parts[0]}.${parts[1]}.${parts[2]}`);
  }

  // 10.x.x.x
  if (firstOctet === 10) {
    subnets.push(`${parts[0]}.${parts[1]}.${parts[2]}`);
  }

  // 172.16-31.x.x
  if (firstOctet === 172 && secondOctet >= 16 && secondOctet <= 31) {
    subnets.push(`${parts[0]}.${parts[1]}.${parts[2]}`);
  }

  // Always include common subnets as fallback
  if (subnets.length === 0) {
    subnets.push("192.168.1", "192.168.0", "10.0.0");
  }

  return subnets;
}

/**
 * Attempts to fetch sensor data from a given IP with timeout using AbortController
 */
async function checkDevice(ip: string, timeoutMs: number = 1500): Promise<DiscoveredDevice | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`http://${ip}/sensor`, {
      method: "GET",
      signal: controller.signal,
    });

    if (response.ok) {
      return {
        hostname: ip,
        ip: ip,
        name: `ESP32 (${ip})`,
        timestamp: Date.now(),
      };
    }
  } catch (error) {
    // Timeout or network error - device not found
  } finally {
    clearTimeout(timeoutId);
  }

  return null;
}

/**
 * Discovers ESP32 devices on the local network
 * Scans common private subnets with limited concurrency
 */
export const discoverDevices = async (
  onProgress?: (message: string) => void,
  currentIp?: string
): Promise<DiscoveredDevice[]> => {
  const devices: DiscoveredDevice[] = [];

  // Web preview cannot access private LAN
  if (Platform.OS === "web") {
    onProgress?.(
      "Device discovery requires running on iOS/Android device. Web preview cannot access local network."
    );
    return [];
  }

  // Try common subnets
  const subnets = ["192.168.1", "192.168.0", "10.0.0"];
  if (currentIp) {
    const parts = currentIp.split(".");
    if (parts.length === 4) {
      const subnet = `${parts[0]}.${parts[1]}.${parts[2]}`;
      const others = subnets.filter((s) => s !== subnet);
      subnets.length = 0;
      subnets.push(subnet, ...others);
    }
  }

  for (const subnet of subnets) {
    onProgress?.(`Scanning ${subnet}.x...`);

    // Scan with concurrency of 25 to complete scanning 6x faster
    const ips = Array.from({ length: 254 }, (_, i) => `${subnet}.${i + 1}`);

    for (let i = 0; i < ips.length; i += 25) {
      const batch = ips.slice(i, i + 25);
      const results = await Promise.all(batch.map((ip) => checkDevice(ip, 1200)));

      for (const result of results) {
        if (result) {
          devices.push(result);
          onProgress?.(`Found ${result.name}!`);
        }
      }
    }
  }

  return devices;
};

/**
 * Verify a device is reachable
 */
export const verifyDevice = async (ip: string): Promise<boolean> => {
  try {
    const device = await checkDevice(ip, 2500);
    return device !== null;
  } catch (error) {
    return false;
  }
};
