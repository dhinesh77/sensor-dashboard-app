export interface DiscoveredDevice {
  ip: string;
  name: string;
  status: string;
  temperature: number;
  humidity: number;
}

const SCAN_TIMEOUT_MS = 2000;
const BATCH_SIZE = 20;

export async function scanNetwork(
  subnet: string = "192.168.1",
  onProgress?: (scanned: number, total: number, found: number) => void,
  abortSignal?: AbortSignal
): Promise<DiscoveredDevice[]> {
  const devices: DiscoveredDevice[] = [];
  const totalIPs = 254;
  let scanned = 0;

  for (let batchStart = 1; batchStart <= totalIPs; batchStart += BATCH_SIZE) {
    if (abortSignal?.aborted) break;

    const batchEnd = Math.min(batchStart + BATCH_SIZE - 1, totalIPs);
    const promises: Promise<void>[] = [];

    for (let i = batchStart; i <= batchEnd; i++) {
      if (abortSignal?.aborted) break;
      const ip = `${subnet}.${i}`;

      promises.push(
        probeDevice(ip)
          .then((device) => {
            if (device) devices.push(device);
          })
          .catch(() => {})
          .finally(() => {
            scanned++;
            onProgress?.(scanned, totalIPs, devices.length);
          })
      );
    }

    await Promise.allSettled(promises);
  }

  return devices;
}

async function probeDevice(ip: string): Promise<DiscoveredDevice | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SCAN_TIMEOUT_MS);

  try {
    const response = await fetch(`http://${ip}/status`, {
      method: "GET",
      signal: controller.signal,
    });

    if (!response.ok) return null;

    const data = await response.json();

    if (data.device && data.status === "running") {
      return {
        ip,
        name: data.device || "Unknown Device",
        status: data.status,
        temperature: data.temperature || 0,
        humidity: data.humidity || 0,
      };
    }

    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export function getDefaultSubnet(): string {
  return "192.168.1";
}
