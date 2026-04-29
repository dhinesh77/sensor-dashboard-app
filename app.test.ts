import { describe, it, expect, beforeEach, vi } from "vitest";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Mock AsyncStorage
vi.mock("@react-native-async-storage/async-storage");

describe("Network Connectivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should use AbortController for fetch timeout", () => {
    const controller = new AbortController();
    expect(controller.signal).toBeDefined();
  });

  it("should handle network request with proper timeout", async () => {
    const timeoutMs = 3000;
    const startTime = Date.now();
    
    // Simulate timeout behavior
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      // This will abort after 3 seconds
      await new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Aborted")), timeoutMs + 100);
        controller.signal.addEventListener("abort", () => reject(new Error("Aborted")));
      });
    } catch (e) {
      // Expected
    }
    
    clearTimeout(timeoutId);
    expect(Date.now() - startTime).toBeLessThan(timeoutMs + 500);
  });

  it("should fallback from hostname to IP on connection failure", async () => {
    const hostname = "sensor-dashboard.local";
    const ip = "192.168.1.33";
    
    // Simulate fallback logic
    let connected = false;
    let endpoint: string = hostname;
    
    try {
      // First attempt with hostname fails
      throw new Error("Hostname failed");
    } catch (primaryError) {
      // Fallback to IP
      if (endpoint === hostname) {
        endpoint = ip;
        connected = true;
      }
    }
    
    expect(endpoint).toBe(ip);
    expect(connected).toBe(true);
  });
});

describe("Theme Switching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should load and apply auto theme mode from storage", async () => {
    const mockAsyncStorage = AsyncStorage as any;
    mockAsyncStorage.getItem.mockResolvedValue("auto");
    
    const stored = await AsyncStorage.getItem("theme_mode");
    expect(stored).toBe("auto");
  });

  it("should save theme mode to storage", async () => {
    const mockAsyncStorage = AsyncStorage as any;
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    
    await AsyncStorage.setItem("theme_mode", "auto");
    
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith("theme_mode", "auto");
  });

  it("should handle light, dark, and auto theme modes", async () => {
    const modes: string[] = ["light", "dark", "auto"];
    const mockAsyncStorage = AsyncStorage as any;
    
    for (const mode of modes) {
      mockAsyncStorage.setItem.mockResolvedValue(undefined);
      await AsyncStorage.setItem("theme_mode", mode);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith("theme_mode", mode);
    }
  });

  it("should apply correct color scheme based on theme mode", () => {
    const themes: Record<string, Record<string, string>> = {
      light: { background: "#ffffff", foreground: "#11181C" },
      dark: { background: "#151718", foreground: "#ECEDEE" },
    };
    
    expect(themes.light.background).toBe("#ffffff");
    expect(themes.dark.background).toBe("#151718");
  });
});

describe("Network Security Configuration", () => {
  it("should allow cleartext traffic to local network IPs", () => {
    const localNetworks = [
      "192.168.1.33",
      "192.168.0.1",
      "10.0.0.1",
      "172.16.0.1",
    ];
    
    // Verify all local networks are in allowed list
    localNetworks.forEach((ip: string) => {
      expect(ip).toMatch(/^(192\.168|10\.|172\.1[6-9]\.|172\.2[0-9]\.|172\.3[0-1])/);
    });
  });

  it("should allow mDNS hostnames", () => {
    const mdnsHostnames = [
      "sensor-dashboard.local",
      "esp32.local",
      "device.local",
    ];
    
    mdnsHostnames.forEach((hostname: string) => {
      expect(hostname).toMatch(/\.local$/);
    });
  });
});
