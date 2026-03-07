import type { Expense, CalculationResult, PlanSettings } from '../types';
import { Cell, ResponsiveContainer, Tooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid, Bar, PieChart, Pie, ComposedChart, ReferenceLine } from 'recharts';
import { formatCurrency } from '../utils/calculator';
import { getCurrencySymbol } from '../hooks/useExchangeRates';
import { PieChart as PieChartIcon, TrendingUp, CreditCard } from 'lucide-react';
import { useMemo, useState } from 'react';

interface ChartsProps {
  expenses: Expense[];
  results: CalculationResult;
  settings: PlanSettings;
  onFocusAvailableFunds: () => void;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

export function Charts({ expenses, results, settings, onFocusAvailableFunds }: ChartsProps) {
  const [activeChart, setActiveChart] = useState<'breakdown' | 'timeline' | 'cashflow'>('breakdown');
  const primarySymbol = getCurrencySymbol(settings.primaryCurrency);
  const hasFunds = results.availableFunds > 0;

  const expenseData = useMemo(() => expenses.map((e) => ({
    name: e.name,
    value: e.type === 'recurring' && e.frequency === 'yearly' ? e.amount / 12 : e.amount,
    type: e.type,
    fullAmount: e.amount,
  })), [expenses]);

  const expenseDonutData = useMemo(() => {
    const sorted = [...expenseData].sort((a, b) => b.value - a.value);
    const top = sorted.slice(0, 8);
    const rest = sorted.slice(8);
    const otherTotal = rest.reduce((sum, item) => sum + item.value, 0);
    if (otherTotal > 0) {
      top.push({ name: 'Other', value: otherTotal, type: 'other' as any, fullAmount: otherTotal });
    }
    return top;
  }, [expenseData]);

  const expenseTotal = useMemo(() => expenseData.reduce((sum, item) => sum + item.value, 0), [expenseData]);

  const monthlyBurnAt = useMemo(() => {
    return (month: number) => {
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
  }, [expenses]);

  const oneTimeAt = useMemo(() => {
    return (month: number) => {
      return expenses.reduce((total, expense) => {
        const startMonth = expense.startMonth ?? 0;
        if (expense.type === 'one-time' && startMonth === month) {
          return total + expense.amount;
        }
        return total;
      }, 0);
    };
  }, [expenses]);

  const monthlyRevenueAt = useMemo(() => {
    const streams = settings.burnRateSettings?.revenueStreams || [];
    return (month: number) => {
      return streams.reduce((sum, stream) => {
        const startMonth = stream.startMonth ?? 0;
        if (month < startMonth) return sum;
        const baseMonthly = stream.frequency === 'yearly'
          ? stream.amount / 12
          : stream.amount;
        const growthRate = typeof stream.growthRate === 'number' ? stream.growthRate : 0;
        const monthsElapsed = month - startMonth;
        const grown = baseMonthly * Math.pow(1 + growthRate / 100, monthsElapsed);
        return sum + Math.max(grown, 0);
      }, 0);
    };
  }, [settings.burnRateSettings?.revenueStreams]);

  const timelineData = useMemo(() => {
    const months = Math.min(24, Math.max(6, Math.ceil(results.runwayMonths) + 3));
    let balance = results.availableFunds;
    const data: { month: string; balance: number; expenses: number; revenue: number }[] = [];
    for (let month = 0; month < months; month++) {
      const burn = monthlyBurnAt(month) + oneTimeAt(month);
      const revenue = monthlyRevenueAt(month);
      balance = balance - burn + revenue;
      data.push({
        month: `M${month + 1}`,
        balance: Math.max(0, balance),
        expenses: burn,
        revenue,
      });
      if (balance <= 0) break;
    }
    return data;
  }, [monthlyBurnAt, oneTimeAt, monthlyRevenueAt, results.availableFunds, results.runwayMonths]);

  const cashflowData = useMemo(() => {
    return timelineData.map((d) => ({
      month: d.month,
      revenue: d.revenue,
      expenses: d.expenses,
      net: d.revenue - d.expenses,
    }));
  }, [timelineData]);

  const thresholdMarkers = useMemo(() => {
    const thresholds = [12, 6, 3];
    const found: Record<number, string | null> = { 12: null, 6: null, 3: null };
    let runningBalance = results.availableFunds;
    for (let i = 0; i < timelineData.length; i++) {
      const burn = monthlyBurnAt(i) + oneTimeAt(i);
      const revenue = monthlyRevenueAt(i);
      runningBalance = runningBalance - burn + revenue;
      const runway = burn > 0 ? runningBalance / burn : Infinity;
      thresholds.forEach((t) => {
        if (!found[t] && runway <= t) {
          found[t] = timelineData[i].month;
        }
      });
    }
    return found;
  }, [timelineData, monthlyBurnAt, oneTimeAt, monthlyRevenueAt, results.availableFunds]);

  
  const summaryData = [
    { name: 'One-time', value: results.oneTimeTotal, color: '#F59E0B' },
    { name: 'Monthly Recurring', value: results.monthlyRecurring, color: '#3B82F6' },
    { name: 'Yearly/12', value: results.yearlyRecurring / 12, color: '#10B981' },
  ].filter(d => d.value > 0);

  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <PieChartIcon className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Visualizations</h2>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={activeChart}
            onChange={(e) => setActiveChart(e.target.value as typeof activeChart)}
            className="sm:hidden px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white shadow-sm"
          >
            <option value="breakdown">Breakdown</option>
            <option value="timeline">Timeline</option>
            <option value="cashflow">Cashflow</option>
          </select>
          <div className="hidden sm:flex gap-2">
            <button
              onClick={() => setActiveChart('breakdown')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeChart === 'breakdown'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Breakdown
            </button>
            <button
              onClick={() => setActiveChart('timeline')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeChart === 'timeline'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setActiveChart('cashflow')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeChart === 'cashflow'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Cashflow
            </button>
          </div>
        </div>
      </div>

      {activeChart === 'breakdown' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Expense Breakdown (donut, monthlyized)
            </h3>
            {expenseDonutData.length > 0 ? (
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="relative h-72 w-full lg:w-1/2">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={expenseDonutData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={70}
                        outerRadius={110}
                        paddingAngle={2}
                      >
                        {expenseDonutData.map((_, index) => (
                          <Cell key={index} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number, name: string) => [formatCurrency(value, primarySymbol), name]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="text-lg font-semibold text-gray-900">{formatCurrency(expenseTotal, primarySymbol)}</p>
                  </div>
                </div>
                <div className="flex-1 space-y-2 max-h-72 overflow-auto pr-2">
                  {expenseDonutData.map((item, index) => {
                    const pct = expenseTotal > 0 ? (item.value / expenseTotal) * 100 : 0;
                    return (
                      <div key={item.name + index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <span className="truncate" title={item.name}>{item.name}</span>
                        </div>
                        <div className="text-right text-gray-700">
                          <div className="font-medium">{formatCurrency(item.value, primarySymbol)}</div>
                          <div className="text-xs text-gray-500">{pct.toFixed(1)}%</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No expenses yet. Add expenses to see the breakdown.</p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-2">Monthly Burn Components</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {summaryData.map((item) => (
                <div key={item.name} className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                  <p className="text-xs uppercase tracking-wide text-gray-500">{item.name}</p>
                  <p className="text-lg font-semibold text-gray-900">{formatCurrency(item.value, primarySymbol)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeChart === 'cashflow' && (
        <div>
          <h3 className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Monthly Cashflow (Revenue vs Expenses)
          </h3>
          {hasFunds ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={cashflowData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatCurrency(v, primarySymbol)} />
                  <Tooltip
                    formatter={(value: number, _name: string, props) => {
                      const dataKey = (props && 'dataKey' in props) ? (props as any).dataKey as string : _name;
                      const label = dataKey === 'revenue' ? 'Revenue' : dataKey === 'expenses' ? 'Expenses' : 'Net';
                      return [formatCurrency(value, primarySymbol), label];
                    }}
                  />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue" stackId="cash" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" stackId="cash" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="net" name="Net" stroke="#3B82F6" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="p-4 border border-dashed border-blue-200 rounded-lg bg-blue-50 text-sm text-blue-900 flex flex-col gap-3">
              <div className="font-semibold">Add Available Funds to see cashflow.</div>
              <button
                type="button"
                onClick={onFocusAvailableFunds}
                className="inline-flex items-center justify-center px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold shadow hover:bg-blue-700"
              >
                Add now
              </button>
            </div>
          )}
        </div>
      )}

      {activeChart === 'timeline' && (
        <div>
          <h3 className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Projected Balance (24 months)
          </h3>
          {hasFunds ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  key={`timeline-${results.availableFunds}-${timelineData.length}-${timelineData[timelineData.length - 1]?.balance ?? 0}`}
                  data={timelineData}
                  margin={{ left: -10, right: 12 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${primarySymbol}${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: number, _name: string, props) => {
                      const dataKey = (props && 'dataKey' in props) ? (props as any).dataKey as string : _name;
                      const label = dataKey === 'balance' ? 'Balance' : dataKey === 'expenses' ? 'Expenses' : 'Revenue';
                      return [formatCurrency(value, primarySymbol), label];
                    }}
                  />
                  <Legend />
                  {thresholdMarkers[12] && <ReferenceLine x={thresholdMarkers[12]} stroke="#6B7280" strokeDasharray="4 4" label={{ value: '12 mo', position: 'top', fill: '#6B7280', fontSize: 10 }} />}
                  {thresholdMarkers[6] && <ReferenceLine x={thresholdMarkers[6]} stroke="#F59E0B" strokeDasharray="4 4" label={{ value: '6 mo', position: 'top', fill: '#F59E0B', fontSize: 10 }} />}
                  {thresholdMarkers[3] && <ReferenceLine x={thresholdMarkers[3]} stroke="#EF4444" strokeDasharray="4 4" label={{ value: '3 mo', position: 'top', fill: '#EF4444', fontSize: 10 }} />}
                  <Line type="monotone" dataKey="balance" stroke="#3B82F6" strokeWidth={3} dot={false} name="Balance" isAnimationActive animationDuration={700} />
                  <Line type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={2} dot={{ r: 2 }} name="Expenses" isAnimationActive animationDuration={700} />
                  <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} dot={{ r: 2 }} name="Revenue" isAnimationActive animationDuration={700} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="p-4 border border-dashed border-blue-200 rounded-lg bg-blue-50 text-sm text-blue-900 flex flex-col gap-3">
              <div className="font-semibold">Add Available Funds to project your balance timeline.</div>
              <button
                type="button"
                onClick={onFocusAvailableFunds}
                className="inline-flex items-center justify-center px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold shadow hover:bg-blue-700"
              >
                Add now
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
