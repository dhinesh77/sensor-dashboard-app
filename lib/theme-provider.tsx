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

  const applyScheme = useCallback((scheme: ColorScheme) => {
    nativewindColorScheme.set(scheme);
    Appearance.setColorScheme?.(scheme);
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.dataset.theme = scheme;
      root.classList.toggle("dark", scheme === "dark");
      const palette = SchemeColors[scheme];
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
        if (stored) {
          const mode = stored as ThemeMode;
          setThemeModeState(mode);
          
          if (mode === "auto") {
            const scheme = systemScheme as ColorScheme;
            setColorSchemeState(scheme);
            applyScheme(scheme);
          } else {
            setColorSchemeState(mode as ColorScheme);
            applyScheme(mode as ColorScheme);
          }
        } else {
          // Default to auto mode
          setThemeModeState("auto");
          setColorSchemeState(systemScheme as ColorScheme);
          applyScheme(systemScheme as ColorScheme);
        }
      } catch (error) {
        console.error("Error loading theme mode:", error);
      }
      setIsLoaded(true);
    };
    loadThemeMode();
  }, [applyScheme, systemScheme]);

  // Listen to system theme changes when in auto mode
  useEffect(() => {
    if (themeMode === "auto" && isLoaded) {
      const subscription = Appearance.addChangeListener(({ colorScheme: newScheme }) => {
        const scheme = newScheme ?? "light";
        setColorSchemeState(scheme as ColorScheme);
        applyScheme(scheme as ColorScheme);
      });
      return () => subscription.remove();
    }
  }, [themeMode, isLoaded, applyScheme]);

  const setColorScheme = useCallback(
    async (mode: ThemeMode) => {
      try {
        await AsyncStorage.setItem("theme_mode", mode);
        setThemeModeState(mode);

        if (mode === "auto") {
          const scheme = systemScheme as ColorScheme;
          setColorSchemeState(scheme);
          applyScheme(scheme);
        } else {
          setColorSchemeState(mode as ColorScheme);
          applyScheme(mode as ColorScheme);
        }
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
