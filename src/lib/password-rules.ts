export const PASSWORD_RULES_MESSAGE =
  'Password must be at least 6 characters and include uppercase, lowercase, and a number.';

export type PasswordChecks = {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
};

export function getPasswordChecks(password: string): PasswordChecks {
  return {
    minLength: password.length >= 6,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
  };
}

export function isPasswordValid(password: string): boolean {
  const checks = getPasswordChecks(password);
  return Object.values(checks).every(Boolean);
}

export function getPasswordStrength(password: string): {
  score: number;
  label: 'Weak' | 'Medium' | 'Strong';
  progress: number;
  colorClass: string;
} {
  const checks = getPasswordChecks(password);
  const score = Object.values(checks).filter(Boolean).length;

  if (score <= 1) {
    return {
      score,
      label: 'Weak',
      progress: password.length === 0 ? 0 : 33,
      colorClass: 'bg-red-500',
    };
  }

  if (score <= 3) {
    return {
      score,
      label: 'Medium',
      progress: 66,
      colorClass: 'bg-amber-500',
    };
  }

  return {
    score,
    label: 'Strong',
    progress: 100,
    colorClass: 'bg-emerald-500',
  };
}
