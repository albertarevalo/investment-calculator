export type ExpenseType = 'one-time' | 'recurring';
export type RecurringFrequency = 'monthly' | 'yearly';

export interface Expense {
  id: string;
  name: string;
  amount: number;
  type: ExpenseType;
  frequency?: RecurringFrequency;
  startMonth?: number; // month offset (0 = current month)
  currency?: string; // Currency this expense was created in
  growthRate?: number; // MoM growth percentage (0-100+)
}

export interface RevenueStream {
  id: string;
  name: string;
  amount: number;
  frequency: RecurringFrequency;
  currency?: string;
  startMonth?: number; // month offset (0 = current month)
  growthRate?: number; // MoM growth percentage (0-100+)
}

export interface BurnRateSettings {
  startingCash: number;
  projectionMonths: number;
  revenueStreams: RevenueStream[];
}

export interface PlanSettings {
  targetRunwayMonths: number;
  bufferMonths: number;
  bufferPercentage: number;
  primaryCurrency: string;
  secondaryCurrency: string;
  showSecondaryCurrency: boolean;
  showMrrTab?: boolean;
  // MRR/ARR Calculator settings
  mrrSettings?: {
    plans: {
      id: string;
      name: string;
      price: number;
      billing: 'monthly' | 'annual';
      mix: number; // percentage weight of new customers choosing this plan
    }[];
    startingCustomers: number;
    monthlyLeads: number;
    trialStartRate: number; // % of leads starting trial
    trialToPaidRate: number; // % of trials converting
    salesCycleLag: number; // months delay before conversion
    monthlyChurnRate: number;
    expansionRate: number; // % of existing MRR expanding
    contractionRate: number; // % of existing MRR downgrading
    manualCAC: number; // cost to acquire a customer for marketing derived leads
    useMarketingSpend: boolean;
    projectionMonths: number;
  };
  // Burn Rate Calculator settings
  burnRateSettings?: BurnRateSettings;
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
  liveMonthlyBurn: number;
  totalNeeded: number;
  totalWithBuffer: number;
  runwayMonths: number;
  availableFunds: number;
}
