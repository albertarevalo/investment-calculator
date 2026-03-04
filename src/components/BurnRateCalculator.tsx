import type { PlanSettings, Expense, BurnRateSettings, RevenueStream } from '../types';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { Flame, DollarSign, Calendar, AlertTriangle, TrendingDown, Clock, Plus, Trash2 } from 'lucide-react';
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
  const calculatedMonthlyExpenses = useMemo(() => {
    let monthlyTotal = 0;
    expenses.forEach(expense => {
      if (expense.type === 'recurring') {
        if (expense.frequency === 'monthly') {
          monthlyTotal += expense.amount;
        } else if (expense.frequency === 'yearly') {
          monthlyTotal += expense.amount / 12;
        }
      }
    });
    return monthlyTotal;
  }, [expenses]);

  const monthlyRevenueAt = useCallback((monthIndex: number) => {
    return burnSettings.revenueStreams.reduce((sum, stream) => {
      const startsAt = typeof stream.startMonth === 'number' ? stream.startMonth : 0;
      if (monthIndex < startsAt) return sum;
      const monthlyAmount = stream.frequency === 'yearly' ? stream.amount / 12 : stream.amount;
      return sum + monthlyAmount;
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

  const handleStartingCashChange = (value: string) => {
    const parsed = parseMoneyInput(value);
    onUpdateBurnSettings((prev) => ({ ...prev, startingCash: parsed }));
  };

  const handleProjectionChange = (value: number) => {
    const clamped = Math.min(60, Math.max(1, value));
    onUpdateBurnSettings((prev) => ({ ...prev, projectionMonths: clamped }));
  };

  const handleAddStream = (e: React.FormEvent) => {
    e.preventDefault();
    const amountValue = parseMoneyInput(newStreamAmount);
    const startMonthValue = Math.max(0, parseInt(newStreamStartMonth || '0', 10) || 0);
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
        },
      ],
    }));

    setNewStreamName('');
    setNewStreamAmount('');
    setNewStreamFrequency('monthly');
    setNewStreamStartMonth('0');
  };

  const handleStreamChange = (id: string, updates: Partial<RevenueStream>) => {
    onUpdateBurnSettings((prev) => ({
      ...prev,
      revenueStreams: prev.revenueStreams.map((stream) =>
        stream.id === id ? { ...stream, ...updates } : stream
      ),
    }));
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

  // Calculate projections
  const projections = useMemo((): MonthData[] => {
    const data: MonthData[] = [];
    let currentCash = burnSettings.startingCash;
    const months = Math.max(1, burnSettings.projectionMonths);

    for (let month = 0; month <= months; month++) {
      const date = new Date();
      date.setMonth(date.getMonth() + month);

      const monthlyRevenue = monthlyRevenueAt(month);
      const thisMonthNetBurn = calculatedMonthlyExpenses - monthlyRevenue;
      const runwayMonths = thisMonthNetBurn <= 0 ? Infinity : currentCash / thisMonthNetBurn;
      let status: 'healthy' | 'warning' | 'critical';
      
      if (thisMonthNetBurn <= 0 || runwayMonths > 12) {
        status = 'healthy';
      } else if (runwayMonths > 6) {
        status = 'warning';
      } else {
        status = 'critical';
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
      });

      if (month > 0) {
        currentCash -= thisMonthNetBurn;
      }
      
      // Stop if we run out of cash
      if (currentCash < 0) break;
    }

    return data;
  }, [burnSettings.startingCash, burnSettings.projectionMonths, calculatedMonthlyExpenses, monthlyRevenueAt]);

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
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{symbol}</span>
              <input
                type="text"
                value={formatInputValue(burnSettings.startingCash)}
                onChange={(e) => handleStartingCashChange(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Projection Months
            </label>
            <div className="relative">
              <input
                type="number"
                value={burnSettings.projectionMonths}
                onChange={(e) => handleProjectionChange(parseInt(e.target.value) || 1)}
                min={1}
                max={60}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
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

          <form onSubmit={handleAddStream} className="grid grid-cols-1 md:grid-cols-[2fr,1fr,auto,auto,auto] gap-3 p-4 border border-gray-200 rounded-xl bg-gray-50">
            <input
              type="text"
              value={newStreamName}
              onChange={(e) => setNewStreamName(e.target.value)}
              placeholder="e.g., Ads Revenue"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
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
            <select
              value={newStreamStartMonth}
              onChange={(e) => setNewStreamStartMonth(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Start month"
            >
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              value={newStreamFrequency}
              onChange={(e) => setNewStreamFrequency(e.target.value as 'monthly' | 'yearly')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
            <button
              type="submit"
              className="inline-flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </form>

          {burnSettings.revenueStreams.length > 0 ? (
            <div className="mt-4 space-y-3">
              {burnSettings.revenueStreams.map((stream) => (
                <div key={stream.id} className="flex flex-col md:flex-row md:items-center gap-3 p-4 border border-gray-200 rounded-xl">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={stream.name}
                      onChange={(e) => handleStreamChange(stream.id, { name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{symbol}</span>
                    <input
                      type="text"
                      value={formatInputValue(stream.amount)}
                      onChange={(e) => {
                        const parsed = parseMoneyInput(e.target.value);
                        handleStreamChange(stream.id, { amount: parsed });
                      }}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <select
                    value={stream.frequency}
                    onChange={(e) => handleStreamChange(stream.id, { frequency: e.target.value as 'monthly' | 'yearly' })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                  <select
                    value={(stream.startMonth ?? 0).toString()}
                    onChange={(e) => handleStreamChange(stream.id, { startMonth: Math.max(0, parseInt(e.target.value || '0', 10) || 0) })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    title="Start month"
                  >
                    {monthOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleDeleteStream(stream.id)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-500">No revenue streams yet. Add your first projection above.</p>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Net Monthly Burn</p>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(netBurn)}
            </p>
            <p className="text-xs text-gray-500">
              {isProfitable
                ? 'Profitable! Revenue exceeds expenses'
                : `${formatCurrency(totalMonthlyRevenue)} revenue vs ${formatCurrency(calculatedMonthlyExpenses)} expenses`}
            </p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Current Runway</p>
            <p className="text-xl font-bold text-gray-900">
              {isProfitable ? '∞' : formatRunway(projectedRunwayMonths)}
            </p>
            <p className="text-xs text-gray-500">
              {isProfitable ? 'No cash out date' : `Until ${cashOutDate}`}
            </p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Burn Multiple</p>
            <p className="text-xl font-bold text-gray-900">
              {burnMultiple && !isProfitable ? `${burnMultiple.toFixed(2)}x` : 'N/A'}
            </p>
            <p className="text-xs text-gray-500">
              Expenses / Revenue
            </p>
          </div>
          <div className={`${projectedRunwayMonths > 12 || isProfitable ? 'bg-green-50' : projectedRunwayMonths > 6 ? 'bg-yellow-50' : 'bg-red-50'} p-4 rounded-lg`}>
            <p className="text-sm text-gray-600">Status</p>
            <p className="text-xl font-bold text-gray-900 flex items-center gap-1">
              {isProfitable ? (
                <>Healthy <Clock className="w-5 h-5 text-green-600" /></>
              ) : projectedRunwayMonths > 12 ? (
                <>Healthy <Clock className="w-5 h-5 text-green-600" /></>
              ) : projectedRunwayMonths > 6 ? (
                <>Warning <AlertTriangle className="w-5 h-5 text-yellow-600" /></>
              ) : (
                <>Critical <AlertTriangle className="w-5 h-5 text-red-600" /></>
              )}
            </p>
            <p className="text-xs text-gray-500">
              {isProfitable ? 'Generating profit' : projectedRunwayMonths > 12 ? '12+ months runway' : projectedRunwayMonths > 6 ? '6-12 months runway' : 'Less than 6 months'}
            </p>
          </div>
        </div>

        {/* Projection Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-medium text-gray-600">Month</th>
                <th className="text-right py-2 px-3 font-medium text-gray-600">Starting Cash</th>
                <th className="text-right py-2 px-3 font-medium text-gray-600">Revenue</th>
                <th className="text-right py-2 px-3 font-medium text-gray-600">Expenses</th>
                <th className="text-right py-2 px-3 font-medium text-gray-600">Net Burn</th>
                <th className="text-right py-2 px-3 font-medium text-gray-600">Ending Cash</th>
                <th className="text-right py-2 px-3 font-medium text-gray-600">Runway</th>
              </tr>
            </thead>
            <tbody>
              {projections.map((data) => (
                <tr 
                  key={data.month} 
                  className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 ${
                    data.status === 'critical' ? 'bg-red-50' : 
                    data.status === 'warning' ? 'bg-yellow-50' : ''
                  }`}
                >
                  <td className="py-2 px-3 text-gray-900">{data.month === 0 ? 'Now' : data.date}</td>
                  <td className="text-right py-2 px-3 text-gray-700">{formatCurrency(data.startingCash)}</td>
                  <td className="text-right py-2 px-3 text-green-600">{formatCurrency(data.monthlyRevenue)}</td>
                  <td className="text-right py-2 px-3 text-red-500">{formatCurrency(calculatedMonthlyExpenses)}</td>
                  <td className="text-right py-2 px-3 font-medium text-gray-900">
                    {data.month === 0 ? '-' : formatCurrency(data.monthlyBurn)}
                  </td>
                  <td className={`text-right py-2 px-3 font-medium ${data.endingCash < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    {formatCurrency(data.endingCash)}
                  </td>
                  <td className="text-right py-2 px-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      data.status === 'healthy' ? 'bg-green-100 text-green-800' :
                      data.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {formatRunway(data.runwayMonths)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
