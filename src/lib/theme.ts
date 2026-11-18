// src/lib/theme.ts — client-side theme + font size, stored per browser.
export type ThemeMode = 'light' | 'dark' | 'auto';
export type FontSize = 'small' | 'medium' | 'large';

const THEME_KEY = 'pos-theme';
const FONT_KEY = 'pos-font-size';
export const FONT_PX: Record<FontSize, number> = { small: 14, medium: 16, large: 18 };

function read(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* private mode etc. */ }
}

export function getTheme(): ThemeMode {
  const v = read(THEME_KEY);
  return v === 'dark' || v === 'auto' ? v : 'light';
}
export function getFontSize(): FontSize {
  const v = read(FONT_KEY);
  return v === 'small' || v === 'large' ? v : 'medium';
}

export function applyTheme(mode: ThemeMode) {
  const dark = mode === 'dark' || (mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
}
export function applyFontSize(size: FontSize) {
  document.documentElement.style.fontSize = FONT_PX[size] + 'px';
}

export function setTheme(mode: ThemeMode) { write(THEME_KEY, mode); applyTheme(mode); }
export function setFontSize(size: FontSize) { write(FONT_KEY, size); applyFontSize(size); }

/** Runs before first paint (inlined in <head>) so there is no light flash in dark mode. */
export const THEME_INIT_SCRIPT = `(function(){try{
var t=localStorage.getItem('${THEME_KEY}'),f=localStorage.getItem('${FONT_KEY}'),d=document.documentElement;
if(t==='dark'||(t==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches))d.classList.add('dark');
if(f==='small')d.style.fontSize='14px';else if(f==='large')d.style.fontSize='18px';
}catch(e){}})();`;
