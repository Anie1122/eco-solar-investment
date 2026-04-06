export const GIFT_CARD_TYPES = [
  'Amazon',
  'Apple',
  'Steam',
  'Google Play',
  'PlayStation',
  'Vanilla',
  'Mastercard',
  'Razor Gold',
] as const;

export type GiftCardType = (typeof GIFT_CARD_TYPES)[number];

export const GIFT_CARD_MIN_AMOUNT = 15000; // ₦15,000
export const GIFT_CARD_MAX_AMOUNT = 2000000; // ₦2,000,000

export const GIFT_CARD_STATUSES = ['pending', 'approved', 'declined'] as const;
export type GiftCardStatus = (typeof GIFT_CARD_STATUSES)[number];
