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

  const monthlyBurn = monthlyRecurring + yearlyRecurring / 12;
  const totalNeeded = oneTimeTotal + monthlyBurn * settings.targetRunwayMonths;
  
  const bufferAmount = totalNeeded * (settings.bufferPercentage / 100);
  const bufferMonthsAmount = monthlyBurn * settings.bufferMonths;
  const totalWithBuffer = totalNeeded + bufferAmount + bufferMonthsAmount;

  const runwayMonths = monthlyBurn > 0 
    ? (availableFunds - oneTimeTotal) / monthlyBurn 
    : 0;

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
