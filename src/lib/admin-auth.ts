import { cookies } from 'next/headers';

export const ADMIN_EMAIL = 'basseyaniekeme8@gmail.com';
export const ADMIN_PASSWORD = 'ANIEkeme001';
export const ADMIN_LOGIN_PAIRS = [
  { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  { email: 'mikebassey851@gmail.com', password: 'Mfoniso851@1' },
];
const ADMIN_COOKIE = 'eco_admin_session';
const ADMIN_COOKIE_VALUE = 'ok';

export function validateAdminCredentials(email: string, password: string) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  return ADMIN_LOGIN_PAIRS.some(
    (pair) => pair.email.toLowerCase() === normalizedEmail && pair.password === password
  );
}

export async function isAdminSession() {
  const jar = await cookies();
  return jar.get(ADMIN_COOKIE)?.value === ADMIN_COOKIE_VALUE;
}

export function getAdminCookieConfig() {
  return {
    name: ADMIN_COOKIE,
    value: ADMIN_COOKIE_VALUE,
    options: {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: false,
      path: '/',
      maxAge: 60 * 60 * 24,
    },
  };
}
