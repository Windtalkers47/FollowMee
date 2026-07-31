import type { MessageKey } from '../i18n/messages';

export type ProfileTemplateKey =
  | 'soft-mint'
  | 'lavender-studio'
  | 'warm-editorial'
  | 'night-signal'
  | 'blush-rose'
  | 'ruby-letter'
  | 'coastal-blue'
  | 'golden-hour';

export interface ProfileTemplate {
  key: ProfileTemplateKey;
  name: string;
  descriptionKey: MessageKey;
  background: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  accentText: string;
  radius: number;
}

export const profileTemplates: ProfileTemplate[] = [
  {
    key: 'soft-mint',
    name: 'Soft Mint',
    descriptionKey: 'profile.theme.softMint.description',
    background: 'linear-gradient(155deg, #E6F8EC 0%, #F9F5EC 58%, #EEF1FF 100%)',
    surface: 'rgba(255,255,255,.86)',
    text: '#17211A',
    muted: '#607067',
    accent: '#34C759',
    accentText: '#07120A',
    radius: 32,
  },
  {
    key: 'lavender-studio',
    name: 'Lavender Studio',
    descriptionKey: 'profile.theme.lavenderStudio.description',
    background: 'linear-gradient(155deg, #EEEAFE 0%, #F9F5FF 52%, #EAF6FF 100%)',
    surface: 'rgba(255,255,255,.84)',
    text: '#201C34',
    muted: '#69627D',
    accent: '#5E5CE6',
    accentText: '#FFFFFF',
    radius: 30,
  },
  {
    key: 'warm-editorial',
    name: 'Warm Editorial',
    descriptionKey: 'profile.theme.warmEditorial.description',
    background: 'linear-gradient(150deg, #FFF1E8 0%, #F9F4EA 55%, #F1ECE3 100%)',
    surface: 'rgba(255,253,249,.9)',
    text: '#2C241E',
    muted: '#76675C',
    accent: '#C66A3D',
    accentText: '#17110D',
    radius: 22,
  },
  {
    key: 'night-signal',
    name: 'Night Signal',
    descriptionKey: 'profile.theme.nightSignal.description',
    background: 'radial-gradient(circle at 18% 5%, #24392A 0%, #101512 48%, #0A0D0B 100%)',
    surface: 'rgba(24,31,27,.88)',
    text: '#F2F7F3',
    muted: '#AAB7AE',
    accent: '#30D158',
    accentText: '#07120A',
    radius: 28,
  },
  {
    key: 'blush-rose',
    name: 'Blush Rose',
    descriptionKey: 'profile.theme.blushRose.description',
    background: 'linear-gradient(155deg, #FBE9EF 0%, #FFF8F5 55%, #F1EBF7 100%)',
    surface: 'rgba(255,255,255,.88)',
    text: '#32242A',
    muted: '#78656C',
    accent: '#925268',
    accentText: '#FFFFFF',
    radius: 30,
  },
  {
    key: 'ruby-letter',
    name: 'Ruby Letter',
    descriptionKey: 'profile.theme.rubyLetter.description',
    background: 'linear-gradient(150deg, #F7E4E3 0%, #FFF6F1 55%, #EFE2E1 100%)',
    surface: 'rgba(255,253,251,.9)',
    text: '#301C1E',
    muted: '#765C5E',
    accent: '#8E4148',
    accentText: '#FFFFFF',
    radius: 24,
  },
  {
    key: 'coastal-blue',
    name: 'Coastal Blue',
    descriptionKey: 'profile.theme.coastalBlue.description',
    background: 'linear-gradient(155deg, #E5F2F8 0%, #F8FBFC 55%, #E8EDF7 100%)',
    surface: 'rgba(255,255,255,.87)',
    text: '#182A35',
    muted: '#607682',
    accent: '#3F6E88',
    accentText: '#FFFFFF',
    radius: 28,
  },
  {
    key: 'golden-hour',
    name: 'Golden Hour',
    descriptionKey: 'profile.theme.goldenHour.description',
    background: 'linear-gradient(150deg, #FFF0CE 0%, #FFF9EC 55%, #F3E6D4 100%)',
    surface: 'rgba(255,254,250,.9)',
    text: '#302619',
    muted: '#756653',
    accent: '#80501F',
    accentText: '#FFFFFF',
    radius: 26,
  },
];

export const getProfileTemplate = (key?: string) =>
  profileTemplates.find((template) => template.key === key) || profileTemplates[0];
