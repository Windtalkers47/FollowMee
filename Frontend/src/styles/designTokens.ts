export const brandColors = {
  purple: '#7C3AED',
  purpleDark: '#A78BFA',
  purplePressed: '#6D28D9',
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
  primary: brandColors.purple,
  success: brandColors.iosGreen,
  info: brandColors.blue,
  warning: brandColors.amber,
  error: brandColors.red,
} as const;

export const statusColors = {
  draft: '#8E8E93',
  todo: brandColors.blue,
  in_progress: brandColors.amber,
  review: brandColors.indigo,
  done: brandColors.iosGreen,
  cancelled: brandColors.red,
} as const;

export type TaskStatus = keyof typeof statusColors;

export const taskStatusTokens: Record<TaskStatus, {
  label: string;
  color: string;
  softLight: string;
  softDark: string;
}> = {
  draft: { label: 'Draft', color: statusColors.draft, softLight: '#F1F1F3', softDark: '#2C2C2E' },
  todo: { label: 'To do', color: statusColors.todo, softLight: '#EAF4FF', softDark: '#102A43' },
  in_progress: { label: 'In progress', color: statusColors.in_progress, softLight: '#FFF4E4', softDark: '#3A2810' },
  review: { label: 'Review', color: statusColors.review, softLight: '#EFEEFF', softDark: '#242144' },
  done: { label: 'Done', color: statusColors.done, softLight: '#E8F8EC', softDark: '#14321D' },
  cancelled: { label: 'Cancelled', color: statusColors.cancelled, softLight: '#FFEDEC', softDark: '#3B1715' },
};

export const feedbackTokens = {
  success: brandColors.iosGreen,
  info: brandColors.blue,
  warning: brandColors.amber,
  error: brandColors.red,
  destructive: brandColors.red,
} as const;

export const surfaceTokens = {
  light: { page: '#F4F8F5', panel: '#FFFFFF', muted: '#EEF3EF' },
  dark: { page: '#0D1110', panel: '#171C1A', muted: '#202723' },
} as const;

export const radii = {
  control: 12,
  card: 16,
  panel: 20,
  modal: 24,
  pill: 999,
} as const;

export const shadows = {
  none: 'none',
  cardLight: '0 8px 24px rgba(35, 65, 45, 0.06)',
  cardDark: '0 10px 28px rgba(0, 0, 0, 0.18)',
  floatingLight: '0 20px 52px rgba(27, 65, 38, 0.14)',
  floatingDark: '0 24px 60px rgba(0, 0, 0, 0.42)',
} as const;

export const layoutTokens = {
  pageMaxWidth: 1440,
  readableMaxWidth: 760,
  controlHeight: 44,
  mobileTapTarget: 44,
} as const;
