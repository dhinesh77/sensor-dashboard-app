/**
 * Device Discovery Utility
 * Scans the local network for ESP32 sensor devices
 */

export interface DiscoveredDevice {
  hostname: string;
  ip: string;
  name: string;
  timestamp: number;
}

/**
 * Scan for ESP32 devices on the local network
 * Tries common IP ranges and mDNS hostnames
 */
export const discoverDevices = async (
  onProgress?: (message: string) => void
): Promise<DiscoveredDevice[]> => {
  const devices: DiscoveredDevice[] = [];
  const baseIP = "192.168.1"; // Common home network range
  const timeout = 1500; // 1.5 second timeout per device

  // First, try mDNS hostname (works on most networks)
  try {
    onProgress?.("Scanning for mDNS devices...");
    const mdnsHostname = "sensor-dashboard.local";
    const response = await fetchWithTimeout(`http://${mdnsHostname}/sensor`, timeout);
    if (response.ok) {
      devices.push({
        hostname: mdnsHostname,
        ip: mdnsHostname,
        name: "Sensor Dashboard (mDNS)",
        timestamp: Date.now(),
      });
    }
  } catch (error) {
    // mDNS not available, continue with IP scanning
  }

  // Scan common IP range (1-254)
  onProgress?.("Scanning IP range 192.168.1.x...");
  const scanPromises = [];

  for (let i = 1; i <= 254; i++) {
    const ip = `${baseIP}.${i}`;
    scanPromises.push(
      (async () => {
        try {
          const response = await fetchWithTimeout(`http://${ip}/sensor`, timeout);
          if (response.ok) {
            const data = await response.json();
            devices.push({
              hostname: ip,
              ip: ip,
              name: `ESP32 (${ip})`,
              timestamp: Date.now(),
            });
          }
        } catch (error) {
          // Device not found or timeout
        }
      })()
    );
  }

  // Run scans in batches to avoid overwhelming the network
  const batchSize = 20;
  for (let i = 0; i < scanPromises.length; i += batchSize) {
    const batch = scanPromises.slice(i, i + batchSize);
    await Promise.all(batch);
    onProgress?.(
      `Scanning... ${Math.min(i + batchSize, scanPromises.length)}/${scanPromises.length}`
    );
  }

  return devices;
};

/**
 * Fetch with timeout utility
 */
const fetchWithTimeout = (url: string, timeout: number = 3000): Promise<Response> => {
  return Promise.race([
    fetch(url, { method: "GET" }),
    new Promise<Response>((_, reject) =>
      setTimeout(() => reject(new Error("Request timeout")), timeout)
    ),
  ]) as Promise<Response>;
};

/**
 * Verify a device is reachable
 */
export const verifyDevice = async (ip: string): Promise<boolean> => {
  try {
    const response = await fetchWithTimeout(`http://${ip}/sensor`, 2000);
    return response.ok;
  } catch (error) {
    return false;
  }
};
