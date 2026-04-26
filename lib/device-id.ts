import AsyncStorage from "@react-native-async-storage/async-storage";

const DEVICE_ID_KEY = "device_id";

export async function getDeviceId(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (stored) return stored;

    const newId = crypto.randomUUID();
    await AsyncStorage.setItem(DEVICE_ID_KEY, newId);
    return newId;
  } catch {
    const fallback = `device-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    try {
      await AsyncStorage.setItem(DEVICE_ID_KEY, fallback);
    } catch {}
    return fallback;
  }
}
