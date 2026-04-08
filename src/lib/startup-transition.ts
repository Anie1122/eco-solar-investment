export const STARTUP_SPLASH_DURATION_MS = 3000;

const STARTUP_SPLASH_KEY = 'eco_startup_splash_pending';
const APP_OPEN_SPLASH_KEY = 'eco_startup_splash_seen';
const STARTUP_SOUND_PREF_KEY = 'eco_startup_sound_enabled';

type SplashReason = 'app-open' | 'post-profile-complete' | 'logout';

export type StartupSplashPayload = {
  reason: SplashReason;
  createdAt: number;
};

export function queueStartupSplash(reason: SplashReason) {
  if (typeof window === 'undefined') return;
  const payload: StartupSplashPayload = { reason, createdAt: Date.now() };
  sessionStorage.setItem(STARTUP_SPLASH_KEY, JSON.stringify(payload));
}

export function consumeQueuedStartupSplash(): StartupSplashPayload | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(STARTUP_SPLASH_KEY);
  if (!raw) return null;

  sessionStorage.removeItem(STARTUP_SPLASH_KEY);

  try {
    return JSON.parse(raw) as StartupSplashPayload;
  } catch {
    return null;
  }
}

export function shouldShowAppOpenSplash() {
  if (typeof window === 'undefined') return false;
  const seen = sessionStorage.getItem(APP_OPEN_SPLASH_KEY) === '1';
  if (!seen) {
    sessionStorage.setItem(APP_OPEN_SPLASH_KEY, '1');
  }
  return !seen;
}

export function isStartupSoundEnabled() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STARTUP_SOUND_PREF_KEY) === '1';
}
