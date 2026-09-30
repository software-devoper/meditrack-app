import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ColorScheme = 'blue' | 'green' | 'violet' | 'orange' | 'rose' | 'teal' | 'red';
export type FontSize = 'small' | 'medium' | 'large' | 'xlarge';
export type Density = 'compact' | 'comfortable';

interface SettingsState {
  themeMode: ThemeMode;
  colorScheme: ColorScheme;
  fontSize: FontSize;
  density: Density;
  fontColor: string;
  setThemeMode: (mode: ThemeMode) => void;
  setColorScheme: (color: ColorScheme) => void;
  setFontSize: (size: FontSize) => void;
  setDensity: (density: Density) => void;
  setFontColor: (color: string) => void;
  reset: () => void;
}

const initialState = {
  themeMode: 'system' as ThemeMode,
  colorScheme: 'blue' as ColorScheme,
  fontSize: 'medium' as FontSize,
  density: 'comfortable' as Density,
  fontColor: '',
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...initialState,
      setThemeMode: (themeMode) => set({ themeMode }),
      setColorScheme: (colorScheme) => set({ colorScheme }),
      setFontSize: (fontSize) => set({ fontSize }),
      setDensity: (density) => set({ density }),
      setFontColor: (fontColor) => set({ fontColor }),
      reset: () => set(initialState),
    }),
    {
      name: 'meditrack-settings',
    }
  )
);
