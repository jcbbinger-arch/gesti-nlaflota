import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface ThemeContextType {
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [primaryColor, setPrimaryColor] = useLocalStorage<string>('theme:primary', '#3b82f6');

  useEffect(() => {
    const root = document.documentElement;
    // Example: This sets CSS variables for different shades based on the primary color.
    // A more robust solution would involve a color utility library.
    // For this example, we'll keep it simple and just set the main color.
    // Tailwind config will use CSS variables, but we must define them.
    // This is a simplified example.
    root.style.setProperty('--primary-500', primaryColor);
    // You would typically set other shades (100, 200, etc.) here as well.
  }, [primaryColor]);


  const value = useMemo(() => ({ primaryColor, setPrimaryColor }), [primaryColor, setPrimaryColor]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};