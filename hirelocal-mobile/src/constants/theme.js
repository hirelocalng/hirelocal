import { Platform } from 'react-native';

export const colors = {
  brand: '#0f766e',
  brandDark: '#0a5f58',
  surfaceDark: '#17352f',
  accent: '#ef8f49',
  accentSoft: '#ffe0c7',
  bg: '#f3efe7',
  bgDeep: '#efe7d7',
  surface: '#fffdf8',
  text: '#10231d',
  muted: '#556963',
  success: '#21735f',
  successBg: '#e6f4ea',
  warning: '#b36a27',
  danger: '#a63f38',
  dangerBg: '#fee',
  white: '#ffffff',
  border: 'rgba(16,35,29,0.12)',
  borderStrong: 'rgba(16,35,29,0.2)',
};

export const radius = {
  sm: 14,
  md: 20,
  lg: 30,
  full: 999,
};

export const shadow = {
  shadowColor: '#1f352d',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.1,
  shadowRadius: 12,
  elevation: 4,
};

export const fonts = {
  heading: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
  body: Platform.select({ ios: 'System', android: 'Roboto', default: 'sans-serif' }),
};
