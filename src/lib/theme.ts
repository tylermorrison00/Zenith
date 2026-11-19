import { readStorage, writeStorage } from './storage';
import zenithLogoAmber from '../assets/zenith-logo-amber.png';
import zenithLogoGreen from '../assets/zenith-logo-green.png';
import zenithLogoYellow from '../assets/zenith-logo-yellow.png';
import zenithLogoBlue from '../assets/zenith-logo-blue.png';
import zenithLogoPurple from '../assets/zenith-logo-purple.png';

// Zenith has five accent themes: the original amber, the green the user
// approved (the Habitly green sampled from the approved green logo), the
// yellow the user approved (sampled from the approved yellow logo), the blue
// the user approved (the Pedometer blue sampled from the approved blue
// logo), and the purple the user approved (sampled from the approved purple
// logo). The Theme color button in the profile dropdown cycles amber →
// yellow → blue → purple → amber. The choice is a device preference,
// stored in localStorage like the rest of Zenith's browser-only state, and
// applied as `data-theme` on <html>; the palettes themselves live in
// styles/tokens.css.
export type ThemeName = 'green' | 'amber' | 'yellow' | 'blue' | 'purple';

export const THEME_ORDER: ThemeName[] = ['green', 'amber', 'yellow', 'blue', 'purple'];

export function nextTheme(theme: ThemeName): ThemeName {
  const index = THEME_ORDER.indexOf(theme);
  return THEME_ORDER[(index + 1) % THEME_ORDER.length] ?? 'green';
}

const THEME_KEY = 'zenith-theme-v2';

export function readTheme(): ThemeName {
  const stored = readStorage<ThemeName>(THEME_KEY, 'green');
  return stored === 'amber' || stored === 'yellow' || stored === 'blue' || stored === 'purple' ? stored : 'green';
}

export function applyTheme(theme: ThemeName): void {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = theme;
  }
  writeStorage(THEME_KEY, theme);
  if (typeof window !== 'undefined' && window.zenith?.setThemeIcon) {
    void window.zenith.setThemeIcon(theme);
  }
}

// The Z logo follows the theme: the header brand mark and the onboarding
// orbit center both render the current theme's PNG.
export const THEME_LOGOS: Record<ThemeName, string> = {
  green: zenithLogoGreen,
  amber: zenithLogoAmber,
  yellow: zenithLogoYellow,
  blue: zenithLogoBlue,
  purple: zenithLogoPurple,
};

export function themeLogo(theme: ThemeName): string {
  return THEME_LOGOS[theme] ?? THEME_LOGOS.green;
}
