
import { Timestamp } from "firebase/firestore";

export type InvestmentPlan = {
  id: string;
  name: string;
  amount: number;
  duration: number; // in days
  dailyProfit: number;
  totalReturn: number;
  image: string;
};

export type Transaction = {
  id: string;
  userId: string;
  transactionType: 'deposit' | 'withdrawal' | 'profit' | 'bonus' | 'investment';
  amount: number;
  transactionDate: Timestamp;
  description: string;
  status: 'success' | 'pending' | 'failed';
  currency: string;
  withdrawalDetails?: WithdrawalAccount;
};

export type WithdrawalAccount = {
  bankName: string;
  accountNumber: string;
  accountName: string;
  country: string;
  lastUsedAt?: Timestamp;
};

export type User = {
  id: string;
  fullName: string;
  email: string;
  photoURL?: string | null;
  country: string;
  currency: string;
  phoneNumber: string;
  walletBalance: number;
  bonusBalance: number;
  hasInvested: boolean;
  profileCompleted: boolean;
  status: 'active' | 'inactive';
  createdAt: Timestamp;
  withdrawalAccount?: WithdrawalAccount | null;
}

export type Investment = {
    id: string;
    userId: string;
    investmentPlanId: string;
    startDate: Timestamp;
    endDate: Timestamp;
    status: 'active' | 'completed';
    initialInvestment: number;
    lastProfitCreditedAt?: Timestamp;
}

export type Notification = {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'deposit' | 'investment' | 'profit' | 'withdrawal' | 'bonus' | 'error' | 'info';
  createdAt: Timestamp;
  read: boolean;
  amount?: number;
  currency?: string;
}
