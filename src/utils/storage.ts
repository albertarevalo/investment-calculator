import type { AppState, Plan } from '../types';

const STORAGE_KEY = 'investment-calculator-data';

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const createDefaultPlan = (): Plan => ({
  id: generateId(),
  name: 'My Plan',
  createdAt: new Date().toISOString(),
  expenses: [],
  settings: {
    targetRunwayMonths: 12,
    bufferMonths: 3,
    bufferPercentage: 20,
    primaryCurrency: 'USD',
    secondaryCurrency: 'EUR',
    showSecondaryCurrency: false,
  },
});

export const loadState = (): AppState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const plans = (parsed.plans || [createDefaultPlan()]).map((plan: Plan) => {
        // Migrate old plans that had 'currency' instead of 'primaryCurrency'
        const oldSettings = plan.settings as any;
        if (oldSettings.currency && !oldSettings.primaryCurrency) {
          return {
            ...plan,
            settings: {
              targetRunwayMonths: oldSettings.targetRunwayMonths || 12,
              bufferMonths: oldSettings.bufferMonths || 3,
              bufferPercentage: oldSettings.bufferPercentage || 20,
              primaryCurrency: 'USD', // Default migration to USD
              secondaryCurrency: 'EUR',
              showSecondaryCurrency: false,
            },
          };
        }
        return plan;
      });
      return {
        plans,
        activePlanId: parsed.activePlanId || plans[0]?.id || createDefaultPlan().id,
      };
    }
  } catch {
    // ignore parse errors
  }
  const defaultPlan = createDefaultPlan();
  return {
    plans: [defaultPlan],
    activePlanId: defaultPlan.id,
  };
};

export const saveState = (state: AppState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage errors
  }
};
