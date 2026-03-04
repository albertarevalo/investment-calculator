import { useState, useCallback, useMemo, useEffect } from 'react';
import type { AppState, Expense, Plan } from './types';
import { loadState, saveState, createDefaultPlan, generateId } from './utils/storage';
import { calculateResults } from './utils/calculator';
import { ExpenseList } from './components/ExpenseList';
import { ExpenseForm } from './components/ExpenseForm';
import { SummaryCards } from './components/SummaryCards';
import { CalculatorControls } from './components/CalculatorControls';
import { Charts } from './components/Charts';
import { PlanManager } from './components/PlanManager';
import { CompareModal } from './components/CompareModal';
import { PieChart, LayoutDashboard } from 'lucide-react';
import { useToast, ToastContainer, toast } from './hooks/useToast.tsx';

function App() {
  const [state, setState] = useState<AppState>(loadState);
  const [availableFunds, setAvailableFunds] = useState<number>(0);
  const [showCompare, setShowCompare] = useState(false);
  const [activeTab, setActiveTab] = useState<'expenses' | 'charts'>('expenses');
  const { toasts, removeToast } = useToast();

  useEffect(() => {
    saveState(state);
  }, [state]);

  const activePlan = useMemo(() => {
    return state.plans.find((p) => p.id === state.activePlanId) || state.plans[0];
  }, [state.plans, state.activePlanId]);

  const results = useMemo(() => {
    if (!activePlan) return null;
    return calculateResults(activePlan.expenses, activePlan.settings, availableFunds);
  }, [activePlan, availableFunds]);

  const updatePlan = useCallback((updates: Partial<Plan>) => {
    setState((prev) => ({
      ...prev,
      plans: prev.plans.map((p) =>
        p.id === prev.activePlanId ? { ...p, ...updates } : p
      ),
    }));
  }, []);

  const addExpense = useCallback((expense: Omit<Expense, 'id'>) => {
    const newExpense: Expense = { ...expense, id: generateId() };
    updatePlan({
      expenses: [...(activePlan?.expenses || []), newExpense],
    });
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

  if (!activePlan || !results) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="https://nbsxlhidzrtafcgvzkvf.supabase.co/storage/v1/object/public/pawsmatch-bucket/images/logo.png" alt="PawsMatch" className="w-10 h-10 object-contain" />
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">PawsMatch Investment Calculator</h1>
            </div>
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
            />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <SummaryCards results={results} settings={activePlan.settings} />

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <CalculatorControls
              settings={activePlan.settings}
              onUpdateSettings={(newSettings: import('./types').PlanSettings) => updatePlan({ settings: newSettings })}
              availableFunds={availableFunds}
              onUpdateAvailableFunds={setAvailableFunds}
              onExportPlan={() => {
                try {
                  if (!activePlan) {
                    toast.error('No active plan to export');
                    return;
                  }
                  const dataStr = JSON.stringify(activePlan, null, 2);
                  const dataBlob = new Blob([dataStr], { type: 'application/json' });
                  const url = URL.createObjectURL(dataBlob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `${activePlan.name.replace(/\s+/g, '_').toLowerCase()}_plan.json`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);
                  toast.success(`Plan "${activePlan.name}" exported successfully!`);
                } catch {
                  toast.error('Failed to export plan. Please try again.');
                }
              }}
              onImportPlan={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json,application/json';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (!file) return;
                  
                  // Validate file size (max 5MB)
                  if (file.size > 5 * 1024 * 1024) {
                    toast.error('File too large. Maximum size is 5MB.');
                    return;
                  }
                  
                  // Validate file extension
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
                      
                      // Validate plan structure
                      if (!importedPlan || typeof importedPlan !== 'object') {
                        toast.error('Invalid plan file format.');
                        return;
                      }
                      
                      const plan = importedPlan as Record<string, unknown>;
                      
                      // Check required fields
                      if (!plan.name || typeof plan.name !== 'string' || plan.name.trim() === '') {
                        toast.error('Invalid plan: missing or empty name.');
                        return;
                      }
                      
                      if (!plan.expenses || !Array.isArray(plan.expenses)) {
                        toast.error('Invalid plan: expenses must be an array.');
                        return;
                      }
                      
                      if (!plan.settings || typeof plan.settings !== 'object') {
                        toast.error('Invalid plan: missing settings.');
                        return;
                      }
                      
                      const settings = plan.settings as Record<string, unknown>;
                      const requiredSettings = ['targetRunwayMonths', 'bufferMonths', 'bufferPercentage', 'primaryCurrency'];
                      for (const key of requiredSettings) {
                        if (!(key in settings)) {
                          toast.error(`Invalid plan: missing required setting "${key}".`);
                          return;
                        }
                      }
                      
                      // Check for duplicate name
                      const existingPlan = state.plans.find(p => 
                        p.name.toLowerCase() === plan.name!.toString().toLowerCase()
                      );
                      
                      let finalName = plan.name as string;
                      if (existingPlan) {
                        const timestamp = new Date().toLocaleDateString();
                        finalName = `${plan.name} (Imported ${timestamp})`;
                        toast.warning(`Plan renamed to "${finalName}" to avoid duplicates.`);
                      }
                      
                      // Create validated plan
                      const validatedPlan: Plan = {
                        id: generateId(),
                        name: finalName.trim(),
                        createdAt: new Date().toISOString(),
                        expenses: (plan.expenses as Array<Record<string, unknown>>).map(e => ({
                          id: typeof e.id === 'string' ? e.id : generateId(),
                          name: typeof e.name === 'string' ? e.name : 'Unnamed Expense',
                          amount: typeof e.amount === 'number' ? e.amount : 0,
                          type: e.type === 'recurring' ? 'recurring' : 'one-time',
                          frequency: e.frequency === 'yearly' ? 'yearly' : 'monthly',
                        })),
                        settings: {
                          targetRunwayMonths: Number(settings.targetRunwayMonths) || 12,
                          bufferMonths: Number(settings.bufferMonths) || 3,
                          bufferPercentage: Number(settings.bufferPercentage) || 20,
                          primaryCurrency: String(settings.primaryCurrency || 'USD'),
                          secondaryCurrency: String(settings.secondaryCurrency || 'EUR'),
                          showSecondaryCurrency: Boolean(settings.showSecondaryCurrency),
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
                      toast.error('Unexpected error importing plan. Please try again.');
                    }
                  };
                  
                  reader.readAsText(file);
                };
                input.click();
              }}
            />
            
            <div className="lg:hidden">
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setActiveTab('expenses')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-colors ${
                    activeTab === 'expenses'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Expenses
                </button>
                <button
                  onClick={() => setActiveTab('charts')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-colors ${
                    activeTab === 'charts'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <PieChart className="w-4 h-4" />
                  Charts
                </button>
              </div>
            </div>

            <div className={`${activeTab === 'expenses' ? 'block' : 'hidden lg:block'}`}>
              <ExpenseForm onAdd={addExpense} settings={activePlan.settings} />
              <div className="mt-4">
                <ExpenseList
                  expenses={activePlan.expenses}
                  onUpdate={updateExpense}
                  onDelete={deleteExpense}
                  settings={activePlan.settings}
                />
              </div>
            </div>

            <div className={`lg:hidden ${activeTab === 'charts' ? 'block' : 'hidden'}`}>
              <Charts
                expenses={activePlan.expenses}
                results={results}
                settings={activePlan.settings}
              />
            </div>
          </div>

          <div className="hidden lg:block space-y-6">
            <Charts
              expenses={activePlan.expenses}
              results={results}
              settings={activePlan.settings}
            />
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
    </div>
  );
}

export default App;
