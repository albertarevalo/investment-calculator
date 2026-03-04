import type { AppState, Plan, BurnRateSettings, RevenueStream } from '../types';

const STORAGE_KEY = 'investment-calculator-data';

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const createDefaultBurnRateSettings = (): BurnRateSettings => ({
  startingCash: 0,
  projectionMonths: 12,
  revenueStreams: [],
});

export const normalizeBurnRateSettings = (raw: any): BurnRateSettings => {
  if (!raw || typeof raw !== 'object') {
    return createDefaultBurnRateSettings();
  }

  const revenueStreams: RevenueStream[] = Array.isArray(raw.revenueStreams)
    ? raw.revenueStreams.map((stream: any) => ({
        id: typeof stream.id === 'string' ? stream.id : generateId(),
        name:
          typeof stream.name === 'string' && stream.name.trim().length > 0
            ? stream.name.trim()
            : 'Revenue Stream',
        amount: typeof stream.amount === 'number' ? stream.amount : 0,
        frequency: stream.frequency === 'yearly' ? 'yearly' : 'monthly',
        currency: typeof stream.currency === 'string' ? stream.currency : undefined,
      }))
    : [];

  if (revenueStreams.length === 0 && typeof raw.monthlyRevenue === 'number' && raw.monthlyRevenue > 0) {
    revenueStreams.push({
      id: generateId(),
      name:
        typeof raw.revenueName === 'string' && raw.revenueName.trim().length > 0
          ? raw.revenueName.trim()
          : 'Recurring Revenue',
      amount: raw.monthlyRevenue,
      frequency: raw.revenueFrequency === 'yearly' ? 'yearly' : 'monthly',
      currency: typeof raw.currency === 'string' ? raw.currency : undefined,
    });
  }

  return {
    startingCash: typeof raw.startingCash === 'number' ? raw.startingCash : 0,
    projectionMonths: typeof raw.projectionMonths === 'number' ? raw.projectionMonths : 12,
    revenueStreams,
  };
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
    burnRateSettings: createDefaultBurnRateSettings(),
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
              burnRateSettings: createDefaultBurnRateSettings(),
            },
          };
        }

        return {
          ...plan,
          settings: {
            ...plan.settings,
            burnRateSettings: normalizeBurnRateSettings(oldSettings?.burnRateSettings),
          },
        };
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
