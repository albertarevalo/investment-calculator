import type { Expense, PlanSettings, CalculationResult } from '../types';

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

  const monthlyBurnAt = (month: number) => {
    return expenses.reduce((total, expense) => {
      const startMonth = expense.startMonth ?? 0;
      if (month < startMonth) return total;
      if (expense.type === 'recurring') {
        const monthlyAmount = expense.frequency === 'yearly' ? expense.amount / 12 : expense.amount;
        return total + monthlyAmount;
      }
      return total;
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

  const monthlyBurn = monthlyBurnAt(0);

  let totalNeeded = 0;
  for (let month = 0; month < settings.targetRunwayMonths; month++) {
    totalNeeded += monthlyBurnAt(month) + oneTimeAt(month);
  }

  const bufferAmount = totalNeeded * (settings.bufferPercentage / 100);
  const bufferMonthsAmount = monthlyBurn * settings.bufferMonths;
  const totalWithBuffer = totalNeeded + bufferAmount + bufferMonthsAmount;

  let runwayMonths: number = 0;
  let remaining = availableFunds;
  const maxMonths = 600; // safety cap
  for (let month = 0; month < maxMonths; month++) {
    const burnThisMonth = monthlyBurnAt(month) + oneTimeAt(month);
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
