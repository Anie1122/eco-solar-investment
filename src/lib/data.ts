import type { InvestmentPlan, Transaction } from './types';
import { serverTimestamp } from 'firebase/firestore';


// NOTE: The 'transactions' array is now just for type reference and examples.
// The actual transaction data will be fetched from Firestore.

type PlanSeed = Omit<InvestmentPlan, 'dailyProfit' | 'totalReturn'>;

const toMoney = (value: number) =>
  Number((Number.isFinite(value) ? value : 0).toFixed(2));

const withComputedProfit = (plan: PlanSeed): InvestmentPlan => {
  const dailyProfit = toMoney(plan.amount * 0.2);
  const totalProfit = toMoney(dailyProfit * plan.duration);
  const totalReturn = toMoney(plan.amount + totalProfit);
  return { ...plan, dailyProfit, totalReturn };
};

export const investmentPlans: InvestmentPlan[] = [
  withComputedProfit({
    id: 'plan-1',
    name: 'Starter Solar Kit',
    amount: 500,
    duration: 15,
    image: 'solar-panel-1',
  }),
  withComputedProfit({
    id: 'plan-2',
    name: 'Home Power Solution',
    amount: 1000,
    duration: 15,
    image: 'solar-panel-2',
  }),
  withComputedProfit({
    id: 'plan-3',
    name: 'Business Basic',
    amount: 2500,
    duration: 15,
    image: 'solar-panel-3',
  }),
  withComputedProfit({
    id: 'plan-4',
    name: 'Commercial Power',
    amount: 5000,
    duration: 15,
    image: 'solar-panel-4',
  }),
  withComputedProfit({
    id: 'plan-5',
    name: 'Industrial Unit',
    amount: 10000,
    duration: 15,
    image: 'solar-panel-5',
  }),
  withComputedProfit({
    id: 'plan-6',
    name: 'Power Grid',
    amount: 20000,
    duration: 15,
    image: 'solar-panel-6',
  }),
  withComputedProfit({
    id: 'plan-7',
    name: 'Solar Farm',
    amount: 50000,
    duration: 15,
    image: 'solar-panel-7',
  }),
];
