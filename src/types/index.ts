export type ExpenseType = 'one-time' | 'recurring';
export type RecurringFrequency = 'monthly' | 'yearly';

export interface Expense {
  id: string;
  name: string;
  amount: number;
  type: ExpenseType;
  frequency?: RecurringFrequency;
  currency?: string; // Currency this expense was created in
}

export interface PlanSettings {
  targetRunwayMonths: number;
  bufferMonths: number;
  bufferPercentage: number;
  primaryCurrency: string;
  secondaryCurrency: string;
  showSecondaryCurrency: boolean;
  // MRR/ARR Calculator settings
  mrrSettings?: {
    startingMRR: number;
    startingCustomers: number;
    monthlyGrowthRate: number;
    monthlyChurnRate: number;
    arpu: number;
    projectionMonths: number;
  };
  // Burn Rate Calculator settings
  burnRateSettings?: {
    startingCash: number;
    monthlyRevenue: number;
    monthlyExpenses: number;
    projectionMonths: number;
  };
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
