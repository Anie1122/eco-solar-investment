export const GIFT_CARD_TYPES = [
  'Xbox',
  'eBay',
  'Sephora',
  'Cash App',
  'Green Dot',
  'Dollar General',
  'Footlocker',
  'CVS Pharmacy',
  'GameStop',
  "Macy's",
  'Target',
  'Venmo',
  'Nike',
  'Nordstrom',
  'Google',
  'PlayStation',
  'Roblox',
  'Walmart',
  'AMEX',
  'Mastercard',
  'Vanilla',
] as const;

export type GiftCardType = (typeof GIFT_CARD_TYPES)[number];

export const GIFT_CARD_MIN_AMOUNT = 500;
export const GIFT_CARD_MAX_AMOUNT = 2000000;

export const GIFT_CARD_STATUSES = ['pending', 'approved', 'declined'] as const;
export type GiftCardStatus = (typeof GIFT_CARD_STATUSES)[number];
