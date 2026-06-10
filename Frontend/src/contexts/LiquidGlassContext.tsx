import React, { createContext, useContext, useState, useEffect } from 'react';

// Import gradient preset types from liquidGlassStyles
import { GradientPresetKey } from '../styles/liquidGlassStyles';

interface LiquidGlassSettings {
  glassOpacity: number;
  showBorders: boolean;
  blurIntensity: number;
  glassStyle: 'subtle' | 'medium' | 'bold';
  contrastLevel: number;
  // New properties for enhanced Liquid Glass UI
  gradientPreset: GradientPresetKey;
  reduceTransparency: boolean;
  increaseContrast: boolean;
  addBorders: boolean;
}

interface LiquidGlassContextType {
  isLiquidGlassEnabled: boolean;
  liquidGlassSettings: LiquidGlassSettings;
  toggleLiquidGlass: () => void;
  updateLiquidGlassSettings: (settings: Partial<LiquidGlassSettings>) => void;
}

const defaultSettings: LiquidGlassSettings = {
  glassOpacity: 0.7,
  showBorders: true,
  blurIntensity: 20,
  glassStyle: 'medium',
  contrastLevel: 0.8,
  // New default values - Fresh Green for iOS-like feel
  gradientPreset: 'freshGreen',
  reduceTransparency: false,
  increaseContrast: false,
  addBorders: true,
};

const LiquidGlassContext = createContext<LiquidGlassContextType>({
  isLiquidGlassEnabled: false,
  liquidGlassSettings: defaultSettings,
  toggleLiquidGlass: () => {},
  updateLiquidGlassSettings: () => {},
});

export const useLiquidGlass = () => useContext(LiquidGlassContext);

export const LiquidGlassProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLiquidGlassEnabled, setIsLiquidGlassEnabled] = useState(() => {
    const saved = localStorage.getItem('liquidGlassEnabled');
    return saved ? JSON.parse(saved) : false;
  });

  const [liquidGlassSettings, setLiquidGlassSettings] = useState<LiquidGlassSettings>(() => {
    const saved = localStorage.getItem('liquidGlassSettings');
    return saved ? JSON.parse(saved) : defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem('liquidGlassEnabled', JSON.stringify(isLiquidGlassEnabled));
  }, [isLiquidGlassEnabled]);

  useEffect(() => {
    localStorage.setItem('liquidGlassSettings', JSON.stringify(liquidGlassSettings));
  }, [liquidGlassSettings]);

  const toggleLiquidGlass = () => {
    setIsLiquidGlassEnabled(!isLiquidGlassEnabled);
  };

  const updateLiquidGlassSettings = (settings: Partial<LiquidGlassSettings>) => {
    setLiquidGlassSettings(prev => ({ ...prev, ...settings }));
  };

  return (
    <LiquidGlassContext.Provider
      value={{
        isLiquidGlassEnabled,
        liquidGlassSettings,
        toggleLiquidGlass,
        updateLiquidGlassSettings,
      }}
    >
      {children}
    </LiquidGlassContext.Provider>
  );
};
