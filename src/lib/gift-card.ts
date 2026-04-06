export const GIFT_CARD_TYPES = [
  'Amazon',
  'Apple',
  'Steam',
  'Google Play',
  'PlayStation',
  'Vanilla',
  'Mastercard',
  'Razor gold',
] as const;

export type GiftCardType = (typeof GIFT_CARD_TYPES)[number];

export const GIFT_CARD_MIN_AMOUNT = 500;
export const GIFT_CARD_MIN_AMOUNT = 15000;
export const GIFT_CARD_MAX_AMOUNT = 2000000;

export const GIFT_CARD_STATUSES = ['pending', 'approved', 'declined'] as const;
export type GiftCardStatus = (typeof GIFT_CARD_STATUSES)[number];
