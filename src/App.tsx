import { useState, useCallback, useMemo, useEffect } from 'react';
import type { AppState, Expense, Plan, BurnRateSettings } from './types';
import { loadState, saveState, createDefaultPlan, generateId, createDefaultBurnRateSettings, normalizeBurnRateSettings, createDefaultMrrSettings, normalizeMrrSettings } from './utils/storage';
import { calculateResults } from './utils/calculator';
import { ExpenseList } from './components/ExpenseList';
import { ExpenseForm } from './components/ExpenseForm';
import { SummaryCards } from './components/SummaryCards';
import { CalculatorControls } from './components/CalculatorControls';
import { Charts } from './components/Charts';
import { PlanManager } from './components/PlanManager';
import { CompareModal } from './components/CompareModal';
import { LayoutDashboard, TrendingUp, Flame, Maximize2, Minimize2, Info, Edit2, Copy } from 'lucide-react';
import { MRRCalculator } from './components/MRRCalculator';
import { BurnRateCalculator } from './components/BurnRateCalculator';
import { useToast, ToastContainer, toast } from './hooks/useToast.tsx';
import { useExchangeRates } from './hooks/useExchangeRates.ts';

type PlanUpdates = Partial<Omit<Plan, 'settings'>> & {
  settings?: Partial<Plan['settings']>;
};

function App() {
  const [state, setState] = useState<AppState>(loadState);
  const [availableFunds, setAvailableFunds] = useState<number>(0);
  const [showCompare, setShowCompare] = useState(false);
  const [activeTab, setActiveTab] = useState<'expenses' | 'charts' | 'mrr' | 'burn'>('expenses');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showVisualizations, setShowVisualizations] = useState(false);
  const [showIntroModal, setShowIntroModal] = useState(false);
  const [showMobilePlanSheet, setShowMobilePlanSheet] = useState(false);
  const { toasts, removeToast } = useToast();
  const { convert, rates } = useExchangeRates();

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    const seen = localStorage.getItem('pm_intro_seen');
    if (!seen) {
      setShowIntroModal(true);
      localStorage.setItem('pm_intro_seen', 'true');
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch {
      toast.error('Fullscreen not supported');
    }
  }, []);

  const activePlan = useMemo(() => {
    return state.plans.find((p) => p.id === state.activePlanId) || state.plans[0];
  }, [state.plans, state.activePlanId]);

  const showMrrTab = activePlan?.settings.showMrrTab ?? false;

  const results = useMemo(() => {
    if (!activePlan) return null;
    return calculateResults(activePlan.expenses, activePlan.settings, availableFunds);
  }, [activePlan, availableFunds]);

  useEffect(() => {
    if (activeTab === 'mrr' && !showMrrTab) {
      setActiveTab('expenses');
    }
  }, [activeTab, showMrrTab]);

  const updatePlan = useCallback((updates: PlanUpdates) => {
    setState((prev) => {
      const currentPlan = prev.plans.find((p) => p.id === prev.activePlanId);
      if (!currentPlan) return prev;

      const mergedSettings: Plan['settings'] = {
        ...currentPlan.settings,
        ...(updates.settings || {}),
      };

      const oldPrimaryCurrency = currentPlan.settings.primaryCurrency;
      const newPrimaryCurrency = mergedSettings.primaryCurrency;
      const primaryCurrencyChanged = oldPrimaryCurrency !== newPrimaryCurrency && !!rates;

      // Ensure burn rate settings are normalized before any currency adjustments
      let normalizedBurnSettings = normalizeBurnRateSettings(mergedSettings.burnRateSettings);

      // If primary currency changed, convert expenses and revenue streams
      let newExpenses = updates.expenses || currentPlan.expenses;
      if (primaryCurrencyChanged) {
        newExpenses = newExpenses.map((expense) => {
          const expenseCurrency = expense.currency || oldPrimaryCurrency;
          if (expenseCurrency === newPrimaryCurrency) {
            return { ...expense, currency: newPrimaryCurrency };
          }
          const convertedAmount = convert(expense.amount, expenseCurrency, newPrimaryCurrency);
          return {
            ...expense,
            amount: Math.round(convertedAmount * 100) / 100,
            currency: newPrimaryCurrency,
          };
        });

        normalizedBurnSettings = {
          ...normalizedBurnSettings,
          revenueStreams: normalizedBurnSettings.revenueStreams.map((stream) => {
            const streamCurrency = stream.currency || oldPrimaryCurrency;
            if (streamCurrency === newPrimaryCurrency) {
              return { ...stream, currency: newPrimaryCurrency };
            }
            const convertedAmount = convert(stream.amount, streamCurrency, newPrimaryCurrency);
            return {
              ...stream,
              amount: Math.round(convertedAmount * 100) / 100,
              currency: newPrimaryCurrency,
            };
          }),
        };

        const convertedFunds = Math.round(convert(availableFunds, oldPrimaryCurrency, newPrimaryCurrency) * 100) / 100;
        setAvailableFunds(convertedFunds);
      }

      mergedSettings.burnRateSettings = normalizedBurnSettings;

      const updatedPlans = prev.plans.map((p) =>
        p.id === prev.activePlanId
          ? {
              ...p,
              ...updates,
              settings: mergedSettings,
              expenses: newExpenses,
            }
          : p
      );

      if (primaryCurrencyChanged) {
        toast.success(`Converted plan data to ${newPrimaryCurrency}`);
      }

      return {
        ...prev,
        plans: updatedPlans,
      };
    });
  }, [availableFunds, convert, rates]);

  const addExpense = useCallback((expenseData: Omit<Expense, 'id' | 'currency'>) => {
    const newExpense: Expense = {
      ...expenseData,
      id: generateId(),
      currency: activePlan.settings.primaryCurrency,
    };
    updatePlan({ expenses: [...activePlan.expenses, newExpense] });
  }, [activePlan, updatePlan]);

  const updateExpense = useCallback((id: string, updates: Partial<Expense>) => {
    updatePlan({
      expenses: activePlan?.expenses.map((e) =>
        e.id === id ? { ...e, ...updates } : e
      ) || [],
    });
  }, [activePlan, updatePlan]);

  const deleteExpense = useCallback((id: string) => {
    updatePlan({
      expenses: activePlan?.expenses.filter((e) => e.id !== id) || [],
    });
  }, [activePlan, updatePlan]);

  const setActivePlan = useCallback((planId: string) => {
    setState((prev) => ({ ...prev, activePlanId: planId }));
  }, []);

  const createPlan = useCallback((name: string) => {
    const newPlan: Plan = {
      ...createDefaultPlan(),
      id: generateId(),
      name,
    };
    setState((prev) => ({
      ...prev,
      plans: [...prev.plans, newPlan],
      activePlanId: newPlan.id,
    }));
  }, []);

  const deletePlan = useCallback((planId: string) => {
    setState((prev) => {
      const newPlans = prev.plans.filter((p) => p.id !== planId);
      if (newPlans.length === 0) {
        const defaultPlan = createDefaultPlan();
        return {
          plans: [defaultPlan],
          activePlanId: defaultPlan.id,
        };
      }
      return {
        plans: newPlans,
        activePlanId: prev.activePlanId === planId ? newPlans[0].id : prev.activePlanId,
      };
    });
  }, []);

  const duplicatePlan = useCallback((planId: string) => {
    const planToClone = state.plans.find((p) => p.id === planId);
    if (!planToClone) return;
    
    const newPlan: Plan = {
      ...planToClone,
      id: generateId(),
      name: `${planToClone.name} (Copy)`,
      createdAt: new Date().toISOString(),
      expenses: planToClone.expenses.map((e) => ({ ...e, id: generateId() })),
    };
    
    setState((prev) => ({
      ...prev,
      plans: [...prev.plans, newPlan],
      activePlanId: newPlan.id,
    }));
  }, [state.plans]);

  const renamePlan = useCallback((planId: string, newName: string) => {
    setState((prev) => ({
      ...prev,
      plans: prev.plans.map((p) =>
        p.id === planId ? { ...p, name: newName } : p
      ),
    }));
  }, []);

  const handleImportPlan = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File too large. Maximum size is 5MB.');
        return;
      }
      if (!file.name.toLowerCase().endsWith('.json')) {
        toast.error('Invalid file type. Please select a JSON file.');
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => {
        toast.error('Failed to read file. Please try again.');
      };
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          if (!content || content.trim() === '') {
            toast.error('File is empty.');
            return;
          }
          let importedPlan: unknown;
          try {
            importedPlan = JSON.parse(content);
          } catch {
            toast.error('Invalid JSON format. Please check the file.');
            return;
          }
          if (!importedPlan || typeof importedPlan !== 'object') {
            toast.error('Invalid plan file format.');
            return;
          }
          const plan = importedPlan as Partial<Plan>;
          const rawSettings = (plan.settings || {}) as Record<string, unknown>;
          if (!plan.name || !Array.isArray(plan.expenses)) {
            toast.error('Plan file missing required fields.');
            return;
          }
          const existingPlan = state.plans.find((p) =>
            p.name.toLowerCase() === plan.name!.toString().toLowerCase()
          );
          let finalName = plan.name as string;
          if (existingPlan) {
            const timestamp = new Date().toLocaleDateString();
            finalName = `${plan.name} (Imported ${timestamp})`;
            toast.warning(`Plan renamed to "${finalName}" to avoid duplicates.`);
          }
          const validatedPlan: Plan = {
            id: generateId(),
            name: finalName.trim(),
            createdAt: new Date().toISOString(),
            expenses: (plan.expenses as unknown[]).map((e: any) => ({
              id: typeof e.id === 'string' ? e.id : generateId(),
              name: typeof e.name === 'string' ? e.name : 'Unnamed Expense',
              amount: typeof e.amount === 'number' ? e.amount : 0,
              type: e.type === 'recurring' ? 'recurring' : 'one-time',
              frequency: e.frequency === 'yearly' ? 'yearly' : 'monthly',
              startMonth: typeof e.startMonth === 'number' ? e.startMonth : 0,
              currency: typeof e.currency === 'string' ? e.currency : undefined,
              growthRate: typeof e.growthRate === 'number' ? e.growthRate : 0,
            })),
            settings: {
              targetRunwayMonths: Number((rawSettings as any).targetRunwayMonths) || 8,
              bufferMonths: Number((rawSettings as any).bufferMonths) || 0,
              bufferPercentage: Number((rawSettings as any).bufferPercentage) || 10,
              primaryCurrency: String((rawSettings as any).primaryCurrency || 'USD'),
              secondaryCurrency: String((rawSettings as any).secondaryCurrency || 'PHP'),
              showSecondaryCurrency: (rawSettings as any).showSecondaryCurrency !== undefined
                ? Boolean((rawSettings as any).showSecondaryCurrency)
                : true,
              mrrSettings: (rawSettings as any).mrrSettings && typeof (rawSettings as any).mrrSettings === 'object'
                ? normalizeMrrSettings((rawSettings as any).mrrSettings)
                : createDefaultMrrSettings(),
              burnRateSettings: (rawSettings as any).burnRateSettings && typeof (rawSettings as any).burnRateSettings === 'object'
                ? normalizeBurnRateSettings((rawSettings as any).burnRateSettings)
                : createDefaultBurnRateSettings(),
            },
          };
          setState((prev) => ({
            ...prev,
            plans: [...prev.plans, validatedPlan],
            activePlanId: validatedPlan.id,
          }));
          if (!existingPlan) {
            toast.success(`Plan "${finalName}" imported successfully!`);
          }
        } catch {
          toast.error('Failed to import plan. Please try again.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [state.plans, toast]);

  const exportPlan = useCallback((plan: Plan) => {
    try {
      const dataStr = JSON.stringify(plan, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${plan.name.replace(/\s+/g, '_').toLowerCase()}_plan.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Plan "${plan.name}" exported successfully!`);
    } catch {
      toast.error('Failed to export plan. Please try again.');
    }
  }, []);

  const handleBurnRateSettingsUpdate = useCallback((updater: (prev: BurnRateSettings) => BurnRateSettings) => {
    if (!activePlan) return;
    const currentSettings = activePlan.settings.burnRateSettings || createDefaultBurnRateSettings();
    const updatedSettings = updater(currentSettings);
    updatePlan({
      settings: {
        burnRateSettings: updatedSettings,
      },
    });
  }, [activePlan, updatePlan]);

  if (!activePlan || !results) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      {showIntroModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowIntroModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 sm:p-8 border border-gray-100">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">What this tool does</h2>
              </div>
              <button
                onClick={() => setShowIntroModal(false)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-gray-700 text-sm leading-relaxed">
              <p>Simulate your startup cash journey month by month to see runway, net burn, and when you reach investor-friendly milestones.</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Model revenue streams and expenses with future start months and MoM growth.</li>
                <li>View projections in tables and charts; spot healthy/warning/critical runway.</li>
                <li>Track payback multiples (1x–100x) and extend projections for 100x scenarios.</li>
                <li>Export/import plans to compare scenarios or share with stakeholders.</li>
              </ul>
            </div>
            <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-xs text-gray-500">We’ll only show this once per device. You can reopen it anytime.</div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowIntroModal(false)}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <a href="https://pawsbook.pet" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3">
                <img src="https://nbsxlhidzrtafcgvzkvf.supabase.co/storage/v1/object/public/pawsmatch-bucket/images/logo.png" alt="PawsMatch" className="w-10 h-10 object-contain" />
              </a>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Startup Runway Simulator</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 sm:ml-auto justify-start sm:justify-end">
              <div className="flex items-center gap-2 sm:hidden">
                <button
                  onClick={toggleFullscreen}
                  className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
                  title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setShowIntroModal(true)}
                  className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100"
                  title="What is this?"
                >
                  <Info className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowCompare(true)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100 text-sm font-medium"
                >
                  Compare
                </button>
                <button
                  onClick={() => setShowMobilePlanSheet(true)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 text-sm font-medium"
                >
                  Plans
                </button>
              </div>
              <button
                onClick={() => setShowIntroModal(true)}
                className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100 text-sm font-medium"
              >
                <Info className="w-4 h-4" />
                What is this?
              </button>
              <button
                onClick={toggleFullscreen}
                className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 text-sm font-medium"
                title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                <span className="hidden sm:inline">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
              </button>
              <div className="hidden sm:flex">
                <PlanManager
                  plans={state.plans}
                  activePlanId={state.activePlanId}
                  onSelectPlan={setActivePlan}
                  onCreatePlan={createPlan}
                  onDeletePlan={deletePlan}
                  onDuplicatePlan={duplicatePlan}
                  onCompare={() => setShowCompare(true)}
                  onRenamePlan={renamePlan}
                  onExportPlan={exportPlan}
                  onImportPlan={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.json,application/json';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (!file) return;
                      if (file.size > 5 * 1024 * 1024) {
                        toast.error('File too large. Maximum size is 5MB.');
                        return;
                      }
                      if (!file.name.toLowerCase().endsWith('.json')) {
                        toast.error('Invalid file type. Please select a JSON file.');
                        return;
                      }
                      const reader = new FileReader();
                      reader.onerror = () => {
                        toast.error('Failed to read file. Please try again.');
                      };
                      reader.onload = (event) => {
                        try {
                          const content = event.target?.result as string;
                          if (!content || content.trim() === '') {
                            toast.error('File is empty.');
                            return;
                          }
                          let importedPlan: unknown;
                          try {
                            importedPlan = JSON.parse(content);
                          } catch {
                            toast.error('Invalid JSON format. Please check the file.');
                            return;
                          }
                          if (!importedPlan || typeof importedPlan !== 'object') {
                            toast.error('Invalid plan file format.');
                            return;
                          }
                          const plan = importedPlan as Partial<Plan>;
                          const rawSettings = (plan.settings || {}) as Record<string, unknown>;
                          if (!plan.name || !Array.isArray(plan.expenses)) {
                            toast.error('Plan file missing required fields.');
                            return;
                          }
                          const existingPlan = state.plans.find((p) =>
                            p.name.toLowerCase() === plan.name!.toString().toLowerCase()
                          );
                          let finalName = plan.name as string;
                          if (existingPlan) {
                            const timestamp = new Date().toLocaleDateString();
                            finalName = `${plan.name} (Imported ${timestamp})`;
                            toast.warning(`Plan renamed to "${finalName}" to avoid duplicates.`);
                          }
                          const validatedPlan: Plan = {
                            id: generateId(),
                            name: finalName.trim(),
                            createdAt: new Date().toISOString(),
                            expenses: (plan.expenses as unknown[]).map((e: any) => ({
                              id: typeof e.id === 'string' ? e.id : generateId(),
                              name: typeof e.name === 'string' ? e.name : 'Unnamed Expense',
                              amount: typeof e.amount === 'number' ? e.amount : 0,
                              type: e.type === 'recurring' ? 'recurring' : 'one-time',
                              frequency: e.frequency === 'yearly' ? 'yearly' : 'monthly',
                              startMonth: typeof e.startMonth === 'number' ? e.startMonth : 0,
                              currency: typeof e.currency === 'string' ? e.currency : undefined,
                              growthRate: typeof e.growthRate === 'number' ? e.growthRate : 0,
                            })),
                            settings: {
                              targetRunwayMonths: Number((rawSettings as any).targetRunwayMonths) || 8,
                              bufferMonths: Number((rawSettings as any).bufferMonths) || 0,
                              bufferPercentage: Number((rawSettings as any).bufferPercentage) || 10,
                              primaryCurrency: String((rawSettings as any).primaryCurrency || 'USD'),
                              secondaryCurrency: String((rawSettings as any).secondaryCurrency || 'PHP'),
                              showSecondaryCurrency: (rawSettings as any).showSecondaryCurrency !== undefined
                                ? Boolean((rawSettings as any).showSecondaryCurrency)
                                : true,
                              mrrSettings: (rawSettings as any).mrrSettings && typeof (rawSettings as any).mrrSettings === 'object'
                                ? normalizeMrrSettings((rawSettings as any).mrrSettings)
                                : createDefaultMrrSettings(),
                              burnRateSettings: (rawSettings as any).burnRateSettings && typeof (rawSettings as any).burnRateSettings === 'object'
                                ? normalizeBurnRateSettings((rawSettings as any).burnRateSettings)
                                : createDefaultBurnRateSettings(),
                            },
                          };
                          setState((prev) => ({
                            ...prev,
                            plans: [...prev.plans, validatedPlan],
                            activePlanId: validatedPlan.id,
                          }));
                          if (!existingPlan) {
                            toast.success(`Plan "${finalName}" imported successfully!`);
                          }
                        } catch {
                          toast.error('Failed to import plan. Please try again.');
                        }
                      };
                      reader.readAsText(file);
                    };
                    input.click();
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {showMobilePlanSheet && (
        <div className="fixed inset-0 z-50 flex items-end sm:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowMobilePlanSheet(false)} />
          <div className="relative w-full bg-white rounded-t-2xl shadow-xl border-t border-gray-200 p-4 space-y-2">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-gray-800">Plan actions</h3>
              <button onClick={() => setShowMobilePlanSheet(false)} className="p-2 rounded-full hover:bg-gray-100 text-gray-500">✕</button>
            </div>
            <div className="max-h-60 overflow-auto space-y-1">
              <p className="text-xs font-semibold text-gray-500 px-1">Your plans</p>
              {state.plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg border ${
                    plan.id === activePlan.id ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-gray-200 bg-gray-50 text-gray-800'
                  }`}
                >
                  <button
                    className="flex-1 text-left text-sm font-medium truncate"
                    onClick={() => {
                      setActivePlan(plan.id);
                      setShowMobilePlanSheet(false);
                    }}
                  >
                    {plan.name}
                  </button>
                  <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
                    <button
                      onClick={() => {
                        const newName = prompt('Rename plan', plan.name);
                        if (newName && newName.trim()) renamePlan(plan.id, newName.trim());
                      }}
                      className="p-1 text-gray-600 hover:text-blue-700"
                      title="Rename plan"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => duplicatePlan(plan.id)}
                      className="p-1 text-gray-600 hover:text-blue-700"
                      title="Duplicate plan"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    {state.plans.length > 1 && (
                      <button
                        onClick={() => {
                          deletePlan(plan.id);
                          if (plan.id === activePlan.id) {
                            setShowMobilePlanSheet(false);
                          }
                        }}
                        className="p-1 text-red-600 hover:text-red-700"
                        title="Delete plan"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-200 pt-2 mt-2 space-y-2">
              <button
                onClick={() => { duplicatePlan(activePlan.id); setShowMobilePlanSheet(false); }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 text-sm text-gray-800"
              >
                Duplicate plan
              </button>
              <div className="border-t border-gray-100 pt-2 space-y-2">
                <button
                  onClick={() => { exportPlan(activePlan); setShowMobilePlanSheet(false); }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 text-sm text-gray-800"
                >
                  Export plan
                </button>
                <button
                  onClick={() => { handleImportPlan(); setShowMobilePlanSheet(false); }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 text-sm text-gray-800"
                >
                  Import plan
                </button>
              </div>
              <div className="border-t border-gray-100 pt-2 space-y-2">
                <button
                  onClick={() => {
                    alert('To install: tap Share, then "Add to Home Screen".');
                    setShowMobilePlanSheet(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 text-sm text-gray-800"
                >
                  Add to Home Screen
                </button>
              </div>
              <button
                onClick={() => { createPlan('New Plan'); setShowMobilePlanSheet(false); }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 text-sm text-gray-800"
              >
                New plan
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex flex-wrap gap-2 bg-white p-2 rounded-xl shadow-sm border border-gray-100">
            <button
              onClick={() => setActiveTab('expenses')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'expenses'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Runway Calculator
            </button>
            <button
              onClick={() => setActiveTab('burn')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'burn'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Flame className="w-4 h-4" />
              Burn Rate
            </button>
            {showMrrTab && (
              <button
                onClick={() => setActiveTab('mrr')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'mrr'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                MRR/ARR
              </button>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 bg-white px-3 py-2 rounded-lg shadow-sm border border-gray-100">
            <input
              type="checkbox"
              checked={showMrrTab}
              onChange={(e) =>
                updatePlan({
                  settings: {
                    ...activePlan.settings,
                    showMrrTab: e.target.checked,
                  },
                })
              }
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            Show MRR/ARR tab
          </label>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6">
          {/* Main Content Column */}
          <div className="space-y-6">
            <div className={`${activeTab === 'expenses' ? 'block' : 'hidden'}`}>
              <SummaryCards results={results!} settings={activePlan.settings} />
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => setShowVisualizations((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm font-semibold text-gray-700"
                  aria-expanded={showVisualizations}
                >
                  <span>Visualizations</span>
                  <span className="text-gray-500 text-xs">{showVisualizations ? 'Collapse' : 'Expand'}</span>
                </button>
                <div className={`${showVisualizations ? 'mt-3' : 'hidden'}`}>
                  <Charts
                    expenses={activePlan.expenses}
                    results={results!}
                    settings={activePlan.settings}
                  />
                </div>
              </div>
              <div className="mt-6">
                <CalculatorControls
                  settings={activePlan.settings}
                  onUpdateSettings={(newSettings) => updatePlan({ settings: newSettings })}
                  availableFunds={availableFunds}
                  onUpdateAvailableFunds={setAvailableFunds}
                />
              </div>
              <div className="mt-6">
                <ExpenseForm onAdd={addExpense} settings={activePlan.settings} />
              </div>
              <div className="mt-4">
                <ExpenseList
                  expenses={activePlan.expenses}
                  onUpdate={updateExpense}
                  onDelete={deleteExpense}
                  settings={activePlan.settings}
                />
              </div>
            </div>

            {showMrrTab && (
              <div className={`${activeTab === 'mrr' ? 'block' : 'hidden'}`}>
                <MRRCalculator 
                  settings={activePlan.settings} 
                  onUpdateSettings={(newSettings) => updatePlan({ settings: { ...activePlan.settings, ...newSettings } })}
                />
              </div>
            )}

            <div className={`${activeTab === 'burn' ? 'block' : 'hidden'}`}>
              <BurnRateCalculator 
                settings={activePlan.settings}
                expenses={activePlan.expenses}
                availableFunds={availableFunds}
                burnRateSettings={activePlan.settings.burnRateSettings || createDefaultBurnRateSettings()}
                onUpdateBurnSettings={handleBurnRateSettingsUpdate}
              />
            </div>
          </div>

        </div>
      </main>

      {showCompare && (
        <CompareModal
          plans={state.plans}
          settings={activePlan.settings}
          onClose={() => setShowCompare(false)}
        />
      )}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 text-center text-sm text-gray-500">
        Powered by{' '}
        <a href="https://pawsbook.pet" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 font-semibold">
          PawsMatch
        </a>
      </footer>
    </div>
  );
}

export default App;
