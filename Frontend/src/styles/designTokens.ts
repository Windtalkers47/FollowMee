export const brandColors = {
  iosGreen: '#34C759',
  iosGreenDark: '#30D158',
  iosGreenPressed: '#248A3D',
  indigo: '#5E5CE6',
  indigoDark: '#7D7AFF',
  blue: '#007AFF',
  blueDark: '#0A84FF',
  amber: '#FF9F0A',
  amberDark: '#FFB340',
  red: '#FF3B30',
  redDark: '#FF453A',
  mint: '#00C7BE',
  pink: '#FF2D55',
} as const;

export const chartColors = [
  brandColors.iosGreen,
  brandColors.indigo,
  brandColors.amber,
  brandColors.blue,
  brandColors.red,
] as const;

export const pastelColors = {
  green: '#E8F8EC',
  lavender: '#EFEEFF',
  sky: '#EAF4FF',
  peach: '#FFF1E8',
  rose: '#FFECEF',
} as const;

export const semanticHex = {
  primary: brandColors.iosGreen,
  success: brandColors.iosGreen,
  info: brandColors.blue,
  warning: brandColors.amber,
  error: brandColors.red,
} as const;

