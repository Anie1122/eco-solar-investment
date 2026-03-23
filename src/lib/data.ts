import type { InvestmentPlan, Transaction } from './types';
import { serverTimestamp } from 'firebase/firestore';


// NOTE: The 'transactions' array is now just for type reference and examples.
// The actual transaction data will be fetched from Firestore.

export const investmentPlans: InvestmentPlan[] = [
  {
    id: 'plan-1',
    name: 'Starter Solar Kit',
    amount: 10,
    duration: 30,
    dailyProfit: 1,
    totalReturn: 40,
    image: 'solar-panel-1',
  },
  {
    id: 'plan-2',
    name: 'Home Power Solution',
    amount: 30.45,
    duration: 30,
    dailyProfit: 3.29875,
    totalReturn: 129.4125,
    image: 'solar-panel-2',
  },
  {
    id: 'plan-3',
    name: 'Business Basic',
    amount: 63.4375,
    duration: 30,
    dailyProfit: 6.34375,
    totalReturn: 253.75,
    image: 'solar-panel-3',
  },
  {
    id: 'plan-4',
    name: 'Commercial Power',
    amount: 126.875,
    duration: 30,
    dailyProfit: 11.41875,
    totalReturn: 469.4375,
    image: 'solar-panel-4',
  },
  {
    id: 'plan-5',
    name: 'Industrial Unit',
    amount: 329.875,
    duration: 30,
    dailyProfit: 30.45,
    totalReturn: 1243.375,
    image: 'solar-panel-5',
  },
  {
    id: 'plan-6',
    name: 'Power Grid',
    amount: 659.75,
    duration: 20,
    dailyProfit: 68.5125,
    totalReturn: 2030,
    image: 'solar-panel-6',
  },
  {
    id: 'plan-7',
    name: 'Solar Farm',
    amount: 1268.75,
    duration: 20,
    dailyProfit: 121.8,
    totalReturn: 3704.75,
    image: 'solar-panel-7',
  },
];
