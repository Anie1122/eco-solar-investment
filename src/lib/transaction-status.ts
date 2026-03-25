export const ALLOWED_TRANSACTION_STATUSES = ['pending', 'success', 'failed'] as const;

export type TransactionStatus = (typeof ALLOWED_TRANSACTION_STATUSES)[number];

export function isTransactionStatus(value: string): value is TransactionStatus {
  return (ALLOWED_TRANSACTION_STATUSES as readonly string[]).includes(value);
}

export function assertTransactionStatus(value: string): TransactionStatus {
  if (!isTransactionStatus(value)) {
    throw new Error(`Invalid transaction status: ${value}`);
  }
  return value;
}

