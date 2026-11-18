'use client';

import { useEffect } from 'react';
import { applyTheme, getTheme } from '@/lib/theme';

/** Keeps "Auto" in step with the OS when the system theme changes while the app is open. */
export default function ThemeSync() {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => { if (getTheme() === 'auto') applyTheme('auto'); };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return null;
}
