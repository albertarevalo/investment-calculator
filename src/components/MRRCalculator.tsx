import type { PlanSettings } from '../types';
import { useMemo, useState } from 'react';
import { TrendingUp, Users, Plus, Trash, Percent } from 'lucide-react';
import { createDefaultMrrSettings } from '../utils/storage';

interface MRRCalculatorProps {
  settings: PlanSettings;
  onUpdateSettings: (newSettings: Partial<PlanSettings>) => void;
}

interface MonthData {
  month: number;
  date: string;
  customers: number;
  mrr: number;
  arr: number;
  newCustomers: number;
  churnedCustomers: number;
  newMRR: number;
  expansionMRR: number;
  contractionMRR: number;
  churnedMRR: number;
  netNewMRR: number;
}

export function MRRCalculator({ settings, onUpdateSettings }: MRRCalculatorProps) {
  const mrrSettings = useMemo(() => settings.mrrSettings || createDefaultMrrSettings(), [settings.mrrSettings]);
  const [plans, setPlans] = useState(mrrSettings.plans);
  const [startingCustomers, setStartingCustomers] = useState<number>(mrrSettings.startingCustomers ?? 0);
  const [monthlyLeads, setMonthlyLeads] = useState<number>(mrrSettings.monthlyLeads ?? 0);
  const [trialStartRate, setTrialStartRate] = useState<number>(mrrSettings.trialStartRate ?? 30);
  const [trialToPaidRate, setTrialToPaidRate] = useState<number>(mrrSettings.trialToPaidRate ?? 20);
  const [salesCycleLag, setSalesCycleLag] = useState<number>(mrrSettings.salesCycleLag ?? 1);
  const [monthlyChurnRate, setMonthlyChurnRate] = useState<number>(mrrSettings.monthlyChurnRate ?? 5);
  const [expansionRate, setExpansionRate] = useState<number>(mrrSettings.expansionRate ?? 5);
  const [contractionRate, setContractionRate] = useState<number>(mrrSettings.contractionRate ?? 2);
  const [manualCAC, setManualCAC] = useState<number>(mrrSettings.manualCAC ?? 200);
  const [useMarketingSpend, setUseMarketingSpend] = useState<boolean>(mrrSettings.useMarketingSpend ?? false);
  const [projectionMonths, setProjectionMonths] = useState<number>(mrrSettings.projectionMonths ?? 12);

  const symbol = settings?.primaryCurrency === 'USD' ? '$' : 
                 settings?.primaryCurrency === 'EUR' ? '€' : 
                 settings?.primaryCurrency === 'GBP' ? '£' : '$';

  const updateMRRSettings = (partial: Partial<PlanSettings['mrrSettings']>) => {
    onUpdateSettings({
      mrrSettings: {
        ...mrrSettings,
        plans,
        startingCustomers,
        monthlyLeads,
        trialStartRate,
        trialToPaidRate,
        salesCycleLag,
        monthlyChurnRate,
        expansionRate,
        contractionRate,
        manualCAC,
        useMarketingSpend,
        projectionMonths,
        ...partial,
      },
    });
  };

  const normalizedPlans = useMemo(() => {
    const totalMix = plans.reduce((sum, p) => sum + (p.mix || 0), 0) || 100;
    return plans.map((p) => ({
      ...p,
      weight: (p.mix || 0) / totalMix,
      monthlyPrice: p.billing === 'annual' ? (p.price || 0) / 12 : (p.price || 0),
    }));
  }, [plans]);

  const weightedArpu = useMemo(() => {
    return normalizedPlans.reduce((sum, p) => sum + p.weight * p.monthlyPrice, 0);
  }, [normalizedPlans]);

  const addPlan = () => {
    const nextName = `Plan ${plans.length + 1}`;
    const newPlan = { id: Math.random().toString(36).slice(2), name: nextName, price: 50, billing: 'monthly' as const, mix: 0 };
    const updated = [...plans, newPlan];
    setPlans(updated);
    updateMRRSettings({ plans: updated });
  };

  const updatePlanField = (id: string, field: keyof (typeof plans)[number], value: any) => {
    const updated = plans.map((p) => (p.id === id ? { ...p, [field]: value } : p));
    setPlans(updated);
    updateMRRSettings({ plans: updated });
  };

  const deletePlan = (id: string) => {
    const updated = plans.filter((p) => p.id !== id);
    setPlans(updated);
    updateMRRSettings({ plans: updated });
  };

  // Calculate projections
  const projections = useMemo((): MonthData[] => {
    const data: MonthData[] = [];
    let currentCustomers = startingCustomers;
    let currentMRR = currentCustomers * weightedArpu;
    const queueLength = Math.max(1, salesCycleLag);
    const conversionQueue = Array.from({ length: queueLength }, () => 0);

    for (let month = 0; month <= projectionMonths; month++) {
      const date = new Date();
      date.setMonth(date.getMonth() + month);

      if (month === 0) {
        data.push({
          month,
          date: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          customers: currentCustomers,
          mrr: currentMRR,
          arr: currentMRR * 12,
          newCustomers: 0,
          churnedCustomers: 0,
          newMRR: 0,
          expansionMRR: 0,
          contractionMRR: 0,
          churnedMRR: 0,
          netNewMRR: 0,
        });
        continue;
      }

      const arrivingConversions = conversionQueue.shift() || 0;
      const newTrials = monthlyLeads * (trialStartRate / 100);
      const newConversions = newTrials * (trialToPaidRate / 100);
      conversionQueue.push(newConversions);

      const churnedCustomers = Math.round(currentCustomers * (monthlyChurnRate / 100));
      const newCustomers = Math.round(arrivingConversions);
      const churnedMRR = currentMRR * (monthlyChurnRate / 100);
      const expansionMRR = currentMRR * (expansionRate / 100);
      const contractionMRR = currentMRR * (contractionRate / 100);
      const newMRR = newCustomers * weightedArpu;
      const netNewMRR = newMRR + expansionMRR - contractionMRR - churnedMRR;

      currentCustomers = Math.max(0, currentCustomers - churnedCustomers + newCustomers);
      currentMRR = Math.max(0, currentMRR + netNewMRR);

      data.push({
        month,
        date: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        customers: currentCustomers,
        mrr: currentMRR,
        arr: currentMRR * 12,
        newCustomers,
        churnedCustomers,
        newMRR,
        expansionMRR,
        contractionMRR,
        churnedMRR,
        netNewMRR,
      });
    }

    return data;
  }, [startingCustomers, weightedArpu, salesCycleLag, monthlyLeads, trialStartRate, trialToPaidRate, monthlyChurnRate, expansionRate, contractionRate, projectionMonths]);

  const finalData = projections[projections.length - 1];
  const firstData = projections[0];
  const totalGrowth = firstData.mrr === 0 ? 0 : ((finalData.mrr - firstData.mrr) / firstData.mrr) * 100;
  const nrr = firstData.mrr === 0 ? 0 : ((firstData.mrr - projections[1]?.churnedMRR + projections[1]?.expansionMRR - projections[1]?.contractionMRR + projections[1]?.newMRR) / firstData.mrr) * 100;
  const grr = firstData.mrr === 0 ? 0 : ((firstData.mrr - projections[1]?.churnedMRR - projections[1]?.contractionMRR) / firstData.mrr) * 100;
  const cacPayback = weightedArpu > 0 ? manualCAC / weightedArpu : 0;

  const formatCurrency = (value: number) => {
    const abs = Math.abs(value);
    const base = abs >= 1_000_000 ? `${(abs / 1_000_000).toFixed(1)}M` : abs >= 1_000 ? `${(abs / 1_000).toFixed(1)}K` : abs.toFixed(0);
    return `${value < 0 ? '-' : ''}${symbol}${base}`;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          MRR/ARR Projector
        </h2>
        
        {/* Plans */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Users className="w-4 h-4" /> Plans & pricing mix
              </p>
              <p className="text-xs text-gray-500">Name, price, billing term, and % of new customers choosing this plan.</p>
            </div>
            <button
              onClick={addPlan}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" /> Add Plan
            </button>
          </div>
          <div className="space-y-3">
            {plans.map((plan) => (
              <div key={plan.id} className="grid grid-cols-1 sm:grid-cols-5 gap-3 bg-gray-50 p-3 rounded-lg">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 flex items-center gap-1">Plan name
                    <span className="inline-flex items-center justify-center w-3 h-3 text-[10px] rounded-full bg-gray-200 text-gray-600" title="What this plan is called (e.g., Starter, Pro).">?</span>
                  </label>
                  <input
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={plan.name}
                    onChange={(e) => updatePlanField(plan.id, 'name', e.target.value)}
                    placeholder="e.g., Starter"
                  />
                </div>
                <div className="relative flex flex-col gap-1">
                  <label className="text-xs text-gray-500 flex items-center gap-1">Price per billing
                    <span className="inline-flex items-center justify-center w-3 h-3 text-[10px] rounded-full bg-gray-200 text-gray-600" title="How much this plan costs per billing period.">?</span>
                  </label>
                  <span className="absolute left-3 top-9 text-gray-500">{symbol}</span>
                  <input
                    type="number"
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={plan.price}
                    onChange={(e) => updatePlanField(plan.id, 'price', parseFloat(e.target.value) || 0)}
                    placeholder="50"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 flex items-center gap-1">Billing term
                    <span className="inline-flex items-center justify-center w-3 h-3 text-[10px] rounded-full bg-gray-200 text-gray-600" title="Is this billed monthly or annually? Annual is converted to monthly MRR.">?</span>
                  </label>
                  <select
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={plan.billing}
                    onChange={(e) => updatePlanField(plan.id, 'billing', e.target.value as 'monthly' | 'annual')}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
                <div className="relative flex flex-col gap-1">
                  <label className="text-xs text-gray-500 flex items-center gap-1">Mix of new customers
                    <span className="inline-flex items-center justify-center w-3 h-3 text-[10px] rounded-full bg-gray-200 text-gray-600" title="What % of new customers pick this plan (weights ARPU). Should add up to ~100% across plans.">?</span>
                  </label>
                  <input
                    type="number"
                    className="w-full pr-10 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={plan.mix}
                    onChange={(e) => updatePlanField(plan.id, 'mix', parseFloat(e.target.value) || 0)}
                    placeholder="e.g., 60"
                  />
                  <Percent className="w-4 h-4 text-gray-400 absolute right-2 top-9" />
                </div>
                <button
                  onClick={() => deletePlan(plan.id)}
                  className="self-end px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 border border-red-100"
                  aria-label="Delete plan"
                >
                  <Trash className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Funnel & retention */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Starting Customers</label>
            <input
              type="number"
              value={startingCustomers || ''}
              onChange={(e) => {
                const val = Math.max(0, parseInt(e.target.value) || 0);
                setStartingCustomers(val);
                updateMRRSettings({ startingCustomers: val });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">Monthly Leads
              <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] rounded-full bg-gray-200 text-gray-600" title="New leads per month entering the top of your funnel.">?</span>
            </label>
            <input
              type="number"
              value={monthlyLeads || ''}
              onChange={(e) => {
                const val = Math.max(0, parseInt(e.target.value) || 0);
                setMonthlyLeads(val);
                updateMRRSettings({ monthlyLeads: val });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">Trial Start Rate (%)
              <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] rounded-full bg-gray-200 text-gray-600" title="% of leads that start a trial.">?</span>
            </label>
            <input
              type="number"
              value={trialStartRate || ''}
              onChange={(e) => {
                const val = Math.max(0, parseFloat(e.target.value) || 0);
                setTrialStartRate(val);
                updateMRRSettings({ trialStartRate: val });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">Trial → Paid Conversion (%)
              <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] rounded-full bg-gray-200 text-gray-600" title="% of trial users that convert to paid customers.">?</span>
            </label>
            <input
              type="number"
              value={trialToPaidRate || ''}
              onChange={(e) => {
                const val = Math.max(0, parseFloat(e.target.value) || 0);
                setTrialToPaidRate(val);
                updateMRRSettings({ trialToPaidRate: val });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">Sales Cycle Lag (months)
              <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] rounded-full bg-gray-200 text-gray-600" title="Delay (in months) from trial start to paid conversion.">?</span>
            </label>
            <input
              type="number"
              value={salesCycleLag || ''}
              onChange={(e) => {
                const val = Math.max(1, parseInt(e.target.value) || 1);
                setSalesCycleLag(val);
                updateMRRSettings({ salesCycleLag: val });
              }}
              min={1}
              max={12}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">Monthly Churn Rate (%)
              <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] rounded-full bg-gray-200 text-gray-600" title="% of paying customers lost each month.">?</span>
            </label>
            <input
              type="number"
              value={monthlyChurnRate || ''}
              onChange={(e) => {
                const val = Math.max(0, parseFloat(e.target.value) || 0);
                setMonthlyChurnRate(val);
                updateMRRSettings({ monthlyChurnRate: val });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">Expansion Rate (%)
              <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] rounded-full bg-gray-200 text-gray-600" title="% of existing MRR that expands each month (upsells/add seats).">?</span>
            </label>
            <input
              type="number"
              value={expansionRate || ''}
              onChange={(e) => {
                const val = Math.max(0, parseFloat(e.target.value) || 0);
                setExpansionRate(val);
                updateMRRSettings({ expansionRate: val });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">Downgrade Rate (%)
              <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] rounded-full bg-gray-200 text-gray-600" title="% of existing MRR that downgrades each month.">?</span>
            </label>
            <input
              type="number"
              value={contractionRate || ''}
              onChange={(e) => {
                const val = Math.max(0, parseFloat(e.target.value) || 0);
                setContractionRate(val);
                updateMRRSettings({ contractionRate: val });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">CAC (manual)
              <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] rounded-full bg-gray-200 text-gray-600" title="Cost to acquire one customer when using marketing spend.">?</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{symbol}</span>
              <input
                type="number"
                value={manualCAC || ''}
                onChange={(e) => {
                  const val = Math.max(0, parseFloat(e.target.value) || 0);
                  setManualCAC(val);
                  updateMRRSettings({ manualCAC: val });
                }}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">Projection Months
              <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] rounded-full bg-gray-200 text-gray-600" title="How many months to forecast forward.">?</span>
            </label>
            <input
              type="number"
              value={projectionMonths || ''}
              onChange={(e) => {
                const val = Math.min(60, Math.max(1, parseInt(e.target.value) || 12));
                setProjectionMonths(val);
                updateMRRSettings({ projectionMonths: val });
              }}
              min={1}
              max={60}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 mt-2">
            <input
              type="checkbox"
              checked={useMarketingSpend}
              onChange={(e) => {
                setUseMarketingSpend(e.target.checked);
                updateMRRSettings({ useMarketingSpend: e.target.checked });
              }}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            Use marketing spend (if provided) for CAC-driven leads
          </label>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Current MRR</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(firstData.mrr)}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Projected MRR ({projectionMonths} mo)</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(finalData.mrr)}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Projected ARR</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(finalData.arr)}</p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Total Growth</p>
            <p className="text-xl font-bold text-gray-900">{totalGrowth.toFixed(1)}%</p>
          </div>
          <div className="bg-teal-50 p-4 rounded-lg lg:col-span-2">
            <p className="text-sm text-gray-600">NRR / GRR</p>
            <p className="text-xl font-bold text-gray-900">{nrr.toFixed(1)}% / {grr.toFixed(1)}%</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">CAC Payback (months)</p>
            <p className="text-xl font-bold text-gray-900">{cacPayback ? cacPayback.toFixed(1) : '—'}</p>
          </div>
        </div>

        {/* Projection Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-medium text-gray-600">Month</th>
                <th className="text-right py-2 px-3 font-medium text-gray-600">Customers</th>
                <th className="text-right py-2 px-3 font-medium text-gray-600">New MRR</th>
                <th className="text-right py-2 px-3 font-medium text-gray-600">Expansion</th>
                <th className="text-right py-2 px-3 font-medium text-gray-600">Contraction</th>
                <th className="text-right py-2 px-3 font-medium text-gray-600">Churned</th>
                <th className="text-right py-2 px-3 font-medium text-gray-600">Net New</th>
                <th className="text-right py-2 px-3 font-medium text-gray-600">MRR</th>
                <th className="text-right py-2 px-3 font-medium text-gray-600">ARR</th>
              </tr>
            </thead>
            <tbody>
              {projections.map((data) => (
                <tr key={data.month} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="py-2 px-3 text-gray-900">{data.month === 0 ? 'Now' : data.date}</td>
                  <td className="text-right py-2 px-3 text-gray-700">{data.customers.toLocaleString()}</td>
                  <td className="text-right py-2 px-3 text-green-600">{data.month === 0 ? '-' : formatCurrency(data.newMRR)}</td>
                  <td className="text-right py-2 px-3 text-green-600">{data.month === 0 ? '-' : formatCurrency(data.expansionMRR)}</td>
                  <td className="text-right py-2 px-3 text-amber-600">{data.month === 0 ? '-' : formatCurrency(data.contractionMRR)}</td>
                  <td className="text-right py-2 px-3 text-red-500">{data.month === 0 ? '-' : formatCurrency(data.churnedMRR)}</td>
                  <td className="text-right py-2 px-3 font-medium text-gray-900">{data.month === 0 ? '-' : formatCurrency(data.netNewMRR)}</td>
                  <td className="text-right py-2 px-3 font-medium text-gray-900">{formatCurrency(data.mrr)}</td>
                  <td className="text-right py-2 px-3 font-medium text-purple-600">{formatCurrency(data.arr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
