import type { InvestmentPlan, Transaction } from './types';
import { serverTimestamp } from 'firebase/firestore';


// NOTE: The 'transactions' array is now just for type reference and examples.
// The actual transaction data will be fetched from Firestore.

export const investmentPlans: InvestmentPlan[] = [
  {
    id: 'plan-1',
    name: 'Starter Solar Kit',
    amount: 3.625,
    duration: 30,
    dailyProfit: 0.3625,
    totalReturn: 14.5,
    image: 'solar-panel-1',
  },
  {
    id: 'plan-2',
    name: 'Home Power Solution',
    amount: 8.7,
    duration: 30,
    dailyProfit: 0.9425,
    totalReturn: 36.975,
    image: 'solar-panel-2',
  },
  {
    id: 'plan-3',
    name: 'Business Basic',
    amount: 18.125,
    duration: 30,
    dailyProfit: 1.8125,
    totalReturn: 72.5,
    image: 'solar-panel-3',
  },
  {
    id: 'plan-4',
    name: 'Commercial Power',
    amount: 36.25,
    duration: 30,
    dailyProfit: 3.2625,
    totalReturn: 134.125,
    image: 'solar-panel-4',
  },
  {
    id: 'plan-5',
    name: 'Industrial Unit',
    amount: 94.25,
    duration: 30,
    dailyProfit: 8.7,
    totalReturn: 355.25,
    image: 'solar-panel-5',
  },
  {
    id: 'plan-6',
    name: 'Power Grid',
    amount: 188.5,
    duration: 20,
    dailyProfit: 19.575,
    totalReturn: 580,
    image: 'solar-panel-6',
  },
  {
    id: 'plan-7',
    name: 'Solar Farm',
    amount: 362.5,
    duration: 20,
    dailyProfit: 34.8,
    totalReturn: 1058.5,
    image: 'solar-panel-7',
  },
];
