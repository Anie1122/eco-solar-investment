import type { InvestmentPlan, Transaction } from './types';
import { serverTimestamp } from 'firebase/firestore';


// NOTE: The 'transactions' array is now just for type reference and examples.
// The actual transaction data will be fetched from Firestore.

type PlanSeed = Omit<InvestmentPlan, 'weeklyProfit' | 'totalReturn'>;

const toMoney = (value: number) =>
  Number((Number.isFinite(value) ? value : 0).toFixed(2));

export const PLAN_DURATION_WEEKS = 6;
export const WEEKLY_PROFIT_RATE = 0.3;

const withComputedProfit = (plan: PlanSeed): InvestmentPlan => {
  const weeklyProfit = toMoney(plan.amount * WEEKLY_PROFIT_RATE);
  const totalProfit = toMoney(weeklyProfit * plan.durationWeeks);
  const totalReturn = toMoney(plan.amount + totalProfit);
  return { ...plan, weeklyProfit, totalReturn };
};

export const investmentPlans: InvestmentPlan[] = [
  withComputedProfit({
    id: 'plan-1',
    name: 'Starter Solar Kit',
    amount: 500,
    durationWeeks: PLAN_DURATION_WEEKS,
    image: 'solar-panel-1',
  }),
  withComputedProfit({
    id: 'plan-2',
    name: 'Home Power Solution',
    amount: 1000,
    durationWeeks: PLAN_DURATION_WEEKS,
    image: 'solar-panel-2',
  }),
  withComputedProfit({
    id: 'plan-3',
    name: 'Business Basic',
    amount: 2500,
    durationWeeks: PLAN_DURATION_WEEKS,
    image: 'solar-panel-3',
  }),
  withComputedProfit({
    id: 'plan-4',
    name: 'Commercial Power',
    amount: 5000,
    durationWeeks: PLAN_DURATION_WEEKS,
    image: 'solar-panel-4',
  }),
  withComputedProfit({
    id: 'plan-5',
    name: 'Industrial Unit',
    amount: 10000,
    durationWeeks: PLAN_DURATION_WEEKS,
    image: 'solar-panel-5',
  }),
  withComputedProfit({
    id: 'plan-6',
    name: 'Power Grid',
    amount: 20000,
    durationWeeks: PLAN_DURATION_WEEKS,
    image: 'solar-panel-6',
  }),
  withComputedProfit({
    id: 'plan-7',
    name: 'Solar Farm',
    amount: 50000,
    durationWeeks: PLAN_DURATION_WEEKS,
    image: 'solar-panel-7',
  }),
];
