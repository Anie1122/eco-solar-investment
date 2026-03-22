import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Transaction } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export const getStatusBadgeVariant = (
  status: Transaction['status']
): 'default' | 'secondary' | 'destructive' | 'success' | 'warning' => {
  switch (status) {
    case 'approved':
      return 'success';
    case 'pending':
      return 'warning';
    case 'failed':
    case 'rejected':
      return 'destructive';
    default:
      return 'secondary';
  }
};
