export type ExpenseType = 'one-time' | 'recurring';
export type RecurringFrequency = 'monthly' | 'yearly';

export interface Expense {
  id: string;
  name: string;
  amount: number;
  type: ExpenseType;
  frequency?: RecurringFrequency;
}

export interface PlanSettings {
  targetRunwayMonths: number;
  bufferMonths: number;
  bufferPercentage: number;
  primaryCurrency: string;
  secondaryCurrency: string;
  showSecondaryCurrency: boolean;
}

export interface Plan {
  id: string;
  name: string;
  createdAt: string;
  expenses: Expense[];
  settings: PlanSettings;
}

export interface AppState {
  plans: Plan[];
  activePlanId: string;
}

export interface CalculationResult {
  oneTimeTotal: number;
  monthlyRecurring: number;
  yearlyRecurring: number;
  monthlyBurn: number;
  totalNeeded: number;
  totalWithBuffer: number;
  runwayMonths: number;
  availableFunds: number;
}
