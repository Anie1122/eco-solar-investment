import { z } from 'zod';

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

export const GIFT_CARD_MIN_AMOUNT = 15000;
export const GIFT_CARD_MAX_AMOUNT = 2000000;

export const giftCardPaymentSchema = z.object({
  gift_card_type: z.enum(GIFT_CARD_TYPES),
  gift_card_code: z.string().trim().min(1, 'Gift card code is required'),
  amount: z.coerce
    .number({ invalid_type_error: 'Amount is required' })
    .min(GIFT_CARD_MIN_AMOUNT, `Minimum amount is ${GIFT_CARD_MIN_AMOUNT}`)
    .max(GIFT_CARD_MAX_AMOUNT, `Maximum amount is ${GIFT_CARD_MAX_AMOUNT}`),
  note: z.string().trim().max(1000).optional().or(z.literal('')),
});

export type GiftCardType = (typeof GIFT_CARD_TYPES)[number];
