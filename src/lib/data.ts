import type { InvestmentPlan, Transaction } from './types';
import { serverTimestamp } from 'firebase/firestore';


// NOTE: The 'transactions' array is now just for type reference and examples.
// The actual transaction data will be fetched from Firestore.

type PlanSeed = Omit<InvestmentPlan, 'totalReturn'>;

const toMoney = (value: number) =>
  Number((Number.isFinite(value) ? value : 0).toFixed(6));

const withComputedReturn = (plan: PlanSeed): InvestmentPlan => {
  const totalReturn = plan.dailyProfit * plan.duration;
  return { ...plan, totalReturn: toMoney(totalReturn) };
};

export const investmentPlans: InvestmentPlan[] = [
  withComputedReturn({
    id: 'plan-1',
    name: 'Starter Solar Kit',
    amount: 10,
    duration: 30,
    dailyProfit: 1,
    image: 'solar-panel-1',
  }),
  withComputedReturn({
    id: 'plan-2',
    name: 'Home Power Solution',
    amount: 30.45,
    duration: 30,
    dailyProfit: 3.29875,
    image: 'solar-panel-2',
  }),
  withComputedReturn({
    id: 'plan-3',
    name: 'Business Basic',
    amount: 63.4375,
    duration: 30,
    dailyProfit: 6.34375,
    image: 'solar-panel-3',
  }),
  withComputedReturn({
    id: 'plan-4',
    name: 'Commercial Power',
    amount: 126.875,
    duration: 30,
    dailyProfit: 11.41875,
    image: 'solar-panel-4',
  }),
  withComputedReturn({
    id: 'plan-5',
    name: 'Industrial Unit',
    amount: 329.875,
    duration: 30,
    dailyProfit: 30.45,
    image: 'solar-panel-5',
  }),
  withComputedReturn({
    id: 'plan-6',
    name: 'Power Grid',
    amount: 659.75,
    duration: 20,
    dailyProfit: 68.5125,
    image: 'solar-panel-6',
  }),
  withComputedReturn({
    id: 'plan-7',
    name: 'Solar Farm',
    amount: 1268.75,
    duration: 20,
    dailyProfit: 121.8,
    image: 'solar-panel-7',
  }),
];
