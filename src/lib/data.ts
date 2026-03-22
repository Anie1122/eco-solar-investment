import type { InvestmentPlan, Transaction } from './types';
import { serverTimestamp } from 'firebase/firestore';


// NOTE: The 'transactions' array is now just for type reference and examples.
// The actual transaction data will be fetched from Firestore.

export const investmentPlans: InvestmentPlan[] = [
  {
    id: 'plan-1',
    name: 'Starter Solar Kit',
    amount: 5000,
    duration: 30,
    dailyProfit: 500,
    totalReturn: 20000,
    image: 'solar-panel-1',
  },
  {
    id: 'plan-2',
    name: 'Home Power Solution',
    amount: 12000,
    duration: 30,
    dailyProfit: 1300,
    totalReturn: 51000,
    image: 'solar-panel-2',
  },
  {
    id: 'plan-3',
    name: 'Business Basic',
    amount: 25000,
    duration: 30,
    dailyProfit: 2500,
    totalReturn: 100000,
    image: 'solar-panel-3',
  },
  {
    id: 'plan-4',
    name: 'Commercial Power',
    amount: 50000,
    duration: 30,
    dailyProfit: 4500,
    totalReturn: 185000,
    image: 'solar-panel-4',
  },
  {
    id: 'plan-5',
    name: 'Industrial Unit',
    amount: 130000,
    duration: 30,
    dailyProfit: 12000,
    totalReturn: 490000,
    image: 'solar-panel-5',
  },
  {
    id: 'plan-6',
    name: 'Power Grid',
    amount: 260000,
    duration: 20,
    dailyProfit: 27000,
    totalReturn: 800000,
    image: 'solar-panel-6',
  },
  {
    id: 'plan-7',
    name: 'Solar Farm',
    amount: 500000,
    duration: 20,
    dailyProfit: 48000,
    totalReturn: 1460000,
    image: 'solar-panel-7',
  },
];
