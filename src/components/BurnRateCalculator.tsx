import type { PlanSettings, Expense, BurnRateSettings, RevenueStream } from '../types';
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Flame, DollarSign, Calendar, AlertTriangle, TrendingDown, Clock, Plus, Trash2, Pencil } from 'lucide-react';
import { getCurrencySymbol } from '../hooks/useExchangeRates';
import { sanitizeMoneyInput, parseMoneyInput } from '../utils/money';
import { generateId } from '../utils/storage';

interface BurnRateCalculatorProps {
  settings: PlanSettings;
  expenses: Expense[];
  availableFunds: number;
  burnRateSettings: BurnRateSettings;
  onUpdateBurnSettings: (updater: (prev: BurnRateSettings) => BurnRateSettings) => void;
}

interface MonthData {
  month: number;
  date: string;
  startingCash: number;
  monthlyRevenue: number;
  monthlyBurn: number;
  endingCash: number;
  runwayMonths: number;
  status: 'healthy' | 'warning' | 'critical';
  milestoneMultiple?: number;
}

export function BurnRateCalculator({
  settings,
  expenses,
  availableFunds,
  burnRateSettings,
  onUpdateBurnSettings,
}: BurnRateCalculatorProps) {
  const symbol = getCurrencySymbol(settings?.primaryCurrency || 'USD');
  const burnSettings = burnRateSettings;
  const [newStreamName, setNewStreamName] = useState('');
  const [newStreamAmount, setNewStreamAmount] = useState('');
  const [newStreamFrequency, setNewStreamFrequency] = useState<'monthly' | 'yearly'>('monthly');
  const [newStreamStartMonth, setNewStreamStartMonth] = useState('0');
  const [newStreamGrowthRate, setNewStreamGrowthRate] = useState('0');
  const [showFullRoi, setShowFullRoi] = useState(false);
  const prevShowFullRoi = useRef(false);
  const [editingStreamId, setEditingStreamId] = useState<string | null>(null);
  const [streamDraft, setStreamDraft] = useState<Partial<RevenueStream> | null>(null);

  const monthOptions = useMemo(() => {
    const now = new Date();
    const opts: { label: string; value: number }[] = [];
    for (let i = 0; i < 24; i++) {
      const d = new Date(now);
      d.setMonth(now.getMonth() + i);
      opts.push({ label: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), value: i });
    }
    return opts;
  }, []);

  // Calculate monthly expenses from existing expense data
  const monthlyExpenseAt = useCallback((monthIndex: number) => {
    return expenses.reduce((sum, expense) => {
      const startsAt = typeof expense.startMonth === 'number' ? expense.startMonth : 0;
      if (monthIndex < startsAt) return sum;
      if (expense.type === 'recurring') {
        const monthlyAmount = expense.frequency === 'yearly' ? expense.amount / 12 : expense.amount;
        return sum + monthlyAmount;
      }
      return sum;
    }, 0);
  }, [expenses]);

  const oneTimeExpenseAt = useCallback((monthIndex: number) => {
    return expenses.reduce((sum, expense) => {
      const startsAt = typeof expense.startMonth === 'number' ? expense.startMonth : 0;
      if (expense.type === 'one-time' && monthIndex === startsAt) {
        return sum + expense.amount;
      }
      return sum;
    }, 0);
  }, [expenses]);

  const calculatedMonthlyExpenses = useMemo(() => monthlyExpenseAt(0), [monthlyExpenseAt]);

  const monthlyRevenueAt = useCallback((monthIndex: number) => {
    return burnSettings.revenueStreams.reduce((sum, stream) => {
      const startsAt = typeof stream.startMonth === 'number' ? stream.startMonth : 0;
      if (monthIndex < startsAt) return sum;
      const baseMonthly = stream.frequency === 'yearly' ? stream.amount / 12 : stream.amount;
      const growthRate = typeof stream.growthRate === 'number' ? stream.growthRate : 0;
      const monthsElapsed = monthIndex - startsAt;
      const grown = baseMonthly * Math.pow(1 + growthRate / 100, monthsElapsed);
      return sum + Math.max(grown, 0);
    }, 0);
  }, [burnSettings.revenueStreams]);

  const totalMonthlyRevenue = useMemo(() => monthlyRevenueAt(0), [monthlyRevenueAt]);

  const netBurn = calculatedMonthlyExpenses - totalMonthlyRevenue;
  const isProfitable = netBurn <= 0;

  useEffect(() => {
    if (Number.isFinite(availableFunds) && availableFunds !== burnSettings.startingCash) {
      onUpdateBurnSettings((prev) => ({ ...prev, startingCash: availableFunds }));
    }
  }, [availableFunds, burnSettings.startingCash, onUpdateBurnSettings]);

  const handleProjectionChange = (value: number) => {
    const clamped = Math.min(60, Math.max(1, value));
    onUpdateBurnSettings((prev) => ({ ...prev, projectionMonths: clamped }));
  };

  const handleAddStream = (e: React.FormEvent) => {
    e.preventDefault();
    const amountValue = parseMoneyInput(newStreamAmount);
    const startMonthValue = Math.max(0, parseInt(newStreamStartMonth || '0', 10) || 0);
    const growthValue = Math.max(0, parseFloat(newStreamGrowthRate || '0'));
    if (!newStreamName.trim() || amountValue <= 0) return;

    onUpdateBurnSettings((prev) => ({
      ...prev,
      revenueStreams: [
        ...prev.revenueStreams,
        {
          id: generateId(),
          name: newStreamName.trim(),
          amount: amountValue,
          frequency: newStreamFrequency,
          currency: settings.primaryCurrency,
          startMonth: startMonthValue,
          growthRate: growthValue,
        },
      ],
    }));

    setNewStreamName('');
    setNewStreamAmount('');
    setNewStreamFrequency('monthly');
    setNewStreamStartMonth('0');
    setNewStreamGrowthRate('0');
  };

  const handleStreamChange = (id: string, updates: Partial<RevenueStream>) => {
    onUpdateBurnSettings((prev) => ({
      ...prev,
      revenueStreams: prev.revenueStreams.map((stream) =>
        stream.id === id ? { ...stream, ...updates } : stream
      ),
    }));
  };

  const startEditingStream = (stream: RevenueStream) => {
    setEditingStreamId(stream.id);
    setStreamDraft({
      ...stream,
      startMonth: stream.startMonth ?? 0,
      growthRate: stream.growthRate ?? 0,
    });
  };

  const cancelEditingStream = () => {
    setEditingStreamId(null);
    setStreamDraft(null);
  };

  const saveEditingStream = (id: string) => {
    if (!streamDraft) return;
    handleStreamChange(id, {
      name: streamDraft.name,
      amount: typeof streamDraft.amount === 'number' ? streamDraft.amount : 0,
      frequency: (streamDraft.frequency as 'monthly' | 'yearly') ?? 'monthly',
      startMonth: typeof streamDraft.startMonth === 'number' ? streamDraft.startMonth : 0,
      growthRate: typeof streamDraft.growthRate === 'number' ? streamDraft.growthRate : 0,
    });
    setEditingStreamId(null);
    setStreamDraft(null);
  };

  const handleDeleteStream = (id: string) => {
    onUpdateBurnSettings((prev) => ({
      ...prev,
      revenueStreams: prev.revenueStreams.filter((stream) => stream.id !== id),
    }));
  };

  const formatInputValue = (value: number) => {
    if (!value) return '0';
    return value.toLocaleString('en-US');
  };

  const updateStreamDraft = (updates: Partial<RevenueStream>) => {
    setStreamDraft((prev) => (prev ? { ...prev, ...updates } : prev));
  };

  // Calculate projections
  const projections = useMemo((): MonthData[] => {
    const data: MonthData[] = [];
    let currentCash = burnSettings.startingCash;
    const baseMonths = Math.max(1, burnSettings.projectionMonths);
    const months = showFullRoi ? 600 : baseMonths;
    const initialCash = burnSettings.startingCash;
    let cumulativeNet = 0;
    let nextRevenueMultiple = 1;
    const maxMultiple = 100;

    for (let month = 0; month <= months; month++) {
      const date = new Date();
      date.setMonth(date.getMonth() + month);

      const monthlyRevenue = monthlyRevenueAt(month);
      const expenseThisMonth = monthlyExpenseAt(month) + oneTimeExpenseAt(month);
      const thisMonthNetBurn = expenseThisMonth - monthlyRevenue;
      const runwayMonths = thisMonthNetBurn <= 0 ? Infinity : currentCash / thisMonthNetBurn;
      let status: 'healthy' | 'warning' | 'critical';
      
      if (thisMonthNetBurn <= 0 || runwayMonths > 12) {
        status = 'healthy';
      } else if (runwayMonths > 6) {
        status = 'warning';
      } else {
        status = 'critical';
      }

      let milestoneMultiple: number | undefined;
      if (initialCash > 0 && nextRevenueMultiple <= maxMultiple) {
        const netThisMonth = monthlyRevenue - expenseThisMonth;
        const before = cumulativeNet;
        const after = cumulativeNet + netThisMonth;
        if (before < initialCash * nextRevenueMultiple && after >= initialCash * nextRevenueMultiple) {
          milestoneMultiple = nextRevenueMultiple;
          nextRevenueMultiple += 1;
          while (nextRevenueMultiple <= maxMultiple && after >= initialCash * nextRevenueMultiple) {
            milestoneMultiple = nextRevenueMultiple;
            nextRevenueMultiple += 1;
          }
        }
        cumulativeNet = after;
      }

      data.push({
        month,
        date: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        startingCash: currentCash,
        monthlyRevenue,
        monthlyBurn: month === 0 ? 0 : thisMonthNetBurn,
        endingCash: currentCash - (month === 0 ? 0 : thisMonthNetBurn),
        runwayMonths,
        status,
        milestoneMultiple,
      });

      if (month > 0) {
        currentCash -= thisMonthNetBurn;
      }
      
      // Stop if we run out of cash
      if (currentCash < 0) break;
      if (!showFullRoi && month >= baseMonths) break;
      if (showFullRoi && milestoneMultiple === maxMultiple) break;
    }

    return data;
  }, [burnSettings.startingCash, burnSettings.projectionMonths, calculatedMonthlyExpenses, monthlyExpenseAt, oneTimeExpenseAt, monthlyRevenueAt, showFullRoi]);

  const roiTargetMonth = useMemo(() => {
    const hit = projections.find((p) => p.milestoneMultiple === 100);
    return hit ? hit.month : null;
  }, [projections]);

  useEffect(() => {
    if (showFullRoi && roiTargetMonth !== null && roiTargetMonth !== burnSettings.projectionMonths) {
      onUpdateBurnSettings((prev) => ({ ...prev, projectionMonths: roiTargetMonth }));
    }
    if (!showFullRoi && prevShowFullRoi.current && burnSettings.projectionMonths !== 12) {
      onUpdateBurnSettings((prev) => ({ ...prev, projectionMonths: 12 }));
    }
    prevShowFullRoi.current = showFullRoi;
  }, [showFullRoi, roiTargetMonth, burnSettings.projectionMonths, onUpdateBurnSettings]);

  const formatCurrency = (value: number) => {
    if (value === Infinity) return '∞';
    const absValue = Math.abs(value);
    const formatted = absValue >= 1000000
      ? `${(absValue / 1000000).toFixed(1)}M`
      : absValue >= 1000
        ? `${(absValue / 1000).toFixed(1)}K`
        : absValue.toFixed(0);
    const sign = value < 0 ? '-' : '';
    return `${sign}${symbol}${formatted}`;
  };

  const formatRunway = (months: number) => {
    if (months === Infinity) return '∞';
    const yrs = Math.floor(months / 12);
    const mos = Math.floor(months % 12);
    if (yrs <= 0) return `${mos} mo`;
    return mos > 0 ? `${yrs} yr${yrs > 1 ? 's' : ''} ${mos} mo` : `${yrs} yr${yrs > 1 ? 's' : ''}`;
  };
  const burnMultiple = totalMonthlyRevenue <= 0 ? null : calculatedMonthlyExpenses / totalMonthlyRevenue;

  const projectedRunwayMonths = useMemo(() => {
    if (!projections.length) return 0;
    const firstBelowZero = projections.find((p) => p.endingCash < 0);
    const firstNonPositiveBurnIdx = projections.findIndex((p) => p.monthlyBurn <= 0 && p.month > 0);
    if (firstNonPositiveBurnIdx >= 0) {
      const allNonPositiveAfter = projections.slice(firstNonPositiveBurnIdx).every((p) => p.monthlyBurn <= 0);
      if (allNonPositiveAfter) {
        return Infinity;
      }
    }
    const lastNonNegative = projections
      .filter((p) => p.endingCash >= 0)
      .sort((a, b) => b.month - a.month)[0];
    if (firstBelowZero) {
      return Math.max(0, firstBelowZero.month);
    }
    return lastNonNegative ? lastNonNegative.month : 0;
  }, [projections]);

  const cashOutDate = useMemo(() => {
    if (isProfitable) return null;
    const date = new Date();
    date.setMonth(date.getMonth() + Math.floor(projectedRunwayMonths));
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [isProfitable, projectedRunwayMonths]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-600" />
          Burn Rate Analyzer
        </h2>
        
        {/* Input Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <DollarSign className="w-4 h-4 inline mr-1" />
              Starting Cash
            </label>
            <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
              {symbol}
              {formatInputValue(burnSettings.startingCash)}
              <p className="text-xs text-gray-500 mt-1">Auto-synced from Available Funds</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Flame className="w-4 h-4 inline mr-1" />
              Monthly Expenses
            </label>
            <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
              {symbol}
              {calculatedMonthlyExpenses.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              <p className="text-xs text-gray-500 mt-1">Auto-synced from Runway expenses</p>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-3 mb-2 whitespace-nowrap">
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>Projection Months</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-blue-800 bg-blue-50 border border-blue-100 px-2 py-1 rounded-lg shadow-sm cursor-pointer" title="Shows timeline until 100xVC net payback (see 100xvc.io)">
                <input
                  type="checkbox"
                  checked={showFullRoi}
                  onChange={(e) => setShowFullRoi(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="whitespace-nowrap">Show when to get 100xVC</span>
              </label>
            </div>
            <div className="relative">
              <input
                type="number"
                value={burnSettings.projectionMonths}
                onChange={(e) => handleProjectionChange(parseInt(e.target.value) || 1)}
                min={1}
                max={showFullRoi ? 600 : 60}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">100xVC milestones use net payback vs initial capital (see <a href="https://100xvc.io/" className="text-blue-600 underline" target="_blank" rel="noreferrer">100xVC</a>).</p>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-blue-600" />
                Revenue Streams
              </h3>
              <p className="text-sm text-gray-500">Add projected recurring revenue sources</p>
            </div>
            <div className="text-sm text-gray-700 font-medium">
              Total Monthly Revenue: {symbol}
              {totalMonthlyRevenue.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>

          <form onSubmit={handleAddStream} className="grid grid-cols-1 md:grid-cols-[2fr,1fr,auto,auto,auto,auto] gap-3 p-4 border border-gray-200 rounded-xl bg-gray-50">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
              <input
                type="text"
                value={newStreamName}
                onChange={(e) => setNewStreamName(e.target.value)}
                placeholder="e.g., Ads Revenue"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{symbol}</span>
                <input
                  type="text"
                  value={newStreamAmount}
                  onChange={(e) => setNewStreamAmount(sanitizeMoneyInput(e.target.value))}
                  placeholder="Amount"
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start Month</label>
              <select
                value={newStreamStartMonth}
                onChange={(e) => setNewStreamStartMonth(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="Start month"
              >
                {monthOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Frequency</label>
              <select
                value={newStreamFrequency}
                onChange={(e) => setNewStreamFrequency(e.target.value as 'monthly' | 'yearly')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">MoM Growth %</label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  value={newStreamGrowthRate}
                  onChange={(e) => setNewStreamGrowthRate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
              </div>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="inline-flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 w-full justify-center"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </form>

          {burnSettings.revenueStreams.length > 0 ? (
            <div className="mt-4 space-y-3">
              {burnSettings.revenueStreams.map((stream) => (
                <div key={stream.id} className="p-4 border border-gray-200 rounded-xl bg-white">
                  {editingStreamId === stream.id && streamDraft ? (
                    <div className="grid grid-cols-1 md:grid-cols-[1.5fr,1fr,auto,auto,auto,auto] md:items-center gap-3">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={streamDraft.name ?? ''}
                          onChange={(e) => updateStreamDraft({ name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex-1 relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{symbol}</span>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={streamDraft.amount ?? 0}
                          onChange={(e) => updateStreamDraft({ amount: parseMoneyInput(e.target.value) })}
                          className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <select
                        value={(streamDraft.frequency as 'monthly' | 'yearly') ?? 'monthly'}
                        onChange={(e) => updateStreamDraft({ frequency: e.target.value as 'monthly' | 'yearly' })}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                      <div className="relative">
                        <input
                          type="number"
                          min={0}
                          step="0.1"
                          value={(streamDraft.growthRate ?? 0).toString()}
                          onChange={(e) => updateStreamDraft({ growthRate: Math.max(0, parseFloat(e.target.value || '0')) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                      </div>
                      <select
                        value={(streamDraft.startMonth ?? 0).toString()}
                        onChange={(e) => updateStreamDraft({ startMonth: Math.max(0, parseInt(e.target.value || '0', 10) || 0) })}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        title="Start month"
                      >
                        {monthOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => saveEditingStream(stream.id)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditingStream}
                          className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{stream.name}</p>
                        <p className="text-xs text-gray-500">Starts {monthOptions.find((m) => m.value === (stream.startMonth ?? 0))?.label || 'Now'} · {stream.frequency === 'yearly' ? 'Yearly' : 'Monthly'} · Growth {stream.growthRate ?? 0}%</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{formatCurrency(stream.amount)}</span>
                        <button
                          type="button"
                          onClick={() => startEditingStream(stream)}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStream(stream.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-500">No revenue streams yet. Add your first projection above.</p>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl shadow-sm">
            <p className="text-sm font-semibold text-blue-800 flex items-center gap-2">
              <Flame className="w-4 h-4" /> Net Monthly Burn
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(netBurn)}</p>
            <p className="text-xs text-blue-900/70 mt-1">
              {isProfitable
                ? 'Profitable! Revenue exceeds expenses'
                : `${formatCurrency(totalMonthlyRevenue)} revenue vs ${formatCurrency(calculatedMonthlyExpenses)} expenses`}
            </p>
          </div>
          <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl shadow-sm">
            <p className="text-sm font-semibold text-purple-800 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Current Runway
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{isProfitable ? '∞' : formatRunway(projectedRunwayMonths)}</p>
            <p className="text-xs text-purple-900/70 mt-1">
              {isProfitable ? 'No cash out date' : `Until ${cashOutDate}`}
            </p>
          </div>
          <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl shadow-sm">
            <p className="text-sm font-semibold text-orange-800 flex items-center gap-2">
              <TrendingDown className="w-4 h-4" /> Burn Multiple
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{burnMultiple && !isProfitable ? `${burnMultiple.toFixed(2)}x` : 'N/A'}</p>
            <p className="text-xs text-orange-900/70 mt-1">Expenses / Revenue</p>
          </div>
          <div className={`${projectedRunwayMonths > 12 || isProfitable ? 'bg-green-50 border border-green-100' : projectedRunwayMonths > 6 ? 'bg-yellow-50 border border-yellow-100' : 'bg-red-50 border border-red-100'} p-4 rounded-xl shadow-sm`}>
            <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">Status</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${isProfitable || projectedRunwayMonths > 12 ? 'bg-green-100 text-green-800' : projectedRunwayMonths > 6 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                {isProfitable ? 'Healthy' : projectedRunwayMonths > 12 ? 'Healthy' : projectedRunwayMonths > 6 ? 'Warning' : 'Critical'}
                {isProfitable ? <Clock className="w-4 h-4" /> : <AlertTriangle className={`w-4 h-4 ${projectedRunwayMonths > 6 ? 'text-yellow-600' : 'text-red-600'}`} />}
              </span>
              <span className="text-sm text-gray-700">{isProfitable ? 'Generating profit' : projectedRunwayMonths > 12 ? '12+ months runway' : projectedRunwayMonths > 6 ? '6-12 months runway' : 'Less than 6 months'}</span>
            </div>
          </div>
        </div>

        {/* Projection Table */}
        <div className="overflow-x-auto">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2 px-1">
            <span className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-500"></span>Revenue</span>
              <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-400"></span>Expenses</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">Healthy</span>
              <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 font-medium">Warning</span>
              <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 font-medium">Critical</span>
            </span>
          </div>
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-white shadow-sm">
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-semibold text-gray-700">Month</th>
                <th className="text-right py-2 px-3 font-semibold text-gray-700">Starting Cash</th>
                <th className="text-right py-2 px-3 font-semibold text-gray-700">Revenue</th>
                <th className="text-right py-2 px-3 font-semibold text-gray-700">Expenses</th>
                <th className="text-right py-2 px-3 font-semibold text-gray-700">Net Burn</th>
                <th className="text-right py-2 px-3 font-semibold text-gray-700">Ending Cash</th>
                <th className="text-right py-2 px-3 font-semibold text-gray-700">Runway</th>
              </tr>
            </thead>
            <tbody>
              {projections.map((data) => {
                const isZeroCross = data.endingCash <= 0;
                const netBurnPositive = data.monthlyBurn > 0;
                const hasMilestone = typeof data.milestoneMultiple === 'number';
                return (
                  <tr
                    key={data.month}
                    className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 ${
                      isZeroCross
                        ? 'bg-red-100/70'
                        : hasMilestone
                          ? 'bg-emerald-50'
                          : data.status === 'critical'
                            ? 'bg-red-50'
                            : data.status === 'warning'
                              ? 'bg-yellow-50'
                              : ''
                    }`}
                  >
                    <td className="py-2 px-3 text-gray-900 font-medium flex items-center gap-2">
                      <span>{data.month === 0 ? 'Now' : data.date}</span>
                      {hasMilestone && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {data.milestoneMultiple}x
                        </span>
                      )}
                    </td>
                    <td className="text-right py-2 px-3 text-gray-700">{formatCurrency(data.startingCash)}</td>
                    <td className="text-right py-2 px-3 text-green-600 font-medium">{formatCurrency(data.monthlyRevenue)}</td>
                    <td className="text-right py-2 px-3 text-red-500 font-medium">{formatCurrency(calculatedMonthlyExpenses)}</td>
                    <td className={`text-right py-2 px-3 font-semibold ${netBurnPositive ? 'text-red-600' : 'text-green-600'}`}>
                      {data.month === 0 ? '-' : formatCurrency(data.monthlyBurn)}
                    </td>
                    <td className={`text-right py-2 px-3 font-semibold ${data.endingCash < 0 ? 'text-red-700' : 'text-gray-900'}`}>
                      {formatCurrency(data.endingCash)}
                    </td>
                    <td className="text-right py-2 px-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                        data.status === 'healthy' ? 'bg-green-100 text-green-800' :
                        data.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {formatRunway(data.runwayMonths)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
