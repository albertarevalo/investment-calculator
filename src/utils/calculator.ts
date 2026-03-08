import type { Expense, PlanSettings, CalculationResult, RevenueStream } from '../types';

export const calculateResults = (
  expenses: Expense[],
  settings: PlanSettings,
  availableFunds: number
): CalculationResult => {
  let oneTimeTotal = 0;
  let monthlyRecurring = 0;
  let yearlyRecurring = 0;

  expenses.forEach((expense) => {
    if (expense.type === 'one-time') {
      oneTimeTotal += expense.amount;
    } else {
      if (expense.frequency === 'monthly') {
        monthlyRecurring += expense.amount;
      } else if (expense.frequency === 'yearly') {
        yearlyRecurring += expense.amount;
      }
    }
  });

  const revenueStreams: RevenueStream[] = settings.burnRateSettings?.revenueStreams || [];

  const monthlyBurnAt = (month: number) => {
    return expenses.reduce((total, expense) => {
      const startMonth = expense.startMonth ?? 0;
      if (month < startMonth) return total;
      if (expense.type === 'recurring') {
        const baseMonthly = expense.frequency === 'yearly' ? expense.amount / 12 : expense.amount;
        const growthRate = typeof expense.growthRate === 'number' ? expense.growthRate : 0;
        const monthsElapsed = month - startMonth;
        const grown = baseMonthly * Math.pow(1 + growthRate / 100, monthsElapsed);
        return total + Math.max(grown, 0);
      }
      return total;
    }, 0);
  };

  const monthlyRevenueAt = (month: number) => {
    return revenueStreams.reduce((sum, stream) => {
      const startMonth = stream.startMonth ?? 0;
      if (month < startMonth) return sum;
      const baseMonthly = stream.frequency === 'yearly' ? stream.amount / 12 : stream.amount;
      const growthRate = typeof stream.growthRate === 'number' ? stream.growthRate : 0;
      const monthsElapsed = month - startMonth;
      const grown = baseMonthly * Math.pow(1 + growthRate / 100, monthsElapsed);
      return sum + Math.max(grown, 0);
    }, 0);
  };

  const oneTimeAt = (month: number) => {
    return expenses.reduce((total, expense) => {
      const startMonth = expense.startMonth ?? 0;
      if (expense.type === 'one-time' && startMonth === month) {
        return total + expense.amount;
      }
      return total;
    }, 0);
  };

  const monthlyNetBurn = monthlyBurnAt(0) - monthlyRevenueAt(0);
  const monthlyBurn = monthlyNetBurn;

  let totalNeeded = 0;
  for (let month = 0; month < settings.targetRunwayMonths; month++) {
    const netThisMonth = monthlyBurnAt(month) - monthlyRevenueAt(month);
    const monthNeed = Math.max(netThisMonth, 0) + oneTimeAt(month);
    totalNeeded += monthNeed;
  }

  // Add extra buffer months first, then apply percentage buffer on the combined subtotal
  const bufferMonthsAmount = Math.max(monthlyNetBurn, 0) * settings.bufferMonths;
  const subtotalBeforePercentageBuffer = totalNeeded + bufferMonthsAmount;
  const bufferAmount = subtotalBeforePercentageBuffer * (settings.bufferPercentage / 100);
  const totalWithBuffer = subtotalBeforePercentageBuffer + bufferAmount;

  let runwayMonths: number = 0;
  let remaining = availableFunds;
  const maxMonths = 600; // safety cap
  for (let month = 0; month < maxMonths; month++) {
    const burnThisMonth = monthlyBurnAt(month) - monthlyRevenueAt(month) + oneTimeAt(month);
    if (burnThisMonth <= 0) {
      runwayMonths = Infinity;
      break;
    }
    remaining -= burnThisMonth;
    if (remaining < 0) {
      runwayMonths = month;
      break;
    }
    runwayMonths = month + 1;
  }

  return {
    oneTimeTotal,
    monthlyRecurring,
    yearlyRecurring,
    monthlyBurn,
    totalNeeded,
    totalWithBuffer,
    runwayMonths: Math.max(0, runwayMonths),
    availableFunds,
  };
};

export const formatCurrency = (amount: number, currency: string): string => {
  return `${currency}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatNumber = (num: number): string => {
  return num.toLocaleString('en-US', { maximumFractionDigits: 1 });
};
