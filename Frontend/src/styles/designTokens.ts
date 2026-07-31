export const brandColors = {
  purple: '#72527C',
  purpleDark: '#A986AF',
  purplePressed: '#5F4368',
  iosGreen: '#466B52',
  iosGreenDark: '#7EAA89',
  iosGreenPressed: '#385A43',
  indigo: '#766589',
  indigoDark: '#A998B9',
  blue: '#5C7894',
  blueDark: '#8EABC5',
  amber: '#9B7545',
  amberDark: '#C4A071',
  red: '#9B5B57',
  redDark: '#C98A84',
  mint: '#73A99D',
  pink: '#B87888',
} as const;

export const brandThemeTokens = {
  purple: {
    light: {
      page: '#F9F8FC',
      panel: '#FFFEFF',
      muted: '#EEE8F2',
      active: '#E7DDF0',
      accent: '#B39EB5',
      action: '#72527C',
      actionPressed: '#5F4368',
      secondary: '#EACFD6',
      border: '#DED5E3',
      text: '#29232C',
      secondaryText: '#6B626F',
      focusRing: '#9A7AA3',
    },
    dark: {
      page: '#17141A',
      panel: '#211C24',
      muted: '#2A232E',
      active: '#352A3A',
      accent: '#C5AFC8',
      action: '#A986AF',
      actionPressed: '#B997BF',
      secondary: '#5A424B',
      border: '#3B3240',
      text: '#F6F1F7',
      secondaryText: '#C7BBC9',
      focusRing: '#C5AFC8',
    },
  },
  green: {
    light: {
      page: '#F7FAF7',
      panel: '#FEFFFE',
      muted: '#E5F1E7',
      active: '#DCEBDD',
      accent: '#8FAF99',
      action: '#466B52',
      actionPressed: '#385A43',
      secondary: '#EACFD6',
      border: '#D3E2D6',
      text: '#202A23',
      secondaryText: '#5F6D63',
      focusRing: '#789B83',
    },
    dark: {
      page: '#141A16',
      panel: '#1C251F',
      muted: '#243029',
      active: '#2C3B31',
      accent: '#A8C8B0',
      action: '#7EAA89',
      actionPressed: '#91BC9B',
      secondary: '#59434A',
      border: '#334239',
      text: '#F1F6F2',
      secondaryText: '#BAC8BE',
      focusRing: '#A8C8B0',
    },
  },
} as const;

export const chartColors = [
  brandColors.iosGreen,
  brandColors.indigo,
  brandColors.amber,
  brandColors.blue,
  brandColors.red,
] as const;

export const pastelColors = {
  green: '#E5F1E7',
  lavender: '#EEE8F2',
  sky: '#E8F0F5',
  peach: '#F6E9DD',
  rose: '#F3E4E8',
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

export const feedbackSurfaceTokens = {
  light: {
    success: { surface: '#ECF9F0', border: '#CDEBD6', accent: '#248A3D', text: '#17321F', secondaryText: '#496352', action: '#1E7133' },
    info: { surface: '#EFF4FF', border: '#D8E4FF', accent: '#4F46E5', text: '#1E2544', secondaryText: '#59617B', action: '#4338CA' },
    warning: { surface: '#FFF7E8', border: '#F5E2B8', accent: '#B86200', text: '#3B2A16', secondaryText: '#735C3E', action: '#9A4F00' },
    error: { surface: '#FFF0EF', border: '#F5D2CF', accent: '#C43228', text: '#3B1E1B', secondaryText: '#76514D', action: '#A82921' },
  },
  dark: {
    success: { surface: '#1B2C22', border: '#2D4937', accent: '#63D77C', text: '#F0F7F2', secondaryText: '#B3C6B8', action: '#80E397' },
    info: { surface: '#20253A', border: '#343D62', accent: '#A9A7FF', text: '#F4F3FF', secondaryText: '#C1C0D6', action: '#C1BFFF' },
    warning: { surface: '#302719', border: '#514127', accent: '#F2B65F', text: '#FFF7EA', secondaryText: '#D4C2A4', action: '#FFD08A' },
    error: { surface: '#33201F', border: '#563330', accent: '#FF8A82', text: '#FFF3F1', secondaryText: '#D9BCB8', action: '#FFA39C' },
  },
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
