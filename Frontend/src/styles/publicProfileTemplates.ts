export interface ProfileTemplate {
  key: string;
  name: string;
  description: string;
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
    description: 'Pastel, calm and approachable',
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
    description: 'Creative with a restrained color field',
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
    description: 'Quiet, personal and premium',
    background: 'linear-gradient(150deg, #FFF1E8 0%, #F9F4EA 55%, #F1ECE3 100%)',
    surface: 'rgba(255,253,249,.9)',
    text: '#2C241E',
    muted: '#76675C',
    accent: '#C66A3D',
    accentText: '#FFFFFF',
    radius: 22,
  },
  {
    key: 'night-signal',
    name: 'Night Signal',
    description: 'Dark, focused and confident',
    background: 'radial-gradient(circle at 18% 5%, #24392A 0%, #101512 48%, #0A0D0B 100%)',
    surface: 'rgba(24,31,27,.88)',
    text: '#F2F7F3',
    muted: '#AAB7AE',
    accent: '#30D158',
    accentText: '#07120A',
    radius: 28,
  },
];

export const getProfileTemplate = (key?: string) =>
  profileTemplates.find((template) => template.key === key) || profileTemplates[0];

