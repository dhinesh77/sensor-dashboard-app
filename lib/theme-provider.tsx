import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Appearance, View, useColorScheme as useSystemColorScheme } from "react-native";
import { colorScheme as nativewindColorScheme, vars } from "nativewind";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { SchemeColors, type ColorScheme } from "@/constants/theme";

type ThemeMode = "light" | "dark" | "auto";

type ThemeContextValue = {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme() ?? "light";
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(systemScheme);
  const [themeMode, setThemeModeState] = useState<ThemeMode>("auto");
  const [isLoaded, setIsLoaded] = useState(false);

  const applyScheme = useCallback((mode: ThemeMode, resolvedScheme: ColorScheme) => {
    // Set NativeWind to system or forced mode
    nativewindColorScheme.set(mode === "auto" ? "system" : mode);
    
    // Clear React Native Appearance override for auto mode, or force it
    const rnScheme = mode === "auto" ? null : mode;
    // Cast to any to support older RN types that might not have null
    (Appearance.setColorScheme as any)?.(rnScheme);

    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.dataset.theme = resolvedScheme;
      root.classList.toggle("dark", resolvedScheme === "dark");
      const palette = SchemeColors[resolvedScheme];
      Object.entries(palette).forEach(([token, value]) => {
        root.style.setProperty(`--color-${token}`, value);
      });
    }
  }, []);

  // Load theme mode from storage on mount
  useEffect(() => {
    const loadThemeMode = async () => {
      try {
        const stored = await AsyncStorage.getItem("theme_mode");
        const mode = (stored as ThemeMode) || "auto";
        setThemeModeState(mode);
        
        // Note: systemScheme might be overridden here if a previous session
        // had a forced scheme. We still apply it, and the next useEffect
        // will correct it if needed once the override is cleared.
        const resolved = mode === "auto" ? systemScheme as ColorScheme : mode as ColorScheme;
        setColorSchemeState(resolved);
        applyScheme(mode, resolved);
      } catch (error) {
        console.error("Error loading theme mode:", error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadThemeMode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyScheme]); // Intentionally omitting systemScheme to run only on mount

  // Sync auto mode with system scheme changes
  useEffect(() => {
    if (themeMode === "auto" && isLoaded) {
      setColorSchemeState(systemScheme as ColorScheme);
      applyScheme("auto", systemScheme as ColorScheme);
    }
  }, [systemScheme, themeMode, isLoaded, applyScheme]);

  const setColorScheme = useCallback(
    async (mode: ThemeMode) => {
      try {
        await AsyncStorage.setItem("theme_mode", mode);
        setThemeModeState(mode);

        const resolved = mode === "auto" ? systemScheme as ColorScheme : mode as ColorScheme;
        setColorSchemeState(resolved);
        applyScheme(mode, resolved);
      } catch (error) {
        console.error("Error setting theme:", error);
      }
    },
    [applyScheme, systemScheme]
  );

  const themeVariables = useMemo(
    () =>
      vars({
        "color-primary": SchemeColors[colorScheme].primary,
        "color-background": SchemeColors[colorScheme].background,
        "color-surface": SchemeColors[colorScheme].surface,
        "color-foreground": SchemeColors[colorScheme].foreground,
        "color-muted": SchemeColors[colorScheme].muted,
        "color-border": SchemeColors[colorScheme].border,
        "color-success": SchemeColors[colorScheme].success,
        "color-warning": SchemeColors[colorScheme].warning,
        "color-error": SchemeColors[colorScheme].error,
      }),
    [colorScheme]
  );

  const value = useMemo(
    () => ({
      colorScheme,
      setColorScheme,
    }),
    [colorScheme, setColorScheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      <View style={[{ flex: 1 }, themeVariables]}>{children}</View>
    </ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeContext must be used within ThemeProvider");
  }
  return ctx;
}
